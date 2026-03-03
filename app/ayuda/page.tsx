import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { ContactForm } from "@/components/help/contact-form";
import { LocaleToggle } from "@/components/locale-toggle";
import { getServerLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const isEn = locale === "en";

  return {
    title: isEn ? "Help center" : "Centro de ayuda",
    description: isEn
      ? "Solve questions about website generation, plans, subdomains and publishing in Webiculum."
      : "Resuelve dudas sobre generación de webs, planes, subdominios y publicación en Webiculum.",
  };
}

const HELP_FAQS = [
  {
    question: "¿Qué formatos de archivo puedo subir a Webiculum?",
    answer:
      "Puedes subir CVs en PDF, JPG o PNG. El sistema detecta el contenido principal y lo transforma en una estructura web editable.",
  },
  {
    question: "¿Cuánto tarda en generarse mi web?",
    answer:
      "Normalmente tarda solo unos segundos. Si el documento tiene muchas páginas, tablas complejas o imágenes pesadas, puede tardar algo más.",
  },
  {
    question: "¿Puedo editar la web después de generarla?",
    answer:
      "Sí, pero no con el plan gratuito. Solo con Studio puedes iterar cambios usando el chat de IA desde el dashboard, y solo con un plan de pago (Pro o Studio) puedes personalizar el subdominio vinculado a tu web dentro de Webiculum.",
  },
  {
    question: "¿Qué diferencia hay entre la vista previa y la publicación?",
    answer:
      "La vista previa te permite revisar cómo queda la web antes de publicarla. La publicación activa el acceso público mediante subdominio y permite compartirla.",
  },
  {
    question: "¿Qué pasa si uso el plan gratuito?",
    answer:
      "El plan gratuito te deja generar una vista previa temporal durante 24 horas. Pasado ese tiempo, necesitas un plan de pago para conservar la web publicada.",
  },
  {
    question: "¿Puedo elegir mi propio subdominio?",
    answer:
      "Sí. En planes con publicación puedes definir tu subdominio dentro de Webiculum, guardarlo desde el dashboard y enlazar la web que quieras mostrar. Por seguridad y estabilidad, solo puedes cambiarlo una vez cada 7 días.",
  },
  {
    question: "¿Qué incluye el plan Pro y cuándo necesito Studio?",
    answer:
      "Pro está pensado para publicar una única web con subdominio durante 1 año. Studio añade más webs y acceso a iteraciones por chat para refinar varias versiones.",
  },
  {
    question: "¿Mi CV y mis datos son privados?",
    answer:
      "Tus documentos y webs se asocian a tu cuenta. Solo se hacen públicas las webs que tú decidas publicar con subdominio o compartir manualmente.",
  },
];

const HELP_FAQS_EN = [
  {
    question: "Which file formats can I upload to Webiculum?",
    answer:
      "You can upload CVs in PDF, JPG or PNG. The system detects the main content and transforms it into an editable web structure.",
  },
  {
    question: "How long does it take to generate my website?",
    answer:
      "It usually takes just a few seconds. If the document has many pages, complex tables or heavy images, it may take a little longer.",
  },
  {
    question: "Can I edit the site after it is generated?",
    answer:
      "Yes, but not on the free plan. Only Studio lets you refine the site through the AI chat from the dashboard, and only a paid plan (Pro or Studio) lets you customize the subdomain linked to your site inside Webiculum.",
  },
  {
    question: "What is the difference between preview and publishing?",
    answer:
      "Preview lets you review how the website looks before making it public. Publishing enables public access through a subdomain so you can share it.",
  },
  {
    question: "What happens if I use the free plan?",
    answer:
      "The free plan lets you generate a temporary preview for 24 hours. After that, you need a paid plan to keep the site published.",
  },
  {
    question: "Can I choose my own subdomain?",
    answer:
      "Yes. On plans with publishing enabled, you can define your subdomain inside Webiculum, save it from the dashboard and link the website you want to show. For security and stability, you can only change it once every 7 days.",
  },
  {
    question: "What does Pro include and when do I need Studio?",
    answer:
      "Pro is designed to publish one site with a subdomain for 1 year. Studio adds more websites and chat-based iterations to refine multiple versions.",
  },
  {
    question: "Are my CV and my data private?",
    answer:
      "Your documents and websites are tied to your account. Only the websites you decide to publish with a subdomain or share manually become public.",
  },
];

