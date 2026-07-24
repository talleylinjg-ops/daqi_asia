import { writeFile, mkdir, readFile } from "node:fs/promises";

const site = process.env.WC_SITE || "https://daqi.asia";
const key = process.env.WC_CONSUMER_KEY;
const secret = process.env.WC_CONSUMER_SECRET;

if (!key || !secret) {
  console.error("Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET.");
  console.error("Example: WC_CONSUMER_KEY=ck_xxx WC_CONSUMER_SECRET=cs_xxx node tools/sync-woocommerce.mjs");
  process.exit(1);
}

async function getAll(path, perPage = 100) {
  const all = [];
  let page = 1;
  while (true) {
    const url = new URL(`${site}/wp-json/wc/v3/${path}`);
    url.searchParams.set("consumer_key", key);
    url.searchParams.set("consumer_secret", secret);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
    }
    let batch;
    try {
      batch = await response.json();
    } catch (error) {
      throw new Error(`${path} page ${page} returned non-JSON after ${all.length} records: ${String(error.message || error)}`);
    }
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

async function readExisting(file) {
  try {
    return JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
  } catch {
    return [];
  }
}

async function syncOne(label, path, file, perPage = 100) {
  try {
    const items = await getAll(path, perPage);
    await writeFile(new URL(`../data/${file}`, import.meta.url), JSON.stringify(items, null, 2));
    return { label, ok: true, count: items.length, error: "" };
  } catch (error) {
    const existing = await readExisting(file);
    return {
      label,
      ok: false,
      count: existing.length,
      error: String(error.message || error).slice(0, 1800),
    };
  }
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
const results = await Promise.all([
  syncOne("products", "products?status=publish", "products.json", Number(process.env.WC_PRODUCTS_PER_PAGE || 100)),
  syncOne("categories", "products/categories?hide_empty=true", "categories.json", Number(process.env.WC_CATEGORIES_PER_PAGE || 20)),
]);

const status = {
  synced_at: new Date().toISOString(),
  site,
  results,
  note: "If ok is false, the original WordPress/WooCommerce REST API returned an error. Existing local JSON data was kept.",
};

const categoryResult = results.find((result) => result.label === "categories");
if (categoryResult && !categoryResult.ok) {
  const derived = deriveCategoriesFromProducts(await readExisting("products.json"));
  const existingCategories = await readExisting("categories.json");
  if (derived.length > existingCategories.length) {
    await writeFile(new URL("../data/categories.json", import.meta.url), JSON.stringify(derived, null, 2));
    categoryResult.count = derived.length;
    categoryResult.error += `; derived ${derived.length} categories from synced products`;
  }
}

await writeFile(new URL("../data/sync-status.json", import.meta.url), JSON.stringify(status, null, 2));
await writeFile(new URL("../data/products-lite.json", import.meta.url), JSON.stringify(
  makeLiteProducts(await readExisting("products.json")),
));

for (const result of results) {
  if (result.ok) {
    console.log(`Synced ${result.count} ${result.label}.`);
  } else {
    console.error(`Failed to sync ${result.label}; kept ${result.count} existing records.`);
  }
}

if (results.some((result) => !result.ok)) {
  console.error("See data/sync-status.json for details.");
  process.exitCode = 1;
}

function deriveCategoriesFromProducts(products) {
  const byId = new Map();
  for (const product of products) {
    for (const category of product.categories || []) {
      const id = category.id || category.slug || category.name;
      if (!id) continue;
      const current = byId.get(id) || {
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: 0,
      };
      current.count += 1;
      byId.set(id, current);
    }
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
}

function makeLiteProducts(products) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: product.permalink,
    type: product.type,
    status: product.status,
    sku: product.sku,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    on_sale: product.on_sale,
    stock_status: product.stock_status,
    total_sales: product.total_sales,
    rating_count: product.rating_count,
    date_created: product.date_created,
    short_description: product.short_description,
    description: product.description,
    categories: product.categories,
    images: (product.images || []).slice(0, 6).map((image) => ({
      id: image.id,
      src: image.src,
      name: image.name,
      alt: image.alt,
    })),
    attributes: product.attributes,
    default_attributes: product.default_attributes,
    variations: product.variations,
  }));
}
