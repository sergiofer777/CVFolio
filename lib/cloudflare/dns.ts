const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

interface CloudflareDnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface CloudflareListResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: CloudflareDnsRecord[];
}

interface CloudflareWriteResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: CloudflareDnsRecord;
}

export interface ProvisionSubdomainResult {
  status: "skipped" | "created" | "updated";
  fqdn: string;
  message?: string;
  recordId?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function cfHeaders(): HeadersInit {
  const token = getRequiredEnv("CLOUDFLARE_API_TOKEN");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getRootDomain(): string {
  return (process.env.ROOT_DOMAIN ?? "webiculum.com").toLowerCase();
}

function getSubdomainTarget(): string {
  return process.env.CLOUDFLARE_SUBDOMAIN_TARGET ?? "cname.vercel-dns.com";
}

function normalizeSubdomain(subdomain: string): string {
  const normalized = subdomain.toLowerCase().trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
    throw new Error(`Invalid subdomain value: ${subdomain}`);
  }
  return normalized;
}

export async function upsertCloudflareSubdomainRecord(
  subdomain: string
): Promise<ProvisionSubdomainResult> {
  const normalizedSubdomain = normalizeSubdomain(subdomain);
  const rootDomain = getRootDomain();
  const fqdn = `${normalizedSubdomain}.${rootDomain}`;

  // Default to wildcard mode to avoid requiring per-record Cloudflare API setup.
  // Set CLOUDFLARE_USE_WILDCARD="false" only if you really want one record per user.
  if (process.env.CLOUDFLARE_USE_WILDCARD !== "false") {
    return {
      status: "skipped",
      fqdn,
      message:
        "Wildcard DNS enabled. No per-subdomain DNS record required in Cloudflare.",
    };
  }

  const zoneId = getRequiredEnv("CLOUDFLARE_ZONE_ID");
  const target = getSubdomainTarget();

  const lookupUrl = new URL(
    `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`
  );
  lookupUrl.searchParams.set("type", "CNAME");
  lookupUrl.searchParams.set("name", fqdn);

  const listRes = await fetch(lookupUrl, { headers: cfHeaders() });
  if (!listRes.ok) {
    throw new Error(
      `Cloudflare DNS lookup failed (${listRes.status}): ${await listRes.text()}`
    );
  }

  const listJson = (await listRes.json()) as CloudflareListResponse;
  if (!listJson.success) {
    throw new Error(
      `Cloudflare DNS lookup error: ${
        listJson.errors?.map((e) => e.message).join(", ") ?? "unknown"
      }`
    );
  }

  const existing = listJson.result?.[0];
  const payload = {
    type: "CNAME",
    name: fqdn,
    content: target,
    ttl: 1,
    proxied: true,
  };

  if (existing) {
    const updateRes = await fetch(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${existing.id}`,
      {
        method: "PUT",
        headers: cfHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!updateRes.ok) {
      throw new Error(
        `Cloudflare DNS update failed (${updateRes.status}): ${await updateRes.text()}`
      );
    }

    const updateJson = (await updateRes.json()) as CloudflareWriteResponse;
    if (!updateJson.success) {
      throw new Error(
        `Cloudflare DNS update error: ${
          updateJson.errors?.map((e) => e.message).join(", ") ?? "unknown"
        }`
      );
    }

    return {
      status: "updated",
      fqdn,
      recordId: updateJson.result?.id ?? existing.id,
    };
  }

  const createRes = await fetch(
    `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      headers: cfHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!createRes.ok) {
    throw new Error(
      `Cloudflare DNS create failed (${createRes.status}): ${await createRes.text()}`
    );
  }

  const createJson = (await createRes.json()) as CloudflareWriteResponse;
  if (!createJson.success) {
    throw new Error(
      `Cloudflare DNS create error: ${
        createJson.errors?.map((e) => e.message).join(", ") ?? "unknown"
      }`
    );
  }

  return {
    status: "created",
    fqdn,
    recordId: createJson.result?.id,
  };
}