export default async function HelpCenterPage() {
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const web3formsKey =
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ??
    process.env.WEB3FORMS_ACCESS_KEY;
  const faqs = isEn ? HELP_FAQS_EN : HELP_FAQS;

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <header className="sticky top-0 z-40 border-b border-[var(--sand)] bg-[rgba(245,242,235,0.9)] backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] no-underline"
          >
            web<span className="text-[var(--rust)]">iculum</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleToggle locale={locale} />
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--sand)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] no-underline transition-colors hover:border-[var(--ink)] hover:bg-[var(--cream)] sm:px-4 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {isEn ? "Back" : "Volver"}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-2xl bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--paper)] no-underline transition-colors hover:bg-[var(--rust)] sm:text-sm"
            >
              {isEn ? "Start free" : "Empezar gratis"}
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--sand)] px-4 py-8 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-3 flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--rust)]">
            <span className="h-[1.5px] w-8 bg-[var(--rust)]" />
            {isEn ? "Help center" : "Centro de ayuda"}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,860px)_300px] lg:items-end lg:justify-between">
            <div className="max-w-[860px]">
              <h1 className="font-display text-[clamp(1.9rem,3.4vw,3.7rem)] font-light leading-[1.02] tracking-tight text-[var(--ink)]">
                {isEn ? "Clear answers" : "Respuestas claras"}
                <span className="block">
                  {isEn ? (
                    <>
                      to publish with <em className="italic text-[var(--rust)]">confidence</em>.
                    </>
                  ) : (
                    <>
                      para publicar con <em className="italic text-[var(--rust)]">seguridad</em>.
                    </>
                  )}
                </span>
              </h1>
            </div>
            <p className="max-w-[300px] text-[0.95rem] leading-[1.55] text-[var(--muted-color)]">
              {isEn
                ? "Here are the most common questions about generation, publishing, subdomains, plans and website editing in Webiculum."
                : "Aquí tienes las dudas más frecuentes sobre generación, publicación, subdominios, planes y edición de webs en Webiculum."}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {faqs.map((item, index) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-[var(--sand)] bg-white shadow-[0_6px_24px_rgba(13,13,13,0.04)]"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left">
                  <span className="font-medium text-[var(--ink)] sm:text-[1rem]">
                    {item.question}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--sand)] bg-[var(--cream)] text-[var(--rust)]">
                    <CircleHelp className="h-4 w-4" />
                  </span>
                </summary>
                <div className="border-t border-[var(--sand)] px-5 py-5 text-sm leading-7 text-[var(--muted-color)]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>

          <aside
            id="contacto-formulario"
            className="space-y-5 scroll-mt-28 lg:sticky lg:top-24"
          >
            <section className="rounded-2xl border border-[var(--sand)] bg-white shadow-[0_6px_24px_rgba(13,13,13,0.04)]">
              <div className="border-b border-[var(--sand)] px-5 py-5">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--rust)]">
                  {isEn ? "Contact us" : "Contáctanos"}
                </p>
                <h2 className="mt-2 font-display text-[1.75rem] tracking-tight text-[var(--ink)]">
                  {isEn ? "Can’t find your answer?" : "¿No encuentras tu respuesta?"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-color)]">
                  {isEn
                    ? "Write to us and we’ll reply with a clear guide to solve your case."
                    : "Escríbenos y te respondemos con una guía clara para resolver tu caso."}
                </p>
              </div>

              <div className="px-5 py-5">
                <ContactForm locale={locale} accessKey={web3formsKey} />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
