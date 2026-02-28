import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleHelp, Mail, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Centro de ayuda",
  description:
    "Resuelve dudas sobre generación de portfolios, planes, subdominios y publicación en Webiculum.",
};

const HELP_FAQS = [
  {
    question: "¿Qué formatos de archivo puedo subir a Webiculum?",
    answer:
      "Puedes subir CVs en PDF, JPG o PNG. El sistema detecta el contenido principal y lo transforma en una estructura web editable.",
  },
  {
    question: "¿Cuánto tarda en generarse mi portfolio?",
    answer:
      "Normalmente tarda solo unos segundos. Si el documento tiene muchas páginas, tablas complejas o imágenes pesadas, puede tardar algo más.",
  },
  {
    question: "¿Puedo editar la web después de generarla?",
    answer:
      "Sí. Desde el dashboard puedes seleccionar tu portfolio, cambiar plantilla, ajustar el subdominio y, en planes compatibles, iterar cambios mediante el chat.",
  },
  {
    question: "¿Qué diferencia hay entre la vista previa y la publicación?",
    answer:
      "La vista previa te permite revisar cómo queda el portfolio antes de publicarlo. La publicación activa el acceso público mediante subdominio y permite compartirlo.",
  },
  {
    question: "¿Qué pasa si uso el plan gratuito?",
    answer:
      "El plan gratuito te deja generar una vista previa temporal durante 24 horas. Pasado ese tiempo, necesitas un plan de pago para conservar la web publicada.",
  },
  {
    question: "¿Puedo elegir mi propio subdominio?",
    answer:
      "Sí. En planes con publicación puedes definir tu subdominio dentro de Webiculum, guardarlo desde el dashboard y enlazar el portfolio que quieras mostrar.",
  },
  {
    question: "¿Qué incluye el plan Pro y cuándo necesito Studio?",
    answer:
      "Pro está pensado para publicar una única web con subdominio durante 1 año. Studio añade más portfolios y acceso a iteraciones por chat para refinar varias versiones.",
  },
  {
    question: "¿Mi CV y mis datos son privados?",
    answer:
      "Tus documentos y portfolios se asocian a tu cuenta. Solo se hacen públicos los portfolios que tú decidas publicar con subdominio o compartir manualmente.",
  },
];

export default async function HelpCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string }>;
}) {
  const web3formsKey =
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ??
    process.env.WEB3FORMS_ACCESS_KEY ??
    "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webiculum.com";
  const redirectUrl = `${appUrl.replace(/\/$/, "")}/ayuda?sent=1`;
  const params = searchParams ? await searchParams : undefined;
  const sentFlag = params?.sent === "1";

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
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--sand)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] no-underline transition-colors hover:border-[var(--ink)] hover:bg-[var(--cream)] sm:px-4 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-2xl bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--paper)] no-underline transition-colors hover:bg-[var(--rust)] sm:text-sm"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--sand)] px-4 py-8 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-3 flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--rust)]">
            <span className="h-[1.5px] w-8 bg-[var(--rust)]" />
            Centro de ayuda
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,860px)_300px] lg:items-end lg:justify-between">
            <div className="max-w-[860px]">
              <h1 className="font-display text-[clamp(1.9rem,3.4vw,3.7rem)] font-light leading-[1.02] tracking-tight text-[var(--ink)]">
                Respuestas claras
                <span className="block">
                  para publicar con <em className="italic text-[var(--rust)]">seguridad</em>.
                </span>
              </h1>
            </div>
            <p className="max-w-[300px] text-[0.95rem] leading-[1.55] text-[var(--muted-color)]">
              Aquí tienes las dudas más frecuentes sobre generación, publicación,
              subdominios, planes y edición de portfolios en Webiculum.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-[1360px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {HELP_FAQS.map((item, index) => (
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

          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-[var(--sand)] bg-white shadow-[0_6px_24px_rgba(13,13,13,0.04)]">
              <div className="border-b border-[var(--sand)] px-5 py-5">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--rust)]">
                  Contáctanos
                </p>
                <h2 className="mt-2 font-display text-[1.75rem] tracking-tight text-[var(--ink)]">
                  ¿No encuentras tu respuesta?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-color)]">
                  Escríbenos y te respondemos con una guía clara para resolver tu
                  caso.
                </p>
              </div>

              <div className="px-5 py-5">
                {sentFlag && (
                  <p className="mb-4 rounded-xl border border-[rgba(10,125,70,0.18)] bg-[rgba(10,125,70,0.06)] px-4 py-3 text-sm text-[rgb(10,125,70)]">
                    Mensaje enviado. Te responderemos lo antes posible.
                  </p>
                )}

                {!web3formsKey && (
                  <p className="mb-4 rounded-xl border border-[rgba(192,68,10,0.18)] bg-[rgba(192,68,10,0.06)] px-4 py-3 text-sm text-[var(--rust)]">
                    Añade la variable <code>NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY</code> en
                    Vercel para activar este formulario.
                  </p>
                )}

                <form
                  action="https://api.web3forms.com/submit"
                  method="POST"
                  className="space-y-3"
                >
                  <input type="hidden" name="access_key" value={web3formsKey} />
                  <input type="hidden" name="subject" value="Nuevo mensaje desde el centro de ayuda de Webiculum" />
                  <input type="hidden" name="from_name" value="Centro de ayuda Webiculum" />
                  <input type="hidden" name="redirect" value={redirectUrl} />

                  <label className="block">
                    <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
                      Nombre
                    </span>
                    <input
                      type="text"
                      name="name"
                      required
                      className="h-11 w-full rounded-xl border border-[var(--sand)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
                      placeholder="Tu nombre"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
                      Email
                    </span>
                    <input
                      type="email"
                      name="email"
                      required
                      className="h-11 w-full rounded-xl border border-[var(--sand)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
                      placeholder="tu@email.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[var(--muted-color)]">
                      Mensaje
                    </span>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      className="w-full rounded-2xl border border-[var(--sand)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ink)]"
                      placeholder="Cuéntanos tu duda y te responderemos."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={!web3formsKey}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--paper)] transition-colors hover:bg-[var(--rust)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Enviar mensaje
                  </button>
                </form>

                <div className="mt-4 rounded-xl bg-[var(--cream)] px-4 py-3 text-sm text-[var(--muted-color)]">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <Mail className="h-4 w-4 text-[var(--rust)]" />
                    También puedes escribirnos cuando el formulario esté activo.
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
