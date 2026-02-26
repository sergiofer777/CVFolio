import type { CVData } from "@/types/cv-data";

const MAX_PHRASE_LENGTH = 46;
const MAX_PHRASES = 5;
const MAX_TECH_PHRASES = 3;

const LOW_SIGNAL_SKILL_PATTERNS: RegExp[] = [
  /\bmicrosoft\s+word\b/i,
  /\bmicrosoft\s+office\b/i,
  /\boffice\s*365\b/i,
  /\bpower\s*point\b/i,
  /\boutlook\b/i,
  /\bgoogle\s+docs?\b/i,
  /\bgoogle\s+sheets?\b/i,
  /\binternet\b/i,
  /\bwindows\b/i,
  /\bpdf\b/i,
];

const HIGH_IMPACT_KEYWORDS = [
  "sap",
  "salesforce",
  "oracle",
  "dynamics",
  "servicenow",
  "workday",
  "aws",
  "azure",
  "gcp",
  "snowflake",
  "databricks",
  "power bi",
  "tableau",
  "sql",
  "python",
  "java",
  "c#",
  "c++",
  "typescript",
  "javascript",
  "react",
  "next.js",
  "node",
  "kubernetes",
  "docker",
  "terraform",
  "openai",
  "gemini",
  "langchain",
  "llm",
  "blockchain",
  "solana",
  "web3",
];

const NOISE_PHRASE_PATTERNS: RegExp[] = [
  /\bcurriculum\b/i,
  /\bcurriculum vitae\b/i,
  /\bresume\b/i,
  /\bhoja de vida\b/i,
];

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimPunctuation(value: string): string {
  return value.replace(/[\s.,;:!?-]+$/g, "").trim();
}

function cleanPhrase(value: string | undefined): string {
  if (!value) return "";
  return trimPunctuation(normalizeSpace(value));
}

function truncatePhrase(value: string, maxLength = MAX_PHRASE_LENGTH): string {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength - 1).trim();
  const safeCut = clipped.lastIndexOf(" ");
  const base = safeCut > 18 ? clipped.slice(0, safeCut) : clipped;
  return `${base.trim()}...`;
}

function uniquePush(target: string[], value: string): void {
  const normalized = value.toLocaleLowerCase();
  if (!normalized) return;
  if (target.some((item) => item.toLocaleLowerCase() === normalized)) return;
  target.push(value);
}

function summaryFirstLine(summary: string | undefined): string {
  const source = cleanPhrase(summary);
  if (!source) return "";
  const firstLine = source.split(/[\n\r.!?]/)[0] ?? source;
  return cleanPhrase(firstLine);
}

function isLowSignalSkill(value: string): boolean {
  return LOW_SIGNAL_SKILL_PATTERNS.some((pattern) => pattern.test(value));
}

function looksLikeNoisePhrase(value: string): boolean {
  return NOISE_PHRASE_PATTERNS.some((pattern) => pattern.test(value));
}

