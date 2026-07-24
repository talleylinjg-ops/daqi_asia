const SITE = "https://daqi.asia";

export async function onRequestGet(context) {
  return proxyWooCommerce(context, "products");
}

async function proxyWooCommerce({ request, env }, endpoint) {
  const key = env.WC_CONSUMER_KEY;
  const secret = env.WC_CONSUMER_SECRET;

  if (!key || !secret) {
    return json({ error: "Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET." }, 500);
  }

  const incoming = new URL(request.url);
  const target = new URL(`${SITE}/wp-json/wc/v3/${endpoint}`);
  target.searchParams.set("consumer_key", key);
  target.searchParams.set("consumer_secret", secret);
  target.searchParams.set("status", incoming.searchParams.get("status") || "publish");
  target.searchParams.set("per_page", clamp(incoming.searchParams.get("per_page"), 1, 100, 100));
  target.searchParams.set("page", clamp(incoming.searchParams.get("page"), 1, 9999, 1));

  if (incoming.searchParams.has("search")) {
    target.searchParams.set("search", incoming.searchParams.get("search"));
  }
  if (incoming.searchParams.has("category")) {
    target.searchParams.set("category", incoming.searchParams.get("category"));
  }
  if (incoming.searchParams.has("slug")) {
    target.searchParams.set("slug", incoming.searchParams.get("slug"));
  }

  try {
    const response = await fetch(target, {
      headers: { accept: "application/json" },
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": response.ok ? "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400" : "no-store",
        "access-control-allow-origin": "*",
      },
    });
  } catch (error) {
    return json({ error: String(error.message || error) }, 502);
  }
}

function clamp(value, min, max, fallback) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return String(fallback);
  return String(Math.min(max, Math.max(min, Math.trunc(number))));
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
