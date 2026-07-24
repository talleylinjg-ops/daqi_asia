const SITE = "https://daqi.asia";

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = env.WC_CONSUMER_KEY;
  const secret = env.WC_CONSUMER_SECRET;

  if (!key || !secret) {
    return Response.json(
      { error: "Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(`${SITE}/wp-json/wc/v3/products/categories`);
  target.searchParams.set("consumer_key", key);
  target.searchParams.set("consumer_secret", secret);
  target.searchParams.set("hide_empty", incoming.searchParams.get("hide_empty") || "true");
  target.searchParams.set("per_page", clamp(incoming.searchParams.get("per_page"), 1, 100, 100));
  target.searchParams.set("page", clamp(incoming.searchParams.get("page"), 1, 9999, 1));

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
    return Response.json(
      { error: String(error.message || error) },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

function clamp(value, min, max, fallback) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return String(fallback);
  return String(Math.min(max, Math.max(min, Math.trunc(number))));
}
