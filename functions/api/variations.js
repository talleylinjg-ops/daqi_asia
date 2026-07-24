const SITE = "https://daqi.asia";

export async function onRequestGet({ request, env }) {
  const key = env.WC_CONSUMER_KEY;
  const secret = env.WC_CONSUMER_SECRET;

  if (!key || !secret) {
    return json({ error: "Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET." }, 500);
  }

  const incoming = new URL(request.url);
  const productId = incoming.searchParams.get("product_id");
  if (!productId || !/^\d+$/.test(productId)) {
    return json({ error: "Missing product_id." }, 400);
  }

  const target = new URL(`${SITE}/wp-json/wc/v3/products/${productId}/variations`);
  target.searchParams.set("consumer_key", key);
  target.searchParams.set("consumer_secret", secret);
  target.searchParams.set("per_page", "100");

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

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