function isHighImpactSkill(value: string): boolean {
  const lower = value.toLocaleLowerCase();
  if (!lower || isLowSignalSkill(lower)) return false;
  if (HIGH_IMPACT_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
  if (/\b[A-Z]{2,6}\b/.test(value)) return true;
  if (/[#+]/.test(value)) return true;
  return false;
}

function detectSpanish(cvData: CVData): boolean {
  const sample = [
    cvData.personal?.title,
    cvData.personal?.summary,
    cvData.experience?.[0]?.role,
    cvData.experience?.[0]?.description?.[0],
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  if (!sample) return true;

  const spanishHits = (sample.match(/\b(el|la|de|en|con|para|experiencia|gestion|desarrollo|equipo)\b/g) ?? []).length;
  const englishHits = (sample.match(/\b(the|and|with|for|experience|management|development|team)\b/g) ?? []).length;

  return spanishHits >= englishHits;
}

function collectTopTechnologies(cvData: CVData): string[] {
  const candidates: string[] = [];

  for (const experience of cvData.experience.slice(0, 2)) {
    for (const tech of experience.technologies ?? []) {
      const clean = cleanPhrase(tech);
      if (clean) candidates.push(clean);
    }
  }

  for (const tech of cvData.skills?.technical ?? []) {
    const clean = cleanPhrase(tech);
    if (clean) candidates.push(clean);
  }

  for (const project of cvData.projects?.slice(0, 2) ?? []) {
    for (const tech of project.technologies ?? []) {
      const clean = cleanPhrase(tech);
      if (clean) candidates.push(clean);
    }
  }

  const deduped: string[] = [];
  for (const skill of candidates) uniquePush(deduped, skill);

  const strong = deduped.filter((skill) => isHighImpactSkill(skill));
  const fallback = deduped.filter((skill) => !isLowSignalSkill(skill));

  return (strong.length > 0 ? strong : fallback).slice(0, 6);
}

export function buildTemplateIvanTypingPhrases(cvData?: CVData): string[] {
  if (!cvData) return [];
  const phrases: string[] = [];
  const isSpanish = detectSpanish(cvData);
  const title = cleanPhrase(cvData.personal?.title);
  const role = cleanPhrase(cvData.experience?.[0]?.role);
  const company = cleanPhrase(cvData.experience?.[0]?.company);
  const summary = summaryFirstLine(cvData.personal?.summary);
  const project = cleanPhrase(cvData.projects?.[0]?.name);
  const technologies = collectTopTechnologies(cvData);

  if (title && !looksLikeNoisePhrase(title)) uniquePush(phrases, title);

  if (role && company) {
    uniquePush(phrases, `${role} @ ${company}`);
  } else if (role && !looksLikeNoisePhrase(role)) {
    uniquePush(phrases, role);
  }

  if (technologies.length > 0) {
    uniquePush(
      phrases,
      `${isSpanish ? "Experiencia en" : "Experience in"} ${technologies[0]}`
    );
  }

  for (let i = 0; i < MAX_TECH_PHRASES; i += 1) {
    const a = technologies[i];
    const b = technologies[i + 1];
    if (!a) break;
    if (!b) {
      uniquePush(phrases, a);
      break;
    }
    uniquePush(phrases, `${a} + ${b}`);
  }

  if (project && !looksLikeNoisePhrase(project)) uniquePush(phrases, project);

  if (phrases.length < 3 && summary && !looksLikeNoisePhrase(summary)) {
    uniquePush(phrases, summary);
  }

  if (phrases.length === 0) return [];

  return phrases
    .map((phrase) => truncatePhrase(phrase))
    .filter(Boolean)
    .slice(0, MAX_PHRASES);
}

function looksLikeTemplateIvan(html: string): boolean {
  return (
    /ivansevilla\.es/i.test(html) ||
    /nav-logo-dot|hero-avatar|langToggle|scrollProgress|hero-title-text/i.test(html)
  );
}

export function injectTemplateIvanTypingOverride(
  html: string,
  phrases: string[]
): string {
  if (!looksLikeTemplateIvan(html)) return html;

  const finalPhrases = phrases
    .map((phrase) => truncatePhrase(cleanPhrase(phrase)))
    .filter(Boolean)
    .slice(0, MAX_PHRASES);

  if (finalPhrases.length === 0) return html;

  const htmlWithoutPreviousOverride = html.replace(
    /<script[^>]*data-webiculum-typing-override[^>]*>[\s\S]*?<\/script>/gi,
    ""
  );

  const phrasesJson = JSON.stringify(finalPhrases);
  const overrideScript = `<script data-webiculum-typing-override>(function(){
  var titles = ${phrasesJson};
  if (!Array.isArray(titles) || titles.length === 0) return;
  function injectReadabilityStyle() {
    if (document.querySelector("style[data-webiculum-tilt-readability]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-webiculum-tilt-readability", "true");
    style.textContent = [
      ".tilt-card.webiculum-tilt-active .timeline-role,",
      ".tilt-card.webiculum-tilt-active .timeline-description,",
      ".tilt-card.webiculum-tilt-active .timeline-bullets,",
      ".tilt-card.webiculum-tilt-active .education-title,",
      ".tilt-card.webiculum-tilt-active .education-description,",
      ".tilt-card.webiculum-tilt-active .project-title,",
      ".tilt-card.webiculum-tilt-active .project-description {",
      "  color: rgba(244, 248, 255, 0.97) !important;",
      "  text-shadow: 0 1px 8px rgba(0,0,0,0.45);",
      "}",
      ".tilt-card.webiculum-tilt-active .timeline-company,",
      ".tilt-card.webiculum-tilt-active .education-institution {",
      "  color: rgba(128, 255, 206, 0.95) !important;",
      "  text-shadow: 0 1px 8px rgba(0,0,0,0.45);",
      "}",
      ".tilt-card.webiculum-tilt-active .timeline-date {",
      "  color: rgba(86, 246, 177, 0.98) !important;",
      "  text-shadow: 0 1px 8px rgba(0,0,0,0.45);",
      "}",
      ".tilt-card.webiculum-tilt-active .tag {",
      "  color: rgba(249,252,255,0.98) !important;",
      "  background: rgba(8, 13, 20, 0.78) !important;",
      "  border-color: rgba(220, 236, 255, 0.26) !important;",
      "}",
      ".tilt-card.webiculum-tilt-active .timeline-bullets li::before {",
      "  background: rgba(142, 255, 214, 0.95) !important;",
      "  opacity: 1 !important;",
      "}",
    ].join("\\n");
    document.head.appendChild(style);
  }
  function bindReadableTilt() {
    if (window.innerWidth <= 768) return;
    var cards = document.querySelectorAll(".tilt-card");
    cards.forEach(function(card) {
      if (card.dataset.webiculumTiltBound === "true") return;
      card.dataset.webiculumTiltBound = "true";
      card.addEventListener("mousemove", function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = ((y - centerY) / centerY) * -4;
        var rotateY = ((x - centerX) / centerX) * 4;
        var glowX = (x / rect.width) * 100;
        var glowY = (y / rect.height) * 100;
        card.style.transform = "perspective(1000px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) scale3d(1.01, 1.01, 1.01)";
        card.style.transition = "transform 0.1s ease";
        card.style.background = "radial-gradient(circle at " + glowX + "% " + glowY + "%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.14) 22%, rgba(255,255,255,0.08) 45%, rgba(232,120,48,0.08) 68%, rgba(255,255,255,0.03) 100%)";
        card.classList.add("webiculum-tilt-active");
      });
      card.addEventListener("mouseleave", function() {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        card.style.transition = "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)";
        card.style.background = "";
        card.classList.remove("webiculum-tilt-active");
      });
    });
  }
  function applyTypingTitles() {
    var titleNode = document.querySelector(".hero-title-text");
    if (titleNode && !String(titleNode.textContent || "").trim()) {
      titleNode.textContent = titles[0];
    }
    if (!window._typingInstance) return false;
    window._typingInstance.titles = titles.slice();
    window._typingInstance.titleIndex = 0;
    window._typingInstance.charIndex = 0;
    window._typingInstance.isDeleting = false;
    return true;
  }
  var attempts = 0;
  var timer = setInterval(function() {
    attempts += 1;
    if (applyTypingTitles() || attempts > 60) {
      clearInterval(timer);
    }
  }, 120);
  injectReadabilityStyle();
  setTimeout(bindReadableTilt, 80);
  document.addEventListener("DOMContentLoaded", function() {
    applyTypingTitles();
    bindReadableTilt();
    var langToggle = document.getElementById("langToggle");
    if (!langToggle || langToggle.dataset.webiculumTypingBound === "true") return;
    langToggle.dataset.webiculumTypingBound = "true";
    langToggle.addEventListener("click", function() {
      setTimeout(applyTypingTitles, 0);
    });
  });
})();</script>`;

  if (/<\/body>/i.test(htmlWithoutPreviousOverride)) {
    return htmlWithoutPreviousOverride.replace(
      /<\/body>/i,
      `${overrideScript}</body>`
    );
  }

  return `${htmlWithoutPreviousOverride}\n${overrideScript}`;
}
