import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../", import.meta.url);
const port = Number(process.env.PORT || 8098);
const site = process.env.WC_SITE || "https://daqi.asia";
const key = process.env.WC_CONSUMER_KEY;
const secret = process.env.WC_CONSUMER_SECRET;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/products") {
      return proxyWooCommerce(response, url, "products");
    }
    if (url.pathname === "/api/categories") {
      return proxyWooCommerce(response, url, "products/categories");
    }

    const pathname = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(root.pathname, safePath);
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch {
    try {
      const body = await readFile(new URL("../index.html", import.meta.url));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(String(error.message || error));
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local preview: http://127.0.0.1:${port}`);
  console.log(key && secret ? "WooCommerce env found; /api routes will proxy." : "WooCommerce env missing; /api routes will return an env error.");
});

async function proxyWooCommerce(response, incoming, endpoint) {
  if (!key || !secret) {
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET." }));
    return;
  }

  const target = new URL(`${site}/wp-json/wc/v3/${endpoint}`);
  target.searchParams.set("consumer_key", key);
  target.searchParams.set("consumer_secret", secret);
  target.searchParams.set("per_page", clamp(incoming.searchParams.get("per_page"), 1, 100, 100));
  target.searchParams.set("page", clamp(incoming.searchParams.get("page"), 1, 9999, 1));

  if (endpoint === "products") {
    target.searchParams.set("status", incoming.searchParams.get("status") || "publish");
  } else {
    target.searchParams.set("hide_empty", incoming.searchParams.get("hide_empty") || "true");
  }

  for (const param of ["search", "category", "slug"]) {
    if (incoming.searchParams.has(param)) {
      target.searchParams.set(param, incoming.searchParams.get(param));
    }
  }

  const apiResponse = await fetch(target, { headers: { accept: "application/json" } });
  const body = await apiResponse.text();
  response.writeHead(apiResponse.status, {
    "content-type": apiResponse.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

function clamp(value, min, max, fallback) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return String(fallback);
  return String(Math.min(max, Math.max(min, Math.trunc(number))));
}
