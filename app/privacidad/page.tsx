import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerLocale } from "@/lib/locale-server";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

const PRIVACY_CONTENT: Record<
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
    metadataTitle: "Política de privacidad",
    metadataDescription:
      "Cómo trata webiculum tus datos personales, archivos CV, sesiones, pagos y contenido publicado.",
    eyebrow: "Privacidad",
    title: "Cómo tratamos tus datos hoy",
    intro:
      "Este texto explica el tratamiento real que hace ahora mismo webiculum sobre cuentas, CVs, webs, sesiones y pagos. Está pensado para ser claro, directo y consistente con el funcionamiento actual del producto.",
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
        title: "1. Qué cubre esta política",
        paragraphs: [
          "Esta política explica cómo tratamos la información personal cuando usas webiculum para iniciar sesión, subir tu CV, generar tu web, publicarla, descargarla o contratar un plan.",
          "Está redactada para reflejar el funcionamiento actual del producto. Si el servicio cambia de forma sustancial, podremos actualizar este texto y publicar una nueva versión.",
        ],
      },
      {
        title: "2. Qué datos recopilamos",
        paragraphs: [
          "Recogemos datos de acceso e identidad cuando entras con Google a través de Supabase Auth, incluyendo el identificador de usuario, tu email, tu nombre público, tu avatar si Google lo facilita y el username que asocias a la cuenta.",
          "También tratamos el contenido que decides subir o generar dentro del producto: archivos CV en PDF o imagen, texto extraído, información estructurada del CV, HTML generado, metadatos de la web y estado de publicación.",
        ],
        bullets: [
          "Preferencia de idioma guardada mediante cookie técnica y almacenamiento local para recordar si navegas en español o inglés.",
          "Datos de facturación y uso: plan activo, contadores de generación, estado de pagos o suscripciones y metadatos de checkout.",
          "Registros técnicos y de seguridad que puedan generarse al usar la plataforma o al producirse errores.",
        ],
      },
      {
        title: "3. Para qué usamos tus datos",
        paragraphs: [
          "Usamos tus datos para autenticarte, permitirte acceder a tu cuenta, procesar tu CV con IA, guardar tus webs, mostrarte previews, publicarlas en subdominio o dejarte descargar el HTML cuando tu plan lo permita.",
          "También los usamos para gestionar pagos, aplicar límites del plan, prevenir abuso, mantener la seguridad del servicio, responder a incidencias y cumplir obligaciones legales o fiscales cuando existan.",
        ],
      },
      {
        title: "4. Base jurídica del tratamiento",
        paragraphs: [
          "La base principal es la ejecución del servicio que solicitas cuando creas tu cuenta, subes contenido, generas una web o contratas un plan. En ciertos casos también tratamos datos por interés legítimo, por ejemplo para seguridad, prevención de fraude, control técnico y defensa frente a incidencias o reclamaciones.",
          "Cuando un tratamiento dependa de servicios de terceros o de publicar datos de forma abierta en internet, entiendes que ese uso forma parte del funcionamiento normal del producto que has pedido.",
        ],
      },
      {
        title: "5. Dónde y con quién se procesa la información",
        paragraphs: [
          "Actualmente la cuenta, la base de datos y los archivos subidos se gestionan con Supabase. Las operaciones con privilegios reforzados se ejecutan en el servidor; la clave de servicio no se expone al navegador del usuario.",
          "El contenido del CV se envía al proveedor de IA configurado en el backend para extraer datos y generar la web. En el estado actual del proyecto ese proveedor es Google Gemini. Los pagos se canalizan por Stripe.",
          "Además, el despliegue y la publicación pueden apoyarse en proveedores de infraestructura, hosting o DNS. Algunos proveedores pueden procesar datos fuera del Espacio Económico Europeo conforme a sus propias condiciones y salvaguardas.",
        ],
        bullets: [
          "Supabase: autenticación, sesión, base de datos y almacenamiento de archivos.",
          "Google Gemini: análisis del CV y generación del contenido web.",
          "Stripe: checkout, cobros, suscripciones y metadatos de facturación.",
        ],
      },
      {
        title: "6. Qué parte puede hacerse pública",
        paragraphs: [
          "Si decides publicar tu web, el contenido incluido en la página pública deja de ser privado y puede quedar accesible para cualquier persona que conozca o encuentre tu URL pública o subdominio.",
          "Debes revisar antes de publicar qué datos personales incluyes en el CV o en la web, especialmente email, teléfono, ubicación, enlaces y cualquier otro dato que no quieras exponer públicamente.",
        ],
      },
      {
        title: "7. Conservación y borrado",
        paragraphs: [
          "Las previews gratuitas no publicadas pueden eliminarse automáticamente pasadas 24 horas, junto con el archivo subido asociado, para liberar almacenamiento y aplicar las reglas del plan gratuito.",
          "Los datos vinculados a cuentas de pago, webs, publicaciones, facturación, soporte y seguridad pueden conservarse mientras sean necesarios para prestar el servicio, gestionar incidencias, resolver disputas, cumplir obligaciones legales o mantener evidencias técnicas razonables.",
          "La publicación pública puede expirar según el plan activo. A día de hoy, el plan premium se limita temporalmente y el plan studio no tiene un vencimiento automático de publicación definido en el código actual.",
        ],
      },
      {
        title: "8. Cookies, sesión y seguridad",
        paragraphs: [
          "Usamos cookies técnicas necesarias para mantener la sesión y operar el acceso mediante Supabase, además de una cookie de preferencia de idioma. Sin estas cookies el producto no funciona correctamente.",
          "Aplicamos medidas técnicas y organizativas razonables para reducir riesgos, pero ningún sistema conectado a internet puede garantizar seguridad absoluta ni disponibilidad permanente. Por eso no debes usar la plataforma como único repositorio de tus datos.",
        ],
      },
      {
        title: "9. Tus derechos",
        paragraphs: [
          "Puedes solicitar acceso, rectificación, supresión, limitación, oposición o portabilidad sobre los datos que podamos gestionar directamente, dentro de los límites legales y técnicos aplicables. También puedes pedir la eliminación de contenido de tu cuenta cuando proceda.",
          "Para ejercer derechos, resolver dudas o reportar incidencias sobre privacidad, utiliza el canal de ayuda disponible en esta web. Si una parte del tratamiento depende de terceros como Google, Supabase o Stripe, puede ser necesario coordinar la gestión con esos proveedores.",
        ],
        bullets: [
          "No vendemos tus datos como producto independiente.",
          "No subas categorías especiales de datos si no son necesarias para tu web.",
          "Si detectamos cambios relevantes en el tratamiento, podremos actualizar esta política.",
        ],
      },
    ],
  },
  en: {
    metadataTitle: "Privacy policy",
    metadataDescription:
      "How webiculum handles your personal data, CV files, sessions, payments and published content.",
    eyebrow: "Privacy",
    title: "How we handle your data today",
    intro:
      "This text explains how webiculum currently handles accounts, CVs, websites, sessions and payments. It is written to match the product as it works right now.",
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
        title: "1. What this policy covers",
        paragraphs: [
          "This policy explains how we process personal information when you use webiculum to sign in, upload your CV, generate your website, publish it, download it or buy a plan.",
          "It is written to reflect how the product currently works. If the service changes in a material way, we may update this text and publish a new version.",
        ],
      },
      {
        title: "2. What data we collect",
        paragraphs: [
          "We collect identity and access data when you sign in with Google through Supabase Auth, including your user identifier, email, public name, avatar if Google provides it, and the username linked to your account.",
          "We also process the content you choose to upload or generate inside the product: CV files in PDF or image format, extracted text, structured CV information, generated HTML, website metadata and publication status.",
        ],
        bullets: [
          "Language preference stored in a technical cookie and local storage so we can remember whether you browse in Spanish or English.",
          "Billing and usage data: active plan, generation counters, payment or subscription status, and checkout metadata.",
          "Technical and security logs that may be generated while you use the platform or when errors occur.",
        ],
      },
      {
        title: "3. Why we use your data",
        paragraphs: [
          "We use your data to authenticate you, let you access your account, process your CV with AI, store your websites, show previews, publish them on a subdomain, and let you download the HTML when your plan allows it.",
          "We also use it to manage payments, enforce plan limits, prevent abuse, maintain service security, respond to incidents, and comply with legal or tax obligations where applicable.",
        ],
      },
      {
        title: "4. Legal basis for processing",
        paragraphs: [
          "The main legal basis is the performance of the service you request when you create an account, upload content, generate a website or purchase a plan. In some cases we also process data under legitimate interest, for example for security, fraud prevention, technical control and handling incidents or claims.",
          "When processing depends on third-party services or on making data publicly available on the internet, you understand that this use is part of the normal operation of the product you requested.",
        ],
      },
      {
        title: "5. Where and with whom data is processed",
        paragraphs: [
          "Accounts, database records and uploaded files are currently managed through Supabase. Operations with elevated privileges run on the server, and the service-role key is not exposed in the browser.",
          "CV content is sent to the AI provider configured in the backend in order to extract data and generate the website. In the current version of the project that provider is Google Gemini. Payments are processed through Stripe.",
          "Deployment and publication may also rely on infrastructure, hosting or DNS providers. Some providers may process data outside the European Economic Area under their own safeguards and terms.",
        ],
        bullets: [
          "Supabase: authentication, session handling, database and file storage.",
          "Google Gemini: CV analysis and website generation.",
          "Stripe: checkout, charges, subscriptions and billing metadata.",
        ],
      },
      {
        title: "6. What may become public",
        paragraphs: [
          "If you choose to publish your website, the content included in the public page stops being private and may be accessible to anyone who knows or finds your public URL or subdomain.",
          "Before publishing, you should review which personal data appears in your CV or website, especially email, phone number, location, links and any other information you do not want to expose publicly.",
        ],
      },
      {
        title: "7. Retention and deletion",
        paragraphs: [
          "Free unpublished previews may be deleted automatically after 24 hours, together with the uploaded file linked to them, in order to free storage and enforce the free-plan rules.",
          "Data linked to paid accounts, websites, publications, billing, support and security may be kept for as long as reasonably necessary to provide the service, manage incidents, resolve disputes, comply with legal obligations or preserve technical evidence.",
          "Public availability may expire depending on the active plan. As of today, the premium plan has a limited duration and the studio plan does not have an automatic publication expiry defined in the current code.",
        ],
      },
      {
        title: "8. Cookies, session and security",
        paragraphs: [
          "We use technical cookies required to keep your session active and operate Supabase-based access, as well as a language preference cookie. Without these cookies, the product does not work correctly.",
          "We apply reasonable technical and organizational measures to reduce risk, but no internet-connected system can guarantee absolute security or permanent availability. You should not use the platform as your only storage location.",
        ],
      },
      {
        title: "9. Your rights",
        paragraphs: [
          "You may request access, rectification, deletion, restriction, objection or portability regarding data we can directly manage, within the legal and technical limits that apply. You may also request deletion of content linked to your account where appropriate.",
          "To exercise rights, ask questions or report privacy issues, use the help channel available on this website. If part of the processing depends on providers such as Google, Supabase or Stripe, the request may need to be coordinated with them.",
        ],
        bullets: [
          "We do not sell your data as a standalone product.",
          "Do not upload special categories of data unless they are truly necessary for your website.",
          "If we make relevant changes to the processing, we may update this policy.",
        ],
      },
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const content = PRIVACY_CONTENT[locale];

  return {
    title: content.metadataTitle,
    description: content.metadataDescription,
  };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const content = PRIVACY_CONTENT[locale];

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
