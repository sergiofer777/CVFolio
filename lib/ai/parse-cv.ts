import {
  CV_SYSTEM_PROMPT,
  CV_USER_PROMPT,
  CV_IMAGE_OCR_SYSTEM_PROMPT,
  CV_IMAGE_OCR_USER_PROMPT,
  LANDING_SYSTEM_PROMPT,
  LANDING_SYSTEM_PROMPT_TEMPLATE_3,
  LANDING_USER_PROMPT,
  LANDING_USER_PROMPT_TEMPLATE_3,
} from "./prompts";
import type { CVData, GeneratedLanding } from "@/types/cv-data";
import {
  getLandingTemplateConfig,
  type LandingTemplateConfig,
} from "./landing-template-html";
import {
  buildTemplateIvanTypingPhrases,
  injectTemplateIvanTypingOverride,
} from "@/lib/templates/template-ivan-typing";

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
const MODEL = "gemini-2.5-pro";

// v1beta soporta system_instruction y gemini-2.5-pro
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

function cleanJSON(text: string): CVData {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "");
  return JSON.parse(clean) as CVData;
}

interface GeminiCallOptions {
  systemPrompt: string;
  contents: object[];
  temperature?: number;
  maxOutputTokens?: number;
}

async function callGemini({
  systemPrompt,
  contents,
  temperature = 0.1,
  maxOutputTokens = 8192,
}: GeminiCallOptions): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió texto en la respuesta");
  }

  return text;
}

function extractPhase6Html(markdown: string): string | undefined {
  const htmlFence = markdown.match(/```html\s*([\s\S]*?)```/i);
  if (htmlFence?.[1]) {
    return htmlFence[1].trim();
  }

  const genericFence = markdown.match(/```\s*([\s\S]*?)```/);
  if (
    genericFence?.[1] &&
    /<!doctype html|<html[\s>]/i.test(genericFence[1])
  ) {
    return genericFence[1].trim();
  }

  const clean = markdown
    .trim()
    .replace(/^```(?:json|markdown|md|html)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const extractLastDocument = (input: string): string | undefined => {
    const candidates = input.match(/<!doctype html[\s\S]*?<\/html>/gi);
    if (candidates?.length) return candidates[candidates.length - 1].trim();

    const htmlDocs = input.match(/<html[\s\S]*?<\/html>/gi);
    if (htmlDocs?.length) return htmlDocs[htmlDocs.length - 1].trim();

    return undefined;
  };

  const fromText = extractLastDocument(markdown) ?? extractLastDocument(clean);
  if (fromText) {
    return fromText;
  }

  try {
    const parsed = JSON.parse(clean) as unknown;
    const searchHtml = (value: unknown): string | undefined => {
      if (typeof value === "string") {
        const html = extractLastDocument(value);
        if (html) return html;

        const bodyOnly = value.match(/<body[\s\S]*?<\/body>/i);
        if (bodyOnly) {
          return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Portfolio</title>
</head>
${bodyOnly[0]}
</html>`;
        }

        return undefined;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = searchHtml(item);
          if (found) return found;
        }
        return undefined;
      }

      if (value && typeof value === "object") {
        for (const nested of Object.values(value as Record<string, unknown>)) {
          const found = searchHtml(nested);
          if (found) return found;
        }
      }

      return undefined;
    };

    const fromJson = searchHtml(parsed);
    if (fromJson) {
      return fromJson;
    }
  } catch {
    // Ignore parse errors: not every response is JSON.
  }

  return undefined;
}

function ensureHtmlDocument(html: string): string {
  if (/<html[\s>]/i.test(html) && /<\/html>/i.test(html)) {
    return html;
  }

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Portfolio</title>
</head>
<body>
${html}
</body>
</html>`;
}

function normalizeTemplateIvanAssets(html: string): string {
  return html
    .replace(/href=(["'])styles\.css\1/gi, 'href="https://ivansevilla.es/styles.css"')
    .replace(/src=(["'])script\.js\1/gi, 'src="https://ivansevilla.es/script.js"')
    .replace(
      /(href|src)=(["'])img\//gi,
      '$1=$2https://ivansevilla.es/img/'
    );
}

function extractStructuredCvFromLandingPayload(input: string): CVData | undefined {
  try {
    const parsed = JSON.parse(input) as { structuredCv?: CVData };
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.structuredCv &&
      typeof parsed.structuredCv === "object"
    ) {
      return parsed.structuredCv;
    }
  } catch {
    // Ignore JSON parse errors; not all payloads are guaranteed JSON.
  }
  return undefined;
}

async function recoverLandingHtmlWithAI({
  cvText,
  template,
  previousOutput,
}: {
  cvText: string;
  template: LandingTemplateConfig;
  previousOutput: string;
}): Promise<string | undefined> {
  const response = await callGemini({
    systemPrompt:
      "Eres un desarrollador frontend senior. Convierte la entrada a un unico HTML completo listo para renderizar en navegador.",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `La salida anterior no vino en HTML utilizable. Regenera el resultado.

REGLAS:
1. Responde SOLO con un documento HTML completo.
2. Debe empezar con <!doctype html> y terminar con </html>.
3. Usa Tailwind CDN y JS vanilla inline.
4. Respeta la arquitectura visual de la plantilla elegida.
5. Si una seccion no tiene datos del CV, omite ese bloque.
6. No devuelvas JSON ni Markdown.

PLANTILLA ELEGIDA: ${template.name}
DIRECCION VISUAL: ${template.direction}

PLANTILLA BASE:
\`\`\`html
${template.htmlSkeleton}
\`\`\`

SALIDA PREVIA:
${previousOutput}

CV:
${cvText}`,
          },
        ],
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 16384,
  });

  return extractPhase6Html(response);
}

