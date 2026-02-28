"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CustomCursor } from "@/components/custom-cursor";
import { PORTFOLIO_THEME_OPTIONS } from "@/lib/templates/portfolio-themes";

/* ── SVG Icons inline ── */
function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function PieIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M2 12h10V2" />
    </svg>
  );
}
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="m12 3 1.9 4.5L18 9.3l-4.1 1.8L12 16l-1.9-4.9L6 9.3l4.1-1.8z" />
      <path d="m5 2 .8 1.9L7.7 4.7l-1.9.8L5 7.4l-.8-1.9L2.3 4.7l1.9-.8z" />
    </svg>
  );
}
function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}
/* ── Counter hook ── */
function useCounter(target: number, suffix: string = "", duration: number = 1800) {
  const [value, setValue] = useState("0" + suffix);
  const ref = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          const start = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setValue(Math.floor(ease * target) + suffix);
            if (p < 1) requestAnimationFrame(tick);
          };
          tick();
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix, duration]);

  return { ref, value };
}

const TEMPLATE_PREVIEW_COPY: Record<
  (typeof PORTFOLIO_THEME_OPTIONS)[number]["id"],
  string[]
> = {
  minimal: ["Hero con foto", "Secciones modulares", "Modo dark/light"],
  modern: ["Aesthetic Web3", "Animaciones avanzadas", "Storytelling premium"],
  bold: ["Concepto creativo", "Motion elegante", "Nivel Awwwards"],
};

const TEMPLATE_DEMO_PATHS: Record<
  (typeof PORTFOLIO_THEME_OPTIONS)[number]["id"],
  string
> = {
  minimal: "https://sergio-fernandez.com",
  modern: "https://ivansevilla.es",
  bold: "/template-demos/maria.html",
};

const TEMPLATE_PREVIEW_IMAGES: Record<
  (typeof PORTFOLIO_THEME_OPTIONS)[number]["id"],
  string
> = {
  minimal: "/template-previews/sergio-top.png",
  modern: "/template-previews/ivan-top.png",
  bold: "/template-previews/maria-top.png",
};

const TEMPLATE_PREVIEW_OBJECT_POSITIONS: Record<
  (typeof PORTFOLIO_THEME_OPTIONS)[number]["id"],
  string
> = {
  minimal: "50% 28%",
  modern: "50% 18%",
  bold: "50% 20%",
};

/* ── Pricing ── */
const FREE_FEATURES = [
  "Vista previa no interactiva",
  "Caduca en 24 horas",
  "Sin publicación pública",
  "Sin subdominio",
  "1 generación de prueba",
];
const PRO_FEATURES = [
  "Subdominio usuario.webiculum.com",
  "Publicación durante 1 año",
  "Editable desde dashboard",
  "Sin límites de visualización",
  "Pago único por web",
];
const STUDIO_FEATURES = [
  "Hasta 3 webs al mes",
  "Hasta 3 iteraciones por web con chat",
  "Prioridad de generación",
  "Configuración de subdominio desde dashboard",
  "Soporte premium",
];

