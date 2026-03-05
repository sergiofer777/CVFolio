# Webiculum: Cloudflare + Vercel + Stripe (free vs paid)

## 1. Arquitectura final
- `free`: genera preview local (dashboard), no publicación pública, caduca en 24h.
- `premium` (`€9,99/año` suscripción): 1 portfolio publicado en `usuario.webiculum.com` durante 1 año.
- `studio` (`€24,99/año` suscripción): hasta 3 portfolios + 3 iteraciones de chat por portfolio.

Flujo:
1. Usuario sube CV.
2. API valida cuota según plan.
3. Se genera portfolio.
4. Si no paga: solo preview + expiración.
5. Si paga (Stripe webhook): se activa plan, se publica portfolio y se provisiona DNS en Cloudflare.

## 2. Cloudflare (DNS wildcard)
En zona `webiculum.com`:
1. Mantén `webiculum.com` y `www` apuntando a Vercel (como ya lo tengas en producción).
2. Añade wildcard:
   - `Type`: `CNAME`
   - `Name`: `*`
   - `Target`: `cname.vercel-dns.com`
   - `Proxy status`: `Proxied`
3. (Opcional) si no usas wildcard, la app crea/actualiza CNAME por usuario vía API Cloudflare.

## 3. Vercel (dominios + wildcard)
En el proyecto de Vercel:
1. Añade dominios:
   - `webiculum.com`
   - `www.webiculum.com`
   - `*.webiculum.com`
2. Verifica TLS activo para wildcard.
3. Mantén deploy desde `main`; esta rama (`codex/monetization-cloudflare-flow`) es de integración.

## 4. Stripe (checkout + webhook)
Productos recomendados:
- `Publish Pro` (subscription, yearly): `€9,99 / año`
- `Studio` (subscription, yearly): `€24,99 / año`

Webhook en Stripe:
- Endpoint: `https://webiculum.com/api/billing/webhook`
- Eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## 5. Variables de entorno (Vercel)
Configura estas variables:
- `NEXT_PUBLIC_APP_URL=https://webiculum.com`
- `ROOT_DOMAIN=webiculum.com`
- `APP_SUBDOMAIN=app`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `STRIPE_PRICE_PUBLISH_999=price_xxx`
- `STRIPE_PRICE_STUDIO_2500=price_xxx`
- `CLOUDFLARE_API_TOKEN=...`
- `CLOUDFLARE_ZONE_ID=...`
- `CLOUDFLARE_SUBDOMAIN_TARGET=cname.vercel-dns.com`
- `CLOUDFLARE_USE_WILDCARD=true` (si usas wildcard)
- `BILLING_ENFORCEMENT_ENABLED=true`
- `BILLING_MOCK_PAYMENTS_ENABLED=false` (en producción; usar `true` solo para pruebas locales controladas)
- `CRON_SECRET=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## 6. Supabase (SQL)
Ejecuta:
- `docs/sql/2026-02-26-monetizacion-cloudflare.sql`
- `docs/sql/2026-03-05-security-rls-hardening.sql`

Esto añade:
- `profiles.plan` con `studio`
- `billing_usage`
- `domain_requests`
- `billing_subscriptions`

## 7. Cron de limpieza (previews gratis)
Ruta:
- `GET /api/cron/cleanup-previews`

Hace:
- elimina portfolios free no publicados con más de 24h
- elimina sus uploads asociados

La llamada debe incluir `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret`.

## 8. Dominio personalizado vía API
Endpoint:
- `POST /api/domains/custom`
- body: `{ "domain": "tumarca.com", "notes": "opcional" }`

Requiere plan pagado. Guarda solicitud en `domain_requests`.
Luego puedes conectar un proveedor real (Porkbun/Namecheap/Reseller API) en segundo paso.
