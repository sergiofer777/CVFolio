import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerLocale } from "@/lib/locale-server";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

const TERMS_CONTENT: Record<
  "es" | "en",
  {
    metadataTitle: string;
    metadataDescription: string;
    eyebrow: string;
    title: string;
    intro: string;
    lastUpdated: string;
    lastUpdatedLabel: string;
    navPrivacyLabel: string;
    navTermsLabel: string;
    navHomeLabel: string;
    footerText: string;
    helpLinkLabel: string;
    sections: readonly LegalSection[];
  }
> = {
  es: {
    metadataTitle: "Términos de uso",
    metadataDescription:
      "Condiciones de uso de webiculum, límites del servicio y cláusulas de disponibilidad y responsabilidad.",
    eyebrow: "Términos",
    title: "Condiciones de uso y límites del servicio",
    intro:
      "Aquí dejamos claro qué ofrece webiculum, qué no garantiza y hasta dónde llega nuestra responsabilidad. El objetivo es que el uso del servicio quede definido sin ambigüedades, también en los planes de pago.",
    lastUpdated: "2 de marzo de 2026",
    lastUpdatedLabel: "Última actualización",
    navPrivacyLabel: "Privacidad",
    navTermsLabel: "Términos",
    navHomeLabel: "Inicio",
    footerText:
      "Si necesitas ayuda o ejercer derechos sobre tus datos, puedes escribirnos desde la sección de ayuda.",
    helpLinkLabel: "Ir a ayuda",
    sections: [
      {
        title: "1. Aceptación del servicio",
        paragraphs: [
          "Al acceder, registrarte o usar webiculum aceptas estas condiciones. Si no estás de acuerdo, no uses la plataforma.",
          "Estas condiciones se aplican tanto a usuarios gratuitos como a usuarios de pago. El uso continuado del producto tras cambios publicados implica aceptación de la versión vigente.",
        ],
      },
      {
        title: "2. Qué ofrece webiculum",
        paragraphs: [
          "webiculum es una herramienta digital para transformar un CV en una web personal, mostrar previews, publicar contenido en una URL pública y, en determinados planes, descargar el HTML o acceder a funciones adicionales.",
          "El resultado depende del contenido que subas, de servicios de terceros y de sistemas automatizados. No garantizamos que la salida sea perfecta, completa, adecuada para un fin concreto, libre de errores o apta para decisiones profesionales, legales o comerciales.",
        ],
      },
      {
        title: "3. Cuenta, acceso y contenido del usuario",
        paragraphs: [
          "Debes usar una cuenta válida y mantener bajo tu responsabilidad el acceso a tu perfil. Eres responsable de la información que subes, publicas o compartes y de contar con los derechos necesarios sobre ese contenido.",
          "No debes usar la plataforma para subir material ilícito, confidencial de terceros sin permiso, malware, contenido que infrinja derechos o información especialmente sensible que no sea necesaria para tu objetivo.",
        ],
      },
      {
        title: "4. Precios, planes y pagos",
        paragraphs: [
          "Los planes y precios publicados en cada momento describen el alcance comercial ofrecido en ese instante, pero no constituyen una garantía de disponibilidad perpetua, mantenimiento indefinido o continuidad ilimitada de ninguna funcionalidad.",
          "La facturación y los cobros se procesan mediante Stripe. webiculum no almacena números completos de tarjeta en el código actual. Salvo que una norma imperativa disponga lo contrario o se indique expresamente por escrito, los pagos no son reembolsables por simples cambios de preferencia, expectativas o resultados creativos.",
        ],
      },
      {
        title: "5. Disponibilidad, cambios y fin del servicio",
        paragraphs: [
          "Podemos modificar, limitar, suspender, retirar o interrumpir funciones, planes, integraciones, dominios, automatizaciones, descargas, publicación o cualquier parte del producto en cualquier momento, con o sin previo aviso, por razones técnicas, operativas, económicas, legales o estratégicas.",
          "Que hayas pagado un plan o una suscripción no implica que la plataforma, una característica concreta, una integración externa o una URL pública vaya a seguir disponible para siempre ni que pueda recuperarse en caso de cierre, cambio de proveedor o incidencia grave.",
        ],
      },
      {
        title: "6. Datos, copias de seguridad y contenido publicado",
        paragraphs: [
          "Tú eres el responsable de conservar una copia propia de tu CV, de tu contenido y de cualquier HTML descargado. No uses webiculum como único sistema de archivo o backup.",
          "Las previews gratuitas pueden caducar y eliminarse automáticamente. El contenido público puede dejar de estar disponible por vencimiento del plan, incidencias técnicas, cambios internos, decisiones operativas, errores de terceros o cualquier otra causa razonable de servicio.",
          "Si publicas una web, asumes el riesgo inherente de hacer visible tu información en internet y las consecuencias derivadas de la exposición pública de esos datos.",
        ],
      },
      {
        title: "7. Exclusión y limitación de responsabilidad",
        paragraphs: [
          "En la máxima medida permitida por la ley aplicable, webiculum presta el servicio tal cual y según disponibilidad, sin garantías expresas ni implícitas de continuidad, disponibilidad, calidad, exactitud, compatibilidad, seguridad, permanencia o adecuación para un propósito concreto.",
          "En la máxima medida permitida por la ley, webiculum no será responsable de caídas del servicio, pérdida de datos, corrupción de archivos, resultados defectuosos de la IA, errores de publicación, fallos de subdominio o DNS, incidencias de Stripe, Supabase, Google, Cloudflare o cualquier proveedor externo, accesos no autorizados, filtraciones, daños indirectos, lucro cesante, pérdida de negocio, pérdida reputacional ni cualquier daño derivado del uso o de la imposibilidad de uso del servicio, incluso aunque exista un plan de pago activo.",
          "Nada de esta cláusula excluye responsabilidades que legalmente no puedan limitarse o excluirse de forma válida, incluyendo los derechos imperativos del consumidor cuando resulten aplicables.",
        ],
        bullets: [
          "El pago de una suscripción no crea una obligación de funcionamiento ininterrumpido.",
          "No garantizamos recuperación, restauración ni conservación indefinida de datos.",
          "Las integraciones con terceros pueden fallar, cambiar o dejar de existir.",
        ],
      },
      {
        title: "8. Suspensión de cuentas y uso indebido",
        paragraphs: [
          "Podemos bloquear, limitar o cerrar cuentas si detectamos abuso, uso fraudulento, incumplimiento de estas condiciones, riesgos de seguridad, reclamaciones de terceros o cualquier circunstancia que comprometa el funcionamiento del servicio o la posición legal del proyecto.",
          "La suspensión o retirada de acceso puede producirse también por mantenimiento, requerimientos legales, incidencias de proveedores o imposibilidad técnica de seguir operando en las condiciones actuales.",
        ],
      },
      {
        title: "9. Ley aplicable y prevalencia legal",
        paragraphs: [
          "Estas condiciones se interpretan conforme a la normativa aplicable al titular del servicio y a las normas imperativas que protejan al consumidor cuando correspondan. Si una cláusula resulta inválida o no ejecutable, el resto seguirá vigente en la medida posible.",
          "Si necesitas un marco contractual específico, garantías adicionales, SLA, DPA o compromisos de disponibilidad, deben pactarse expresamente por escrito; no nacen por defecto del simple uso ni del pago estándar publicado en la web.",
        ],
      },
    ],
  },
  en: {
    metadataTitle: "Terms of use",
    metadataDescription:
      "Terms of use for webiculum, including service limits, availability rules and liability clauses.",
    eyebrow: "Terms",
    title: "Terms of use and service limits",
    intro:
      "This page makes clear what webiculum offers, what it does not guarantee, and where our responsibility ends. The goal is to define use of the service without ambiguity, including paid plans.",
    lastUpdated: "March 2, 2026",
    lastUpdatedLabel: "Last updated",
    navPrivacyLabel: "Privacy",
    navTermsLabel: "Terms",
    navHomeLabel: "Home",
    footerText:
      "If you need help or want to exercise your data rights, you can contact us through the help section.",
    helpLinkLabel: "Go to help",
    sections: [
      {
        title: "1. Acceptance of the service",
        paragraphs: [
          "By accessing, signing up for or using webiculum, you accept these terms. If you do not agree, do not use the platform.",
          "These terms apply to both free and paid users. Continued use of the product after published changes means acceptance of the version then in force.",
        ],
      },
      {
        title: "2. What webiculum provides",
        paragraphs: [
          "webiculum is a digital tool that turns a CV into a personal website, shows previews, publishes content on a public URL and, on certain plans, allows HTML downloads or access to additional features.",
          "The result depends on the content you upload, third-party services and automated systems. We do not guarantee that the output will be perfect, complete, suitable for a specific purpose, error-free or fit for professional, legal or commercial decisions.",
        ],
      },
      {
        title: "3. Account, access and user content",
        paragraphs: [
          "You must use a valid account and remain responsible for access to your profile. You are responsible for the information you upload, publish or share and for having the necessary rights over that content.",
          "You must not use the platform to upload unlawful material, third-party confidential information without permission, malware, infringing content or especially sensitive information that is not necessary for your purpose.",
        ],
      },
      {
        title: "4. Pricing, plans and payments",
        paragraphs: [
          "The plans and prices shown at any given time describe the commercial scope offered at that moment, but they do not constitute a guarantee of perpetual availability, indefinite maintenance or unlimited continuity of any feature.",
          "Billing and charges are processed through Stripe. webiculum does not store full card numbers in the current codebase. Unless mandatory law requires otherwise or we expressly say so in writing, payments are not refundable for simple changes of preference, expectations or creative results.",
        ],
      },
      {
        title: "5. Availability, changes and end of service",
        paragraphs: [
          "We may modify, limit, suspend, withdraw or interrupt features, plans, integrations, domains, automations, downloads, publication or any other part of the product at any time, with or without prior notice, for technical, operational, economic, legal or strategic reasons.",
          "Paying for a plan or subscription does not mean the platform, a specific feature, an external integration or a public URL will remain available forever, nor that it can be recovered if the service closes, changes provider or suffers a serious incident.",
        ],
      },
      {
        title: "6. Data, backups and published content",
        paragraphs: [
          "You are responsible for keeping your own copy of your CV, your content and any downloaded HTML. Do not use webiculum as your only archive or backup system.",
          "Free previews may expire and be deleted automatically. Public content may become unavailable due to plan expiry, technical incidents, internal changes, operational decisions, third-party errors or any other reasonable service cause.",
          "If you publish a website, you assume the inherent risk of making your information visible on the internet and the consequences derived from that public exposure.",
        ],
      },
      {
        title: "7. Disclaimer and limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by applicable law, webiculum provides the service as is and as available, without express or implied warranties of continuity, availability, quality, accuracy, compatibility, security, permanence or fitness for a particular purpose.",
          "To the maximum extent permitted by law, webiculum will not be liable for service outages, data loss, file corruption, defective AI results, publication errors, subdomain or DNS failures, incidents involving Stripe, Supabase, Google, Cloudflare or any third-party provider, unauthorized access, leaks, indirect damages, loss of profit, business loss, reputational harm or any damage arising from use of, or inability to use, the service, even if a paid plan is active.",
          "Nothing in this clause excludes liabilities that cannot legally be limited or excluded, including mandatory consumer rights where they apply.",
        ],
        bullets: [
          "Paying for a subscription does not create an obligation of uninterrupted operation.",
          "We do not guarantee recovery, restoration or indefinite retention of data.",
          "Third-party integrations may fail, change or disappear.",
        ],
      },
      {
        title: "8. Account suspension and misuse",
        paragraphs: [
          "We may block, limit or close accounts if we detect abuse, fraudulent use, breach of these terms, security risks, third-party claims or any circumstance that compromises service operation or the legal position of the project.",
          "Access may also be suspended or removed for maintenance, legal requirements, provider incidents or technical inability to continue operating under current conditions.",
        ],
      },
      {
        title: "9. Governing law and legal precedence",
        paragraphs: [
          "These terms are interpreted under the law applicable to the service owner and any mandatory consumer-protection rules that may apply. If one clause is invalid or unenforceable, the rest will remain in effect as far as possible.",
          "If you need a specific contractual framework, extra warranties, an SLA, a DPA or availability commitments, they must be agreed expressly in writing; they do not arise by default from ordinary use or from paying the standard price shown on the website.",
        ],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const content = TERMS_CONTENT[locale];

  return {
    title: content.metadataTitle,
    description: content.metadataDescription,
  };
}

export default async function TermsPage() {
  const locale = await getServerLocale();
  const content = TERMS_CONTENT[locale];

  return (
    <LegalPageShell
      eyebrow={content.eyebrow}
      title={content.title}
      intro={content.intro}
      lastUpdated={content.lastUpdated}
      lastUpdatedLabel={content.lastUpdatedLabel}
      navPrivacyLabel={content.navPrivacyLabel}
      navTermsLabel={content.navTermsLabel}
      navHomeLabel={content.navHomeLabel}
      footerText={content.footerText}
      helpLinkLabel={content.helpLinkLabel}
      sections={content.sections}
    />
  );
}