/* ═════════ MAIN PAGE ═════════ */
export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const counter1 = useCounter(4820, "");
  const counter2 = useCounter(12, "s", 800);
  const counter3 = useCounter(98, "%");

  return (
    <div className="cursor-custom">
      <CustomCursor />

      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 transition-all duration-500 ${
          navScrolled
            ? "bg-[rgba(245,242,235,0.85)] backdrop-blur-xl border-b border-[var(--sand)]"
            : "bg-transparent"
        }`}
      >
        <Link
          href="/"
          className="font-display text-2xl font-semibold text-[var(--ink)] tracking-tight no-underline"
        >
          web<span className="text-[var(--rust)]">iculum</span>
        </Link>
        <div className="flex items-center gap-6 md:gap-9">
          <a
            href="#how"
            className="hidden md:inline text-sm text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors tracking-wide no-underline"
          >
            Cómo funciona
          </a>
          <a
            href="#ejemplos"
            className="hidden md:inline text-sm text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors tracking-wide no-underline"
          >
            Ejemplos
          </a>
          <a
            href="#precios"
            className="hidden md:inline text-sm text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors tracking-wide no-underline"
          >
            Precios
          </a>
          <Link
            href="/signup"
            className="bg-[var(--ink)] text-[var(--paper)] px-5 py-2.5 rounded text-sm font-medium hover:bg-[var(--rust)] hover:text-white transition-colors no-underline"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-28 pb-20 relative overflow-hidden text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(192,68,10,0.07)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_10%_80%,rgba(192,68,10,0.04)_0%,transparent_60%)]" />
        </div>

        <div className="relative z-10 max-w-[700px]">
          <div className="flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-7 animate-fade-up">
            <span className="w-8 h-[1.5px] bg-[var(--rust)]" />
            Tu CV, reinventado
            <span className="w-8 h-[1.5px] bg-[var(--rust)]" />
          </div>

          <h1 className="font-display text-[clamp(3rem,5.5vw,5.5rem)] font-light leading-[1.05] tracking-tight text-[var(--ink)] mb-7 animate-fade-up delay-1">
            De currículum
            <span className="block">
              a <em className="italic text-[var(--rust)]">portafolio</em>
            </span>
            <span className="block">en segundos.</span>
          </h1>

          <p className="text-[1.05rem] leading-[1.7] text-[var(--muted-color)] max-w-[480px] mx-auto mb-11 font-light animate-fade-up delay-2">
            Arrastra tu PDF. La IA extrae, estructura y diseña tu página personal
            profesional — lista para compartir en segundos.
          </p>

          <div className="flex items-center justify-center gap-5 flex-wrap animate-fade-up delay-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2.5 bg-[var(--ink)] text-[var(--paper)] px-8 py-4 rounded text-[0.95rem] font-medium hover:bg-[var(--rust)] hover:-translate-y-0.5 transition-all no-underline tracking-wide"
            >
              <UploadCloudIcon className="w-[18px] h-[18px]" />
              Subir mi CV
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[var(--muted-color)] text-[0.9rem] hover:text-[var(--ink)] transition-colors no-underline py-4 px-2"
            >
              <PlayIcon className="w-4 h-4" />
              Iniciar sesión
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-10 mt-16 pt-10 border-t border-[var(--sand)] animate-fade-up delay-4">
            <div>
              <div
                ref={counter1.ref}
                className="font-display text-[2rem] font-semibold text-[var(--ink)] tracking-tight leading-none"
              >
                {counter1.value}
              </div>
              <div className="text-[0.78rem] text-[var(--muted-color)] uppercase tracking-[0.08em] mt-1">
                CVs procesados
              </div>
            </div>
            <div>
              <div
                ref={counter2.ref}
                className="font-display text-[2rem] font-semibold text-[var(--ink)] tracking-tight leading-none"
              >
                {counter2.value}
              </div>
              <div className="text-[0.78rem] text-[var(--muted-color)] uppercase tracking-[0.08em] mt-1">
                Tiempo medio
              </div>
            </div>
            <div>
              <div
                ref={counter3.ref}
                className="font-display text-[2rem] font-semibold text-[var(--ink)] tracking-tight leading-none"
              >
                {counter3.value}
              </div>
              <div className="text-[0.78rem] text-[var(--muted-color)] uppercase tracking-[0.08em] mt-1">
                Satisfacción
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 md:py-32 px-6 md:px-12 relative">
        <div className="absolute top-0 left-6 right-6 md:left-12 md:right-12 h-px bg-[var(--sand)]" />

        <div className="mb-14 md:mb-16 max-w-[1360px] mx-auto">
          <div className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-5">
            <span className="w-8 h-[1.5px] bg-[var(--rust)]" />
            Cómo funciona
          </div>
          <h2 className="font-display text-[clamp(2rem,3.5vw,3.2rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1] max-w-[780px]">
            Tres pasos. Una presencia
            <span className="block italic text-[var(--rust)]">que transmite nivel.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1360px] mx-auto">
          {[
            {
              num: "01",
              icon: <UploadCloudIcon className="w-[18px] h-[18px] text-[var(--rust)]" />,
              title: "Sube tu CV",
              desc: "Arrastra tu archivo y Webiculum lo procesa en segundos, incluso si el diseño original es complejo.",
              tag: "PDF · JPG · PNG",
            },
            {
              num: "02",
              icon: <SparkIcon className="w-[18px] h-[18px] text-[var(--rust)]" />,
              title: "La IA extrae todo",
              desc: "La IA estructura experiencia, skills y logros en un formato claro, coherente y listo para producción.",
              tag: "Extracción inteligente",
            },
            {
              num: "03",
              icon: <LayoutIcon className="w-[18px] h-[18px] text-[var(--rust)]" />,
              title: "Publica una web top",
              desc: "Elige plantilla, ajusta por chat y comparte una landing profesional con subdominio o HTML descargable.",
              tag: "Deploy inmediato",
            },
          ].map((s) => (
            <div
              key={s.num}
              className="rounded-[24px] border border-[rgba(13,13,13,0.08)] bg-[rgba(255,255,255,0.72)] backdrop-blur-sm shadow-[0_22px_36px_rgba(13,13,13,0.05)] p-7 md:p-8 relative"
            >
              <div className="absolute top-7 right-7 w-10 h-10 rounded-[12px] border border-[rgba(192,68,10,0.25)] bg-[rgba(192,68,10,0.06)] flex items-center justify-center">
                {s.icon}
              </div>

              <div className="font-display text-[3.5rem] font-semibold text-[rgba(13,13,13,0.14)] tracking-tighter leading-none mb-6">
                {s.num}
              </div>
              <div className="font-display text-[1.7rem] md:text-[1.8rem] font-normal text-[var(--ink)] mb-3 tracking-tight leading-tight">
                {s.title}
              </div>
              <p className="text-sm md:text-[0.95rem] text-[var(--muted-color)] leading-[1.75] font-light">
                {s.desc}
              </p>
              <span className="inline-block mt-6 text-[0.72rem] uppercase tracking-[0.1em] text-[var(--rust)] font-medium">
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SHOWCASE ─── */}
      <section id="ejemplos" className="py-20 md:py-24 px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 mb-16 max-w-[1360px] mx-auto">
          <div>
            <div className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-4">
              <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
              Plantillas disponibles
            </div>
            <h2 className="font-display text-[clamp(2rem,3.5vw,3.2rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1]">
              Elige la
              <br />
              <em className="italic text-[var(--rust)]">base visual</em>
              <br />
              de tu web.
            </h2>
          </div>
          <p className="text-[0.95rem] text-[var(--muted-color)] leading-[1.7] max-w-[320px] font-light">
            Todas las webs se generan a partir de una plantilla concreta. Puedes
            previsualizar y luego subir tu CV con la que mejor encaje contigo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1360px] mx-auto">
          {PORTFOLIO_THEME_OPTIONS.map((template) => (
            <div
              key={template.id}
              className="rounded-xl overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-300 h-full flex flex-col"
            >
              <div className="h-40 bg-[var(--cream)] border-b border-[var(--sand)] overflow-hidden">
                <Image
                  src={TEMPLATE_PREVIEW_IMAGES[template.id]}
                  alt={`Vista previa de ${template.name}`}
                  width={1440}
                  height={520}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: TEMPLATE_PREVIEW_OBJECT_POSITIONS[template.id] }}
                />
              </div>
              <div className="px-6 pb-6 pt-5 flex flex-col flex-1">
                <div className="font-display text-[1.2rem] font-normal text-[var(--ink)] tracking-tight mb-0.5">
                  {template.name}
                </div>
                <div className="text-[0.78rem] text-[var(--rust)] mb-4 font-medium">
                  {template.tagline}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5 min-h-[72px] content-start">
                  {TEMPLATE_PREVIEW_COPY[template.id].map((feature) => (
                    <span
                      key={feature}
                      className="bg-[var(--cream)] text-[var(--muted-color)] text-[0.7rem] px-2.5 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-4 mt-auto">
                  <a
                    href={TEMPLATE_DEMO_PATHS[template.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-[var(--muted-color)] hover:text-[var(--ink)] no-underline transition-colors"
                  >
                    Ver ejemplo
                    <span aria-hidden>↗</span>
                  </a>
                  <Link
                    href={`/upload?template=${template.id}`}
                    className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-[var(--ink)] hover:text-[var(--rust)] no-underline transition-colors"
                  >
                    Usar plantilla
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="precios" className="py-20 md:py-24 px-6 md:px-12 relative">
        <div className="absolute top-0 left-6 right-6 md:left-12 md:right-12 h-px bg-[var(--sand)]" />

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-4">
            <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
            Precios
            <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
          </div>
          <h2 className="font-display text-[clamp(2rem,3.5vw,3.2rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1] mb-3">
            Simple, <em className="italic text-[var(--rust)]">transparente</em>.
          </h2>
          <p className="text-[0.95rem] text-[var(--muted-color)] font-light">
            Sin sorpresas. Empieza gratis hoy mismo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1100px] mx-auto mt-16">
          {/* Free */}
          <div className="bg-white rounded-2xl p-10 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
            <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] mb-6">
              Plan Gratis
            </div>
            <div className="font-display text-[3rem] font-light tracking-tighter leading-none mb-1.5">
              €0
            </div>
            <div className="text-[0.82rem] text-[var(--muted-color)] font-light mb-8">
              por prueba
            </div>
            <ul className="flex flex-col gap-3.5 mb-9 list-none p-0">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-[var(--muted-color)]"
                >
                  <CheckIcon className="w-4 h-4 text-[var(--rust)] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block w-full py-3.5 text-center rounded bg-[var(--paper)] text-[var(--ink)] border-[1.5px] border-[var(--sand)] font-medium text-[0.9rem] hover:border-[var(--ink)] hover:bg-[var(--cream)] transition-all no-underline"
            >
              Probar ahora
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-[var(--ink)] text-[var(--paper)] rounded-2xl p-10 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all relative overflow-hidden">
            <div className="absolute top-5 -right-7 bg-[var(--rust)] text-white text-[0.65rem] tracking-[0.1em] uppercase font-medium px-10 py-1.5 rotate-45">
              Popular
            </div>
            <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--sand)] mb-6">
              Plan Pro
            </div>
            <div className="font-display text-[3rem] font-light tracking-tighter leading-none mb-1.5 text-[var(--paper)]">
              €9,99
            </div>
            <div className="text-[0.82rem] text-[var(--sand)] font-light mb-8">
              pago único / web
            </div>
            <ul className="flex flex-col gap-3.5 mb-9 list-none p-0">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-[rgba(245,242,235,0.8)]"
                >
                  <CheckIcon className="w-4 h-4 text-[var(--rust-light)] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/checkout?plan=publish"
              className="block w-full py-3.5 text-center rounded bg-[var(--rust)] text-white border-none font-medium text-[0.9rem] hover:bg-[var(--rust-light)] transition-all cursor-pointer no-underline"
            >
              Comprar publicación
            </Link>
          </div>

          {/* Studio */}
          <div className="bg-white rounded-2xl p-10 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
            <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] mb-6">
              Plan Studio
            </div>
            <div className="font-display text-[3rem] font-light tracking-tighter leading-none mb-1.5 text-[var(--ink)]">
              €25
            </div>
            <div className="text-[0.82rem] text-[var(--muted-color)] font-light mb-8">
              / año
            </div>
            <ul className="flex flex-col gap-3.5 mb-9 list-none p-0">
              {STUDIO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-[var(--muted-color)]"
                >
                  <CheckIcon className="w-4 h-4 text-[var(--rust)] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/checkout?plan=studio"
              className="block w-full py-3.5 text-center rounded bg-[var(--ink)] text-[var(--paper)] border-none font-medium text-[0.9rem] hover:bg-[var(--rust)] transition-all no-underline"
            >
              Activar Studio
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-24 px-6 md:px-12 text-center relative">
        <div className="absolute top-0 left-6 right-6 md:left-12 md:right-12 h-px bg-[var(--sand)]" />
        <h2 className="font-display text-[clamp(2.5rem,4.5vw,4.5rem)] font-light tracking-tighter text-[var(--ink)] leading-[1.1] mb-5 max-w-[700px] mx-auto">
          ¿Tu próximo empleo
          <br />
          empieza con un
          <br />
          <em className="italic text-[var(--rust)]">buen portafolio</em>?
        </h2>
        <p className="text-base text-[var(--muted-color)] mb-11 font-light">
          Únete a miles de profesionales que ya comparten su trabajo de forma
          elegante.
        </p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2.5 bg-[var(--ink)] text-[var(--paper)] px-10 py-[18px] rounded text-base font-medium hover:bg-[var(--rust)] hover:-translate-y-0.5 transition-all no-underline"
        >
          <UploadCloudIcon className="w-5 h-5" />
          Crear mi portafolio — Es gratis
        </Link>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[var(--sand)] px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-[1.2rem] font-semibold text-[var(--ink)] tracking-tight no-underline"
        >
          web<span className="text-[var(--rust)]">iculum</span>
        </Link>
        <div className="flex gap-7">
          {["Privacidad", "Términos", "Blog", "Contacto"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-[0.78rem] text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors no-underline"
            >
              {link}
            </a>
          ))}
        </div>
        <div className="text-[0.78rem] text-[var(--muted-color)]">
          © {new Date().getFullYear()} webiculum. Hecho con ♥ y IA.
        </div>
      </footer>
    </div>
  );
}
