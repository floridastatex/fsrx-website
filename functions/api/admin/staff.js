const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

async function verifiedAccessEmail(request, env) {
  const token = request.headers.get("cf-access-jwt-assertion");
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/\/$/, "");
  const audience = String(env.ACCESS_AUD || "").trim();

  if (!token || !teamDomain || !audience) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));

    if (header.alg !== "RS256" || !header.kid) return null;

    const now = Math.floor(Date.now() / 1000);
    const issuer = teamDomain;
    const tokenAudiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

    if (claims.iss !== issuer) return null;
    if (!tokenAudiences.includes(audience)) return null;
    if (typeof claims.exp !== "number" || claims.exp <= now) return null;
    if (typeof claims.nbf === "number" && claims.nbf > now) return null;
    if (typeof claims.iat === "number" && claims.iat > now + 60) return null;

    const certsResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!certsResponse.ok) return null;

    const certs = await certsResponse.json();
    const jwk = certs.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = decodeBase64Url(parts[2]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      signedContent
    );

    if (!valid || typeof claims.email !== "string") return null;
    return claims.email.toLowerCase();
  } catch {
    return null;
  }
}

async function authorized(request, env) {
  const email = await verifiedAccessEmail(request, env);
  const allowed = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && allowed.includes(email));
}

function clean(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validUrl(value) {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parse(body) {
  const p = {
    discord_display_name: clean(body.discord_display_name, 80),
    discord_username: clean(body.discord_username, 80),
    rank: clean(body.rank, 100),
    discord_avatar: clean(body.discord_avatar, 500),
    discord_banner: clean(body.discord_banner, 500),
    roblox_display_name: clean(body.roblox_display_name, 80),
    roblox_username: clean(body.roblox_username, 80),
    roblox_id: clean(body.roblox_id, 24),
    roblox_avatar: clean(body.roblox_avatar, 500),
    tags: Array.isArray(body.tags)
      ? body.tags.slice(0, 12).map(value => clean(value, 32)).filter(Boolean)
      : []
  };

  if (!p.discord_display_name || !p.rank) {
    throw new Error("Discord display name and staff rank are required.");
  }

  for (const key of ["discord_avatar", "discord_banner", "roblox_avatar"]) {
    if (!validUrl(p[key])) throw new Error("Profile image links must use HTTPS.");
  }

  if (p.roblox_id && !/^\\d+$/.test(p.roblox_id)) {
    throw new Error("Roblox user ID must contain numbers only.");
  }

  return p;
}

export async function onRequest({ request, env }) {
  if (!(await authorized(request, env))) {
    return reply({ error: "Access denied. Sign in through your authorized Cloudflare Access account." }, 403);
  }

  if (!env.FSRX_DB) {
    return reply({ error: "The FSRX_DB D1 binding is not configured." }, 503);
  }

  try {
    if (request.method === "GET") {
      const { results } = await env.FSRX_DB
        .prepare("SELECT * FROM staff_members ORDER BY sort_order ASC, created_at ASC")
        .all();

      return reply({
        staff: (results || []).map(row => ({ ...row, tags: parseTags(row.tags) }))
      });
    }

    if (request.method === "POST") {
      const p = parse(await request.json());
      const result = await env.FSRX_DB.prepare(
        "INSERT INTO staff_members (discord_display_name, discord_username, rank, discord_avatar, discord_banner, roblox_display_name, roblox_username, roblox_id, roblox_avatar, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        p.discord_display_name, p.discord_username, p.rank, p.discord_avatar,
        p.discord_banner, p.roblox_display_name, p.roblox_username, p.roblox_id,
        p.roblox_avatar, JSON.stringify(p.tags)
      ).run();

      return reply({ ok: true, id: result.meta?.last_row_id }, 201);
    }

    if (request.method === "PUT") {
      const body = await request.json();
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) {
        return reply({ error: "A valid staff member ID is required." }, 400);
      }

      const p = parse(body);
      const result = await env.FSRX_DB.prepare(
        "UPDATE staff_members SET discord_display_name=?, discord_username=?, rank=?, discord_avatar=?, discord_banner=?, roblox_display_name=?, roblox_username=?, roblox_id=?, roblox_avatar=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(
        p.discord_display_name, p.discord_username, p.rank, p.discord_avatar,
        p.discord_banner, p.roblox_display_name, p.roblox_username, p.roblox_id,
        p.roblox_avatar, JSON.stringify(p.tags), id
      ).run();

      if (!result.meta?.changes) return reply({ error: "Staff member not found." }, 404);
      return reply({ ok: true });
    }

    if (request.method === "DELETE") {
      const body = await request.json();
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) {
        return reply({ error: "A valid staff member ID is required." }, 400);
      }

      const result = await env.FSRX_DB.prepare(
        "DELETE FROM staff_members WHERE id=?"
      ).bind(id).run();

      if (!result.meta?.changes) return reply({ error: "Staff member not found." }, 404);
      return reply({ ok: true });
    }

    return reply({ error: "Method not allowed." }, 405);
  } catch (error) {
    return reply({
      error: error instanceof Error ? error.message : "Unexpected server error."
    }, 400);
  }
}

function parseTags(value) {
  try {
    const tags = JSON.parse(value || "[]");
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}
