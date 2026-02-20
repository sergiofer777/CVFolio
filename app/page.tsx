"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CustomCursor } from "@/components/custom-cursor";

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

/* ── Showcase data ── */
const SHOWCASE = [
  {
    initials: "AG",
    bg: "#c0440a",
    name: "Ana García López",
    title: "Senior Frontend Engineer · Madrid",
    skills: ["React", "TypeScript", "Next.js", "GraphQL"],
    url: "cvfolio.com/ana-garcia",
  },
  {
    initials: "MR",
    bg: "#0d0d0d",
    name: "Marcos Rodríguez",
    title: "Product Designer · Barcelona",
    skills: ["Figma", "UX Research", "Design Systems"],
    url: "cvfolio.com/marcos-rod",
  },
  {
    initials: "LM",
    bg: "#7a3f0a",
    name: "Laura Martínez",
    title: "Data Scientist · Valencia",
    skills: ["Python", "TensorFlow", "SQL", "Spark"],
    url: "cvfolio.com/laura-ds",
  },
  {
    initials: "JP",
    bg: "#4a1a6e",
    name: "Jorge Pérez",
    title: "Backend Engineer · Sevilla",
    skills: ["Node.js", "Rust", "Kubernetes", "AWS"],
    url: "cvfolio.com/jorge-perez",
  },
];

/* ── Pricing ── */
const FREE_FEATURES = [
  "1 portafolio activo",
  "Subdominio cvfolio.com",
  "Descarga del HTML",
  "1 tema incluido",
  "Analítica básica",
];
const PRO_FEATURES = [
  "Portafolios ilimitados",
  "Dominio personalizado",
  "Sin marca de CVfolio",
  "3 temas premium",
  "Analítica avanzada",
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
          CV<span className="text-[var(--rust)]">folio</span>
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

        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 mb-16 md:mb-[72px]">
          <div>
            <div className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-4">
              <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
              El proceso
            </div>
            <h2 className="font-display text-[clamp(2rem,3.5vw,3.2rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1]">
              Tres pasos,
              <br />
              <em className="italic text-[var(--rust)]">un resultado</em>
              <br />
              impresionante.
            </h2>
          </div>
          <p className="text-[0.95rem] text-[var(--muted-color)] leading-[1.7] max-w-[320px] font-light">
            Sin plantillas genéricas. Sin copiar y pegar. La IA hace el trabajo pesado
            para que tú solo compartas el enlace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-[var(--sand)] rounded-xl overflow-hidden">
          {[
            {
              num: "01",
              icon: <UploadCloudIcon className="w-[22px] h-[22px] text-[var(--rust)]" />,
              title: "Arrastra tu CV",
              desc: "Sube tu CV en PDF, JPG o PNG. No importa el formato ni el diseño — nuestro parser lo entiende todo.",
              tag: "PDF · JPG · PNG · max 10MB",
            },
            {
              num: "02",
              icon: <PieIcon className="w-[22px] h-[22px] text-[var(--rust)]" />,
              title: "La IA lo analiza",
              desc: "Gemini 2.5 Pro extrae experiencia, educación, habilidades y contacto. Devuelve un JSON limpio y estructurado en segundos.",
              tag: "Gemini 2.5 Pro",
            },
            {
              num: "03",
              icon: <LayoutIcon className="w-[22px] h-[22px] text-[var(--rust)]" />,
              title: "Portafolio listo",
              desc: "Tu página personal se genera al instante con un diseño profesional, optimizado para móvil y SEO. Comparte el enlace en segundos.",
              tag: "Tu URL · Descarga HTML",
            },
          ].map((s) => (
            <div
              key={s.num}
              className="bg-[var(--paper)] p-10 md:p-12 relative hover:bg-[var(--cream)] transition-colors"
            >
              <div className="font-display text-[4rem] font-semibold text-[var(--sand)] tracking-tighter leading-none mb-7">
                {s.num}
              </div>
              <div className="w-12 h-12 rounded-[10px] bg-white flex items-center justify-center mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                {s.icon}
              </div>
              <div className="font-display text-[1.25rem] font-normal text-[var(--ink)] mb-3 tracking-tight">
                {s.title}
              </div>
              <p className="text-sm text-[var(--muted-color)] leading-[1.7] font-light">
                {s.desc}
              </p>
              <span className="inline-block mt-4 text-[0.68rem] uppercase tracking-[0.08em] text-[var(--rust)] font-medium">
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SHOWCASE ─── */}
      <section id="ejemplos" className="py-20 md:py-24 px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 mb-16">
          <div>
            <div className="flex items-center gap-2 text-[0.72rem] tracking-[0.12em] uppercase text-[var(--rust)] font-medium mb-4">
              <span className="w-6 h-[1.5px] bg-[var(--rust)]" />
              Ejemplos reales
            </div>
            <h2 className="font-display text-[clamp(2rem,3.5vw,3.2rem)] font-light tracking-tight text-[var(--ink)] leading-[1.1]">
              Portafolios
              <br />
              <em className="italic text-[var(--rust)]">generados</em>
              <br />
              por CVfolio.
            </h2>
          </div>
          <p className="text-[0.95rem] text-[var(--muted-color)] leading-[1.7] max-w-[320px] font-light">
            Cada portafolio generado automáticamente a partir de un PDF real. Sin
            edición manual.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHOWCASE.map((card) => (
            <div
              key={card.initials}
              className="rounded-xl overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-300"
            >
              <div className="px-7 pt-6 flex items-start justify-between">
                <div
                  className="w-[52px] h-[52px] rounded-full font-display text-[1.2rem] font-semibold flex items-center justify-center text-[var(--paper)] flex-shrink-0"
                  style={{ background: card.bg }}
                >
                  {card.initials}
                </div>
                <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.08em] text-[var(--muted-color)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  En vivo
                </div>
              </div>
              <div className="px-7 pb-7 pt-5">
                <div className="font-display text-[1.3rem] font-normal text-[var(--ink)] tracking-tight mb-0.5">
                  {card.name}
                </div>
                <div className="text-[0.78rem] text-[var(--muted-color)] mb-4">
                  {card.title}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {card.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-[var(--cream)] text-[var(--muted-color)] text-[0.7rem] px-2.5 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="text-[0.75rem] text-[var(--rust)] font-mono">
                  {card.url}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto mt-16">
          {/* Free */}
          <div className="bg-white rounded-2xl p-10 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
            <div className="text-[0.7rem] uppercase tracking-[0.1em] text-[var(--muted-color)] mb-6">
              Plan Gratis
            </div>
            <div className="font-display text-[3rem] font-light tracking-tighter leading-none mb-1.5">
              €0
            </div>
            <div className="text-[0.82rem] text-[var(--muted-color)] font-light mb-8">
              para siempre
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
              Empezar gratis
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
              €9
            </div>
            <div className="text-[0.82rem] text-[var(--sand)] font-light mb-8">
              / mes · facturación anual
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
            <button className="w-full py-3.5 rounded bg-[var(--rust)] text-white border-none font-medium text-[0.9rem] hover:bg-[var(--rust-light)] transition-all cursor-pointer">
              Conseguir Pro
            </button>
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
          CV<span className="text-[var(--rust)]">folio</span>
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
          © {new Date().getFullYear()} CVfolio. Hecho con ♥ y IA.
        </div>
      </footer>
    </div>
  );
}