async function recoverLandingHtmlForTemplate3({
  cvText,
  previousOutput,
}: {
  cvText: string;
  previousOutput: string;
}): Promise<string | undefined> {
  const response = await callGemini({
    systemPrompt:
      "Eres un desarrollador frontend senior. Devuelve solo un HTML completo, limpio y listo para abrir en navegador.",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Tu salida previa no era HTML utilizable. Regenerala.

REGLAS:
1. Devuelve solo un documento HTML completo.
2. Debe empezar con <!doctype html> y terminar con </html>.
3. Sin Markdown ni JSON.
4. Conserva todos los datos reales del CV disponibles.

SALIDA PREVIA:
${previousOutput}

CV:
${cvText}`,
          },
        ],
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 16384,
  });

  return extractPhase6Html(response);
}

export async function parseCVWithAI(cvText: string): Promise<CVData> {
  const text = await callGemini({
    systemPrompt: CV_SYSTEM_PROMPT,
    contents: [
      {
        role: "user",
        parts: [{ text: CV_USER_PROMPT(cvText) }],
      },
    ],
  });
  return cleanJSON(text);
}

export async function parseCVImageWithAI(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<CVData> {
  const text = await callGemini({
    systemPrompt: CV_SYSTEM_PROMPT,
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mediaType,
              data: base64Image,
            },
          },
          {
            text: "Parse this CV image and return the structured JSON as instructed.",
          },
        ],
      },
    ],
  });
  return cleanJSON(text);
}

export async function extractTextFromCVImageWithAI(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<string> {
  const text = await callGemini({
    systemPrompt: CV_IMAGE_OCR_SYSTEM_PROMPT,
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mediaType,
              data: base64Image,
            },
          },
          {
            text: CV_IMAGE_OCR_USER_PROMPT,
          },
        ],
      },
    ],
    temperature: 0,
    maxOutputTokens: 8192,
  });

  return text
    .trim()
    .replace(/^```(?:text|txt|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function generateLandingWithAI(
  cvText: string,
  templateId?: string
): Promise<GeneratedLanding> {
  const template = getLandingTemplateConfig(templateId);
  const isTemplate3 = template.id === "bold";
  const markdown = await callGemini({
    systemPrompt: isTemplate3
      ? LANDING_SYSTEM_PROMPT_TEMPLATE_3
      : LANDING_SYSTEM_PROMPT,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: isTemplate3
              ? LANDING_USER_PROMPT_TEMPLATE_3(cvText)
              : LANDING_USER_PROMPT({
                  cvText,
                  templateName: template.name,
                  templateDirection: template.direction,
                  templateHtml: template.htmlSkeleton,
                }),
          },
        ],
      },
    ],
    temperature: 0.7,
    maxOutputTokens: 16384,
  });

  let html = extractPhase6Html(markdown);

  if (!html) {
    try {
      html = isTemplate3
        ? await recoverLandingHtmlForTemplate3({
            cvText,
            previousOutput: markdown,
          })
        : await recoverLandingHtmlWithAI({
            cvText,
            template,
            previousOutput: markdown,
          });
    } catch (error) {
      console.error("landing recovery error:", error);
    }
  }

  const htmlWithAssets =
    template.id === "modern" ? normalizeTemplateIvanAssets(html ?? template.htmlSkeleton) : html ?? template.htmlSkeleton;

  const htmlWithTypingOverride =
    template.id === "modern"
      ? injectTemplateIvanTypingOverride(
          htmlWithAssets,
          buildTemplateIvanTypingPhrases(
            extractStructuredCvFromLandingPayload(cvText)
          )
        )
      : htmlWithAssets;

  return {
    markdown,
    html: ensureHtmlDocument(htmlWithTypingOverride),
    generatedAt: new Date().toISOString(),
    model: MODEL,
    templateId: template.id,
  };
}
