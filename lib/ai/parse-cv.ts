import {
  CV_SYSTEM_PROMPT,
  CV_USER_PROMPT,
  LANDING_SYSTEM_PROMPT,
  LANDING_USER_PROMPT,
} from "./prompts";
import type { CVData, GeneratedLanding } from "@/types/cv-data";

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
  if (genericFence?.[1]?.toLowerCase().includes("<!doctype html")) {
    return genericFence[1].trim();
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

export async function generateLandingWithAI(cvText: string): Promise<GeneratedLanding> {
  const markdown = await callGemini({
    systemPrompt: LANDING_SYSTEM_PROMPT,
    contents: [
      {
        role: "user",
        parts: [{ text: LANDING_USER_PROMPT(cvText) }],
      },
    ],
    temperature: 0.7,
    maxOutputTokens: 16384,
  });

  const html = extractPhase6Html(markdown);

  return {
    markdown,
    html: html ? ensureHtmlDocument(html) : undefined,
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };
}
