const ORIGINAL_SITE = "https://daqi.asia";

const state = {
  products: [],
  categories: [],
  filtered: [],
  mobileHeroProducts: [],
  mobileHeroIndex: 0,
  mobileHeroTimer: null,
  homePromoProducts: [],
  homePromoIndex: 0,
  homePromoTimer: null,
  touchStartX: 0,
  page: 1,
  perPage: 10,
  sort: "newest",
  pendingAdultHref: "",
  variationCache: new Map(),
};

const $ = (selector) => document.querySelector(selector);
const CART_KEY = "daqiLocalCart";

// Social media icon placeholders for the product detail page.
// Customer can replace "#" with their own share/follow URLs later.
const PRODUCT_MEDIA_LINKS = [
  { label: "Facebook", icon: "f", url: "#" },
  { label: "X", icon: "X", url: "#" },
  { label: "Google", icon: "g+", url: "#" },
  { label: "LinkedIn", icon: "in", url: "#" },
  { label: "VK", icon: "vk", url: "#" },
  { label: "Pinterest", icon: "p", url: "#" },
  { label: "WhatsApp", icon: "wa", url: "#" },
  { label: "Email", icon: "✉", url: "#" },
];

const NAV_CATEGORY_SLUGS = [
  "food",
  "3c-item",
  "fashion",
  "house-item",
  "beauty",
  "health-care",
  "pet-item",
  "sports-outdoor",
  "country-shop",
];

function decodeHtml(value = "") {
  const element = document.createElement("textarea");
  element.innerHTML = value;
  return element.value;
}

function stripHtml(value = "") {
  const element = document.createElement("div");
  element.innerHTML = value;
  return element.textContent || element.innerText || "";
}

function route() {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.replace(/\/index\.html$/, "/");
  const shopCategoryMatch = pathname.match(/\/shop\/product-category\/([^/]+)(?:\/([^/]+))?\/?$/);
  const legacyCategoryMatch = pathname.match(/\/product-category\/([^/]+)\/?$/);
  const categoryMatch = shopCategoryMatch || legacyCategoryMatch;
  const isShopPath = pathname === "/shop/" || pathname.endsWith("/shop/");
  const isCartPath = pathname === "/cart/" || pathname.endsWith("/cart/");
  return {
    view: isCartPath ? "cart" : (categoryMatch ? "category" : (params.get("view") || (isShopPath ? "shop" : "home"))),
    cat: params.get("cat") || params.get("slug") || (categoryMatch ? decodeURIComponent(categoryMatch[1]) : ""),
    q: params.get("q") || "",
    product: params.get("product") || (shopCategoryMatch?.[2] ? decodeURIComponent(shopCategoryMatch[2]) : ""),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "force-cache",
    ...options,
    headers: {
      accept: "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`Invalid JSON list from ${url}`);
  return data;
}

async function fetchStaticFirst(api, staticJson, perPage = 100) {
  try {
    return await fetchJson(staticJson);
  } catch {}

  const all = [];
  for (let page = 1; page <= 50; page += 1) {
    const glue = api.includes("?") ? "&" : "?";
    const data = await fetchJson(`${api}${glue}per_page=${perPage}&page=${page}`, { cache: "default" });
    all.push(...data);
    if (data.length < perPage) break;
  }
  return all;
}

async function loadData() {
  const grid = $("#productGrid");
  if (grid) grid.innerHTML = `<p class="muted">Loading products...</p>`;
  const [products, categories] = await Promise.all([
    fetchStaticFirst("/api/products", "/data/products-lite.json"),
    fetchStaticFirst("/api/categories", "/data/categories.json"),
  ]);
  state.products = products;
  state.categories = categories.map((cat) => ({
    ...cat,
    parent: Number(cat.parent || 0),
    name: decodeHtml(cat.name),
  }));
}

function productImage(product) {
  return product.images?.[0]?.src || "/assets/img/placeholder.png";
}

function numericPrice(product) {
  const raw = product.price || product.sale_price || product.regular_price || "0";
  const value = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function productPrice(product) {
  const value = product.price || product.sale_price || product.regular_price || "";
  return value ? `$${value}` : "Contact";
}

function variationPrice(variation, fallbackProduct = null) {
  const value = variation?.price || variation?.sale_price || variation?.regular_price || "";
  if (value) return `$${value}`;
  return fallbackProduct ? productPrice(fallbackProduct) : "Contact";
}

function numericVariationPrice(variation, fallbackProduct = null) {
  const raw = variation?.price || variation?.sale_price || variation?.regular_price || "";
  const value = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : (fallbackProduct ? numericPrice(fallbackProduct) : 0);
}

function productCategories(product) {
  return (product.categories || []).map((cat) => decodeHtml(cat.name)).join(", ");
}

function originalUrl(product) {
  return product.permalink || `${ORIGINAL_SITE}/product/${product.slug || ""}/`;
}

function originalActionUrl(path, product, quantity = 1) {
  const target = new URL(path, ORIGINAL_SITE);
  target.searchParams.set("add-to-cart", String(product.id || ""));
  target.searchParams.set("quantity", String(Math.max(1, quantity)));
  return target.toString();
}

function originalCartUrl(product, quantity = 1) {
  return originalActionUrl("/cart/", product, quantity);
}

function originalCheckoutUrl(product, quantity = 1) {
  return originalActionUrl("/checkout/", product, quantity);
}

function attributeFieldName(attribute) {
  const slug = attribute.slug || String(attribute.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `attribute_${slug}`;
}

function variationAttributes(product) {
  return (product.attributes || []).filter((attribute) => attribute.variation && (attribute.options || []).length);
}

function selectedVariationAttributes(detail, product) {
  const values = {};
  for (const attribute of variationAttributes(product)) {
    const field = attributeFieldName(attribute);
    const value = detail.querySelector(`[data-variation-field="${field}"]`)?.value || "";
    if (!value) return null;
    values[field] = value;
  }
  return values;
}

function normalizedOption(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "-");
}

async function fetchProductVariations(product) {
  const productId = String(product.id || "");
  if (!productId) return [];
  if (state.variationCache.has(productId)) return state.variationCache.get(productId);
  const variations = await fetchJson(`/api/variations?product_id=${encodeURIComponent(productId)}`, { cache: "default" });
  state.variationCache.set(productId, variations);
  return variations;
}

async function matchedVariation(product, selected) {
  if (product.type !== "variable") return null;
  const variations = await fetchProductVariations(product);
  if (!variations.length) return null;
  return variations.find((variation) => {
    return variationAttributes(product).every((productAttribute) => {
      const field = attributeFieldName(productAttribute);
      const selectedValue = selected[field];
      const variationAttribute = (variation.attributes || []).find((attribute) => {
        const left = String(attribute.slug || attribute.name || "").toLowerCase();
        const rightSlug = String(productAttribute.slug || "").toLowerCase();
        const rightName = String(productAttribute.name || "").toLowerCase();
        return left === rightSlug || left === rightName || attribute.id === productAttribute.id;
      });
      return normalizedOption(variationAttribute?.option) === normalizedOption(selectedValue);
    });
  }) || null;
}

function submitOriginalCartAction(path, product, quantity = 1, variation = null, selected = {}, targetName = "daqi_checkout") {
  const productId = String(product.id || "");
  const variationId = String(variation?.id || "");
  if (!productId) {
    window.open(originalUrl(product), "_blank", "noopener");
    return;
  }

  const form = document.createElement("form");
  form.method = "post";
  form.action = new URL(path, ORIGINAL_SITE).toString();
  form.target = targetName;
  form.style.display = "none";

  const fields = {
    "add-to-cart": productId,
    product_id: productId,
    quantity: String(Math.max(1, quantity)),
    ...(variationId ? { variation_id: variationId } : {}),
    ...selected,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readCart() {
  try {
    const items = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadges();
}

function cartItemKey(product, selected = {}, variation = null) {
  return [
    product.id || product.slug || "product",
    variation?.id || "",
    ...Object.entries(selected).sort().map(([key, value]) => `${key}:${value}`),
  ].join("|");
}

function addLocalCartItem(product, quantity = 1, variation = null, selected = {}) {
  const items = readCart();
  const key = cartItemKey(product, selected, variation);
  const existing = items.find((item) => item.key === key);
  if (existing) {
    existing.quantity += Math.max(1, quantity);
  } else {
    items.push({
      key,
      productId: product.id,
      variationId: variation?.id || "",
      name: decodeHtml(product.name || "Product"),
      slug: product.slug || "",
      image: productImage(product),
      price: variation ? variationPrice(variation, product) : productPrice(product),
      numericPrice: variation ? numericVariationPrice(variation, product) : numericPrice(product),
      quantity: Math.max(1, quantity),
      selected,
      originalUrl: originalUrl(product),
    });
  }
  writeCart(items);
}

async function checkoutLocalCart(items) {
  if (!items.length) return;
  if (items.length === 1) {
    await submitStoredCartItem("/checkout/", items[0], "_self");
    return;
  }
  const targetName = "daqi_checkout";
  window.open("about:blank", targetName);
  // Multi-item sync depends on the original WooCommerce session accepting cross-site cart writes.
  for (const item of items) {
    await submitStoredCartItem("/checkout/", item, targetName);
    await sleep(1500);
  }
  await sleep(1200);
  window.open(`${ORIGINAL_SITE}/checkout/`, targetName);
}

function updateCartBadges() {
  const total = readCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  document.querySelectorAll(".cart-action b, .cart-badge").forEach((badge) => {
    badge.textContent = String(total);
  });
}

function primaryCategorySlug(product) {
  return product.categories?.[0]?.slug || "product";
}

function localProductUrl(product) {
  const current = route();
  const currentCat = current.cat && (product.categories || []).some((cat) => cat.slug === current.cat) ? current.cat : "";
  return `/shop/product-category/${encodeURIComponent(currentCat || primaryCategorySlug(product))}/${encodeURIComponent(product.slug || product.id)}/`;
}

function categoryGroupSlug(slug = "") {
  const cat = state.categories.find((item) => item.slug === slug || String(item.id) === slug);
  const text = `${slug} ${cat?.name || ""}`.toLowerCase();
  if (/food|rice|noodle|seafood|meat|fruit|vegetable|cereal|seasoning|snack|drink/.test(text)) return "food";
  if (/3c|pc|laptop|computer|phone|audio|video|camera|controller|electronics|digital/.test(text)) return "3c-item";
  if (/fashion|lady|man|bag|shoe|dress|skirt|tshirt|shirt|clothing|handbag/.test(text)) return "fashion";
  if (/house|home|kitchen|furniture|appliance|storage|garden|bathroom|bedroom/.test(text)) return "house-item";
  if (/beauty|makeup|skin|hair|cosmetic/.test(text)) return "beauty";
  if (/health|care|grooming|wellness|medical|personal/.test(text)) return "health-care";
  if (/pet|dog|cat|animal/.test(text)) return "pet-item";
  if (/sport|outdoor|bike|motor|travel|fitness|camping/.test(text)) return "sports-outdoor";
  if (/country|uae|global|overseas/.test(text)) return "country-shop";
  return slug;
}

function isOnSale(product) {
  return Boolean(product.on_sale || (product.sale_price && product.regular_price && product.sale_price !== product.regular_price));
}

function isPhysicalProduct(product) {
  const cats = productCategories(product).toLowerCase();
  const text = `${product.name || ""} ${cats}`.toLowerCase();
  return !/token|virtual|ai skill|prompt|business service|law/.test(text);
}

function isAllowedSensitiveProduct(product) {
  const text = [
    product.name,
    product.slug,
    productCategories(product),
    stripHtml(product.short_description),
  ].join(" ").toLowerCase();
  return /condom|lubricant|lubricating|lube|massage oil/.test(text);
}

function isAdultCategory(cat = {}) {
  const text = `${cat.name || ""} ${cat.slug || ""}`.toLowerCase();
  return /adult product|sex toy|adult-product|sex-toy/.test(text);
}

function isAdultProduct(product) {
  return (product.categories || []).some(isAdultCategory);
}

function hasAdultAccess() {
  return window.sessionStorage.getItem("daqiAdultAccess") === "yes";
}

function isSafeDisplayProduct(product) {
  const text = [
    product.name,
    product.slug,
    productCategories(product),
    stripHtml(product.short_description),
  ].join(" ").toLowerCase();

  if (!isPhysicalProduct(product)) return false;
  if (isAllowedSensitiveProduct(product)) return true;

  return !/adult product|sex toy|sex doll|dildo|vibrator|masturbat|penis sleeve|butt plug|anal|vaginal|puzzy|boobs|glans|strap belt|couple ring|erotic|self-defense comfort/.test(text);
}

function categoryProductCount(cat) {
  const allowedSlugs = categoryDescendantSlugs(cat.slug);
  return state.products.filter((product) => {
    const inCategory = (product.categories || []).some((item) => allowedSlugs.has(item.slug) || item.slug === cat.slug);
    if (!inCategory || !isPhysicalProduct(product)) return false;
    return isAdultCategory(cat) ? true : isSafeDisplayProduct(product);
  }).length;
}

function productCountForCategorySlugs(slugs, allowAdult = false) {
  const wanted = new Set(slugs.filter(Boolean));
  return state.products.filter((product) => {
    const inCategory = (product.categories || []).some((item) => wanted.has(item.slug));
    if (!inCategory || !isPhysicalProduct(product)) return false;
    return allowAdult ? true : isSafeDisplayProduct(product);
  }).length;
}

function card(product, index = 0) {
  const onSale = isOnSale(product);
  const detailUrl = localProductUrl(product);
  return `
    <article class="product-card" data-card-detail="${detailUrl}" tabindex="0" role="link" aria-label="View ${decodeHtml(product.name || "product")} details" style="--card-delay:${Math.min(index, 20) * 18}ms">
      ${onSale ? '<span class="badge">Sale</span>' : ""}
      <a class="thumb" href="${detailUrl}" target="_blank" rel="noopener"><img src="${productImage(product)}" alt="${decodeHtml(product.name || "Product")}" loading="lazy" decoding="async"></a>
      <div class="product-body">
        <p class="cat">${productCategories(product) || "Daqi Product"}</p>
        <a class="name" href="${detailUrl}" target="_blank" rel="noopener">${decodeHtml(product.name || "Product")}</a>
        <div class="rating">★★★★★ <span class="count">(${product.rating_count || 0})</span></div>
        <div class="price">${onSale && product.regular_price ? `<del>$${product.regular_price}</del>` : ""}${productPrice(product)}</div>
      </div>
    </article>
  `;
}

function categoryLink(cat, className = "cat-item") {
  return `<a class="${className}" href="/shop/product-category/${encodeURIComponent(cat.slug)}/"><span>${cat.name}</span></a>`;
}

function safeCategoryCount(slug) {
  return state.products.filter((product) => isSafeDisplayProduct(product) && (product.categories || []).some((cat) => cat.slug === slug)).length;
}

function categoryIcon(name = "") {
  const text = name.toLowerCase();
  if (text.includes("pet") || text.includes("dog") || text.includes("cat")) return "Pet";
  if (text.includes("fashion") || text.includes("bag")) return "Fashion";
  if (text.includes("health") || text.includes("beauty")) return "Care";
  if (text.includes("house") || text.includes("home")) return "Home";
  if (text.includes("sport")) return "Sport";
  if (text.includes("food")) return "Food";
  if (text.includes("uae") || text.includes("country")) return "Global";
  return "Shop";
}

const CATEGORY_GROUPS = [
  { slug: "food", name: "Food" },
  { slug: "3c-item", name: "3C Item" },
  { slug: "fashion", name: "Fashion" },
  { slug: "house-item", name: "House Item" },
  { slug: "beauty", name: "Beauty" },
  { slug: "health-care", name: "Health & Care" },
  { slug: "pet-item", name: "Pet Item" },
  { slug: "sports-outdoor", name: "Sports & Outdoor" },
  { slug: "country-shop", name: "Country Shop" },
];

function sidebarCategoryGroups(cats) {
  const byGroup = new Map(CATEGORY_GROUPS.map((group) => [group.slug, { ...group, children: [] }]));
  const other = { slug: "other", name: "Other Categories", children: [] };

  cats.forEach((cat) => {
    const groupSlug = categoryGroupSlug(cat.slug);
    const group = byGroup.get(groupSlug);
    if (group && cat.slug !== group.slug) {
      group.children.push(cat);
    } else if (!group) {
      other.children.push(cat);
    }
  });

  const groups = [...byGroup.values()].filter((group) => {
    const self = cats.find((cat) => cat.slug === group.slug);
    const groupSlugs = cats
      .filter((cat) => cat.slug === group.slug || categoryGroupSlug(cat.slug) === group.slug)
      .map((cat) => cat.slug);
    group.count = productCountForCategorySlugs(groupSlugs, groupSlugs.some((slug) => isAdultCategory(cats.find((cat) => cat.slug === slug))));
    return self || group.children.length;
  });
  if (other.children.length) {
    const otherSlugs = other.children.map((cat) => cat.slug);
    other.count = productCountForCategorySlugs(otherSlugs, other.children.some(isAdultCategory));
    groups.push(other);
  }
  return groups;
}

function hasRealCategoryTree(cats = state.categories) {
  return cats.some((cat) => Object.prototype.hasOwnProperty.call(cat, "parent") && Number(cat.parent) > 0);
}

function categoryTree(cats) {
  const byId = new Map(cats.map((cat) => [String(cat.id), { cat, children: [] }]));
  const roots = [];

  cats.forEach((cat) => {
    const node = byId.get(String(cat.id));
    const parentId = String(cat.parent || "");
    if (parentId && parentId !== "0" && byId.has(parentId)) {
      byId.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function categoryDescendantSlugs(slug) {
  const selected = state.categories.find((cat) => cat.slug === slug || String(cat.id) === slug);
  const slugs = new Set([slug]);
  if (!selected || !hasRealCategoryTree()) return slugs;

  const childrenByParent = new Map();
  state.categories.forEach((cat) => {
    const parentId = String(cat.parent || "");
    if (!parentId || parentId === "0") return;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(cat);
  });

  const visit = (cat) => {
    slugs.add(cat.slug);
    (childrenByParent.get(String(cat.id)) || []).forEach(visit);
  };
  visit(selected);
  return slugs;
}

function treeContainsSlug(node, slug) {
  return node.cat.slug === slug || node.children.some((child) => treeContainsSlug(child, slug));
}

function renderSidebarTreeNode(node, current, level = 0) {
  const cat = node.cat;
  const hasChildren = node.children.length > 0;
  const isCurrent = current.cat === cat.slug;
  const isOpen = hasChildren && (isCurrent || node.children.some((child) => treeContainsSlug(child, current.cat)));
  const childHtml = node.children.map((child) => renderSidebarTreeNode(child, current, level + 1)).join("");

  return `
    <div class="shop-sidebar-group ${isOpen ? "open" : ""} ${isCurrent ? "active" : ""}" data-sidebar-group="${cat.slug}" style="--sidebar-level:${level}">
      <div class="shop-sidebar-parent">
        <a class="shop-sidebar-parent-link ${isCurrent ? "active" : ""}" href="/shop/product-category/${encodeURIComponent(cat.slug)}/" ${isAdultCategory(cat) ? 'data-adult-category="true"' : ""}>
          <span>${cat.name}</span>
        </a>
        ${hasChildren ? `<button class="shop-sidebar-toggle" type="button" aria-label="Toggle ${cat.name}" aria-expanded="${isOpen ? "true" : "false"}">‹</button>` : ""}
      </div>
      ${hasChildren ? `<div class="shop-sidebar-children">${childHtml}</div>` : ""}
    </div>
  `;
}

function sortedCategoryNodes(nodes) {
  const rank = new Map(NAV_CATEGORY_SLUGS.map((slug, index) => [slug, index]));
  return [...nodes].sort((a, b) => {
    const aRank = rank.has(a.cat.slug) ? rank.get(a.cat.slug) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.cat.slug) ? rank.get(b.cat.slug) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.cat.name.localeCompare(b.cat.name);
  });
}

function renderMobileDrawerTreeNode(node, current, level = 0) {
  const cat = node.cat;
  const children = sortedCategoryNodes(node.children);
  const hasChildren = children.length > 0;
  const isCurrent = current.cat === cat.slug;
  const isOpen = hasChildren && (isCurrent || children.some((child) => treeContainsSlug(child, current.cat)));
  const childHtml = children.map((child) => renderMobileDrawerTreeNode(child, current, level + 1)).join("");

  return `
    <div class="mobile-category-node ${isOpen ? "open" : ""} ${isCurrent ? "active" : ""}" style="--mobile-cat-level:${level}">
      <div class="mobile-category-row">
        <a class="mobile-category-link" href="/shop/product-category/${encodeURIComponent(cat.slug)}/" ${isAdultCategory(cat) ? 'data-adult-category="true"' : ""}>${cat.name}</a>
        ${hasChildren ? `<button class="mobile-category-toggle" type="button" aria-label="Toggle ${cat.name}" aria-expanded="${isOpen ? "true" : "false"}">${isOpen ? "−" : "+"}</button>` : ""}
      </div>
      ${hasChildren ? `<div class="mobile-category-children">${childHtml}</div>` : ""}
    </div>
  `;
}

function renderMobileDrawerGroup(group, current) {
  const isOpen = current.cat ? categoryGroupSlug(current.cat) === group.slug : false;
  const childHtml = group.children.map((cat) => `
    <div class="mobile-category-node ${current.cat === cat.slug ? "active" : ""}" style="--mobile-cat-level:1">
      <div class="mobile-category-row">
        <a class="mobile-category-link" href="/shop/product-category/${encodeURIComponent(cat.slug)}/" ${isAdultCategory(cat) ? 'data-adult-category="true"' : ""}>${cat.name}</a>
      </div>
    </div>
  `).join("");

  return `
    <div class="mobile-category-node ${isOpen ? "open" : ""}" style="--mobile-cat-level:0">
      <div class="mobile-category-row">
        <a class="mobile-category-link" href="${group.slug === "other" ? "/shop/" : `/shop/product-category/${encodeURIComponent(group.slug)}/`}">${group.name}</a>
        ${group.children.length ? `<button class="mobile-category-toggle" type="button" aria-label="Toggle ${group.name}" aria-expanded="${isOpen ? "true" : "false"}">${isOpen ? "−" : "+"}</button>` : ""}
      </div>
      ${group.children.length ? `<div class="mobile-category-children">${childHtml}</div>` : ""}
    </div>
  `;
}

function renderSidebarGroup(group, current) {
  const isOpen = group.slug === "other" ? false : (current.cat ? categoryGroupSlug(current.cat) === group.slug : false);
  const isActive = Boolean(current.cat && categoryGroupSlug(current.cat) === group.slug);
  const parentHref = group.slug === "other" ? "/shop/" : `/shop/product-category/${encodeURIComponent(group.slug)}/`;
  const childHtml = group.children.map((cat) => `
    <a class="shop-sidebar-child ${current.cat === cat.slug ? "active" : ""}" href="/shop/product-category/${encodeURIComponent(cat.slug)}/" ${isAdultCategory(cat) ? 'data-adult-category="true"' : ""}>
      <span>${cat.name}</span>
    </a>
  `).join("");

  return `
    <div class="shop-sidebar-group ${isOpen ? "open" : ""} ${isActive ? "active" : ""}" data-sidebar-group="${group.slug}">
      <div class="shop-sidebar-parent">
        <a class="shop-sidebar-parent-link ${current.cat && categoryGroupSlug(current.cat) === group.slug ? "active" : ""}" href="${parentHref}">
          <span>${group.name}</span>
        </a>
        ${group.children.length ? `<button class="shop-sidebar-toggle" type="button" aria-label="Toggle ${group.name}" aria-expanded="${isOpen ? "true" : "false"}">‹</button>` : ""}
      </div>
      ${group.children.length ? `<div class="shop-sidebar-children">${childHtml}</div>` : ""}
    </div>
  `;
}

function homeCategoryList() {
  const priority = [
    "pet-item",
    "dog",
    "cat",
    "ladys-fashion",
    "fashion",
    "health-care",
    "house-item",
    "sports-outdoor",
    "food",
    "beauty",
    "country-shop",
    "uae-shop",
  ];
  const safeCategories = state.categories
    .map((cat) => ({ ...cat, count: safeCategoryCount(cat.slug) }))
    .filter((cat) => cat.count !== 0 && !/adult product|sex toy/i.test(cat.name));
  const bySlug = new Map(safeCategories.map((cat) => [cat.slug, cat]));
  const selected = priority.map((slug) => bySlug.get(slug)).filter(Boolean);
  const selectedSlugs = new Set(selected.map((cat) => cat.slug));
  const fallback = safeCategories.filter((cat) => !selectedSlugs.has(cat.slug)).slice(0, 12 - selected.length);
  return [...selected, ...fallback].slice(0, 12);
}

function renderCategories() {
  const allCats = state.categories
    .map((cat) => ({ ...cat, count: categoryProductCount(cat) }))
    .filter((cat) => cat.count !== 0);
  const safeCats = allCats.filter((cat) => !/adult product|sex toy/i.test(cat.name));
  const homeCats = safeCats.slice(0, 12);
  const sidebarCats = [...safeCats, ...allCats.filter((cat) => isAdultCategory(cat))];
  const sidebar = $("#catSidebar");
  const featured = $("#featuredCategoryGrid");
  const shopSidebar = $("#shopSidebar");
  const mobileDrawerCategories = $("#mobileDrawerCategories");

  if (sidebar) {
    sidebar.innerHTML = `<div class="panel-title">Categories</div>${homeCats.slice(0, 10).map((cat) => categoryLink(cat)).join("")}`;
  }

  if (featured) {
    featured.innerHTML = homeCategoryList().map((cat) => `
      <a class="category-tile" href="/shop/product-category/${encodeURIComponent(cat.slug)}/">
        <span class="category-icon">${categoryIcon(cat.name)}</span>
        <strong>${cat.name}</strong>
      </a>
    `).join("");
  }

  if (shopSidebar) {
    const current = route();
    shopSidebar.innerHTML = hasRealCategoryTree(sidebarCats)
      ? categoryTree(sidebarCats).map((node) => renderSidebarTreeNode(node, current)).join("")
      : sidebarCategoryGroups(sidebarCats).map((group) => renderSidebarGroup(group, current)).join("");
  }

  if (mobileDrawerCategories) {
    const current = route();
    mobileDrawerCategories.innerHTML = hasRealCategoryTree(sidebarCats)
      ? sortedCategoryNodes(categoryTree(sidebarCats)).map((node) => renderMobileDrawerTreeNode(node, current)).join("")
      : sidebarCategoryGroups(sidebarCats).map((group) => renderMobileDrawerGroup(group, current)).join("");
  }
}

function renderHeroProducts() {
  const wrap = $("#heroProducts");
  if (!wrap) return;
  const preferredIds = [5224, 8834, 60, 99, 16699, 16695, 93, 47];
  const byId = new Map(state.products.map((product) => [product.id, product]));
  const preferred = preferredIds.map((id) => byId.get(id)).filter((product) => product?.images?.[0]?.src);
  const fallback = state.products.filter((product) => product.images?.[0]?.src && isPhysicalProduct(product));
  const products = [...preferred, ...fallback].slice(0, 3);
  wrap.innerHTML = products.map((product) => `
    <a class="hero-product" href="/shop/">
      <img src="${productImage(product)}" alt="${decodeHtml(product.name || "Product")}" loading="lazy" decoding="async">
    </a>
  `).join("");
}

function updatePageChrome() {
  const current = route();
  const isHome = current.view === "home" && !current.cat && !current.q;
  const isShop = current.view === "shop" && !current.cat && !current.q;
  const isCart = current.view === "cart";
  const isProduct = Boolean(current.product);
  const grid = $("#productGrid");
  grid?.classList.remove("shop-curated");
  const isCategory = Boolean(current.cat);
  const mainCatalog = $("#mainCatalogSection");
  const productDetail = $("#productDetailPage");
  const cartPage = $("#cartPage");
  const deals = $("#dealsSection");
  const categories = $("#featured-categories");
  const hero = document.querySelector(".hero");
  const service = document.querySelector(".service-row");
  const footer = document.querySelector(".site-footer");

  document.body.dataset.page = isProduct ? "product" : (isCategory ? "category" : current.view);
  if (mainCatalog) mainCatalog.hidden = isHome || isProduct || isCart;
  if (productDetail) productDetail.hidden = !isProduct;
  if (cartPage) cartPage.hidden = !isCart;
  if (deals) deals.hidden = !isHome;
  if (categories) categories.hidden = !isHome;
  if (hero) hero.hidden = !isHome;
  if (service) service.hidden = !isHome;
  if (footer) footer.hidden = !isHome;

  document.querySelectorAll(".mobile-bottom-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === "/" && isHome);
  });
  $("#mobileCategoryBtn")?.classList.toggle("active", isShop || isCategory);
  $("#mobileSearchBtn")?.classList.toggle("active", Boolean(current.q));
  $("#mobileCartBtn")?.classList.toggle("active", isCart);
  document.querySelectorAll("[data-nav-category]").forEach((link) => {
    link.classList.toggle("active", categoryGroupSlug(current.cat) === link.dataset.navCategory);
  });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function salePrice(product) {
  return product.sale_price || product.price || product.regular_price || "";
}

function discountLabel(product) {
  const regular = Number.parseFloat(product.regular_price || "0");
  const sale = Number.parseFloat(product.sale_price || product.price || "0");
  if (regular > sale && sale > 0) {
    return `${Math.max(1, Math.round((1 - sale / regular) * 100))}% Off`;
  }
  return productPrice(product);
}

function renderCategorySearchMenu() {
  const selects = [$("#categorySearchSelect"), $("#mobileCategorySearchSelect")].filter(Boolean);
  if (!selects.length) return;
  const bySlug = new Map(state.categories.map((cat) => [cat.slug, cat]));
  const cats = NAV_CATEGORY_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean);
  const options = `<option value="">All</option>${cats.map((cat) => `<option value="${cat.slug}">${cat.name}</option>`).join("")}`;
  selects.forEach((select) => {
    select.innerHTML = options;
  });
}

function homePromoTitle(product) {
  const group = categoryGroupSlug(product.categories?.[0]?.slug || "");
  const titles = {
    "food": "Fresh picks for daily meals",
    "3c-item": "Smart gadgets at sharp prices",
    "fashion": "Sale up to",
    "house-item": "Useful home goods",
    "beauty": "Beauty deals today",
    "health-care": "Care essentials",
    "pet-item": "Pet items with great prices",
    "sports-outdoor": "Outdoor gear deals",
    "country-shop": "Global goods selected",
  };
  return titles[group] || "Sale up to";
}

function goHomePromo(index) {
  const track = $("#homePromoTrack");
  const dots = $("#homePromoDots");
  if (!track || !state.homePromoProducts.length) return;
  const total = state.homePromoProducts.length;
  state.homePromoIndex = (index + total) % total;
  track.style.transform = `translateX(-${state.homePromoIndex * 100}%)`;
  dots?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === state.homePromoIndex);
  });
}

function startHomePromoTimer() {
  window.clearInterval(state.homePromoTimer);
  if (state.homePromoProducts.length <= 1) return;
  state.homePromoTimer = window.setInterval(() => {
    goHomePromo(state.homePromoIndex + 1);
  }, 4500);
}

function renderHomePromos() {
  const track = $("#homePromoTrack");
  const dots = $("#homePromoDots");
  const side = $("#homeSidePromo");
  if (!track || !dots || !side) return;

  const source = state.products
    .filter((product) => isSafeDisplayProduct(product) && product.images?.[0]?.src)
    .sort((a, b) => productScore(b) - productScore(a));
  state.homePromoProducts = source.slice(0, 5);

  track.innerHTML = state.homePromoProducts.map((product) => `
    <a class="home-slide" href="${localProductUrl(product)}" target="_blank" rel="noopener">
      <div class="home-slide-copy">
        <small>${homePromoTitle(product)}</small>
        <h2>${discountLabel(product)}</h2>
        <span class="shop-now">Shop Now</span>
      </div>
      <div class="home-slide-image">
        <img src="${productImage(product)}" alt="${decodeHtml(product.name || "Product")}" loading="lazy" decoding="async">
      </div>
    </a>
  `).join("");

  dots.innerHTML = state.homePromoProducts.map((_, index) => `
    <button type="button" class="${index === 0 ? "active" : ""}" data-home-slide="${index}" aria-label="Go to promotion ${index + 1}"></button>
  `).join("");

  dots.querySelectorAll("[data-home-slide]").forEach((dot) => {
    dot.addEventListener("click", () => {
      goHomePromo(Number(dot.dataset.homeSlide));
      startHomePromoTimer();
    });
  });

  const sideProduct = source.find((product) => categoryGroupSlug(product.categories?.[0]?.slug || "") === "fashion") || source[5] || source[0];
  if (sideProduct) {
    const image = side.querySelector("img");
    side.href = localProductUrl(sideProduct);
    side.target = "_blank";
    side.rel = "noopener";
    if (image) {
      image.src = productImage(sideProduct);
      image.alt = decodeHtml(sideProduct.name || "Featured Daqi product");
    }
    side.querySelector("span").textContent = `Starting at ${productPrice(sideProduct)}`;
  }

  goHomePromo(0);
  startHomePromoTimer();
}

function mobileHeroTitle(product) {
  const cats = (product.categories || []).map((cat) => decodeHtml(cat.name));
  const preferred = cats.find((cat) => /pet|dog|cat|fashion|house|health|beauty|sport|food/i.test(cat)) || cats[0] || "Daqi Items";
  return `Amazing prices with ${preferred}`;
}

function goMobileHero(index) {
  const track = $("#mobileHeroTrack");
  const dots = $("#mobileHeroDots");
  if (!track || !state.mobileHeroProducts.length) return;
  const total = state.mobileHeroProducts.length;
  state.mobileHeroIndex = (index + total) % total;
  track.style.transform = `translateX(-${state.mobileHeroIndex * 100}%)`;
  dots?.querySelectorAll("button").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === state.mobileHeroIndex);
  });
}

function startMobileHeroTimer() {
  window.clearInterval(state.mobileHeroTimer);
  if (state.mobileHeroProducts.length <= 1) return;
  state.mobileHeroTimer = window.setInterval(() => {
    goMobileHero(state.mobileHeroIndex + 1);
  }, 4000);
}

function renderMobileHero() {
  const wrapper = $("#mobileHomeHero");
  const track = $("#mobileHeroTrack");
  const dots = $("#mobileHeroDots");
  const current = route();
  if (!wrapper || !track || !dots) return;

  wrapper.hidden = true;
  return;

  const saleProducts = state.products.filter((product) => isOnSale(product) && product.images?.[0]?.src);
  const fallbackProducts = state.products.filter((product) => isPhysicalProduct(product) && product.images?.[0]?.src);
  state.mobileHeroProducts = shuffle(saleProducts.length >= 5 ? saleProducts : fallbackProducts).slice(0, 5);
  wrapper.hidden = !state.mobileHeroProducts.length;

  track.innerHTML = state.mobileHeroProducts.map((product) => {
    const currentPrice = salePrice(product);
    const regular = product.regular_price && product.regular_price !== currentPrice ? product.regular_price : "";
    return `
      <a class="mobile-slide" href="/shop/">
        <div class="mobile-slide-copy">
          <h2>${mobileHeroTitle(product)}</h2>
          <div class="mobile-slide-price">
            ${currentPrice ? `<strong>$${currentPrice}</strong>` : "<strong>Shop Now</strong>"}
            ${regular ? `<del>$${regular}</del>` : ""}
          </div>
          <span class="mobile-slide-button">Shop Now</span>
        </div>
        <div class="mobile-slide-image">
          <img src="${productImage(product)}" alt="${decodeHtml(product.name || "Product")}" loading="lazy" decoding="async">
        </div>
      </a>
    `;
  }).join("");

  dots.innerHTML = state.mobileHeroProducts.map((_, index) => `
    <button type="button" class="${index === 0 ? "active" : ""}" data-mobile-slide="${index}" aria-label="Go to slide ${index + 1}"></button>
  `).join("");

  dots.querySelectorAll("[data-mobile-slide]").forEach((dot) => {
    dot.addEventListener("click", () => {
      goMobileHero(Number(dot.dataset.mobileSlide));
      startMobileHeroTimer();
    });
  });

  track.addEventListener("touchstart", (event) => {
    state.touchStartX = event.touches[0].clientX;
  }, { passive: true });

  track.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0].clientX;
    const delta = endX - state.touchStartX;
    if (Math.abs(delta) > 40) {
      goMobileHero(state.mobileHeroIndex + (delta < 0 ? 1 : -1));
      startMobileHeroTimer();
    }
  }, { passive: true });

  goMobileHero(0);
  startMobileHeroTimer();
}

function applyRouteFilter() {
  const current = route();
  let products = [...state.products];

  if (current.cat) {
    const selectedGroup = categoryGroupSlug(current.cat);
    const selectedCategorySlugs = categoryDescendantSlugs(current.cat);
    products = products.filter((product) => (product.categories || []).some((cat) => (
      selectedCategorySlugs.has(cat.slug)
      || cat.slug === current.cat
      || String(cat.id) === current.cat
      || (selectedGroup === current.cat && categoryGroupSlug(cat.slug) === selectedGroup)
    )));
  }

  if (current.q) {
    const q = current.q.toLowerCase();
    products = products.filter((product) => [
      product.name,
      product.sku,
      stripHtml(product.short_description),
      stripHtml(product.description),
      productCategories(product),
    ].join(" ").toLowerCase().includes(q));
  }

  if (state.sort === "price-low") products.sort((a, b) => numericPrice(a) - numericPrice(b));
  if (state.sort === "price-high") products.sort((a, b) => numericPrice(b) - numericPrice(a));
  if (state.sort === "sale") products = products.filter(isOnSale);
  if (state.sort === "newest") products.sort((a, b) => new Date(b.date_created || 0) - new Date(a.date_created || 0));

  state.filtered = products;
}

function renderHeading() {
  const current = route();
  const title = $("#mainSectionTitle");
  const kicker = $("#sectionKicker");
  if (!title || !kicker) return;
  kicker.hidden = false;

  if (current.q) {
    kicker.textContent = "Search Results";
    title.textContent = current.q;
    return;
  }

  if (current.cat) {
    const cat = state.categories.find((item) => item.slug === current.cat || String(item.id) === current.cat);
    kicker.hidden = true;
    title.textContent = cat?.name || "Category Products";
    return;
  }

  if (current.view === "shop") {
    kicker.hidden = true;
    title.textContent = "Shop";
    return;
  }

  kicker.textContent = "Selected Products";
  title.textContent = "Featured Products";
}

function renderPagination(total) {
  const pagination = $("#pagination");
  if (!pagination) return;

  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  if (pages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pageItems = (() => {
    if (pages <= 5) return Array.from({ length: pages }, (_, index) => index + 1);
    if (state.page <= 3) return [1, 2, 3, "...", pages];
    if (state.page >= pages - 2) return [Math.max(1, pages - 2), pages - 1, pages];
    return [state.page - 2, state.page - 1, state.page, "...", pages];
  })();

  const goToPage = (page) => {
    state.page = Math.min(Math.max(1, Number(page) || 1), pages);
    renderProductGrid();
    document.querySelector(".catalog-section")?.scrollIntoView({ block: "start" });
  };

  pagination.innerHTML = `
    <button type="button" ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">Prev</button>
    ${pageItems.map((page) => page === "..."
      ? `<span class="pagination-ellipsis" aria-hidden="true">...</span>`
      : `<button type="button" class="${page === state.page ? "active" : ""}" data-page="${page}">${page}</button>`).join("")}
    <button type="button" ${state.page === pages ? "disabled" : ""} data-page="${state.page + 1}">Next</button>
    <form class="pagination-jump" id="paginationJumpForm">
      <input type="number" min="1" max="${pages}" value="${state.page}" aria-label="Go to page">
      <span>/ ${pages} pages</span>
    </form>
  `;

  pagination.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => goToPage(button.dataset.page));
  });

  $("#paginationJumpForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    goToPage(event.currentTarget.querySelector("input")?.value);
  });
}

function selectedLabels(selected = {}) {
  return Object.entries(selected).map(([key, value]) => `${key.replace(/^attribute_/, "").replace(/^pa_/, "").replace(/-/g, " ")}: ${value}`);
}

async function submitStoredCartItem(path, item, targetName = "daqi_checkout") {
  const sourceProduct = state.products.find((product) => String(product.id) === String(item.productId));
  const product = {
    id: item.productId,
    name: item.name,
    slug: item.slug,
    permalink: item.originalUrl,
  };
  let variation = item.variationId ? { id: item.variationId } : null;
  if (!variation && sourceProduct?.type === "variable" && item.selected) {
    try {
      variation = await matchedVariation(sourceProduct, item.selected);
    } catch {
      variation = null;
    }
  }
  submitOriginalCartAction(path, product, item.quantity, variation, item.selected || {}, targetName);
}

function renderLocalCart() {
  const cart = $("#localCart");
  if (!cart) return;
  const items = readCart();
  if (!items.length) {
    cart.innerHTML = `
      <div class="cart-empty">
        <strong>Your cart is currently empty.</strong>
        <a href="/shop/">Return to shop</a>
      </div>
    `;
    updateCartBadges();
    return;
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.numericPrice || 0) * Number(item.quantity || 1), 0);
  cart.innerHTML = `
    <div class="cart-list">
      ${items.map((item, index) => `
        <article class="cart-line">
          <img src="${item.image || "/assets/img/placeholder.png"}" alt="${item.name}" loading="lazy" decoding="async">
          <div>
            <h3>${item.name}</h3>
            ${selectedLabels(item.selected).length ? `<p>${selectedLabels(item.selected).join(" / ")}</p>` : ""}
            <strong>${item.price}</strong>
          </div>
          <div class="cart-line-qty">
            <button type="button" data-cart-minus="${index}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-plus="${index}">+</button>
          </div>
          <button class="cart-remove" type="button" data-cart-remove="${index}">Remove</button>
        </article>
      `).join("")}
    </div>
    <div class="cart-summary">
      <p><span>Subtotal</span><strong>$${subtotal.toFixed(2)}</strong></p>
      <button type="button" data-cart-checkout>Proceed to checkout</button>
      <a href="/shop/">Back to Shop</a>
    </div>
  `;

  cart.querySelectorAll("[data-cart-minus]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = readCart();
      const item = next[Number(button.dataset.cartMinus)];
      if (!item) return;
      item.quantity = Math.max(1, Number(item.quantity || 1) - 1);
      writeCart(next);
      renderLocalCart();
    });
  });
  cart.querySelectorAll("[data-cart-plus]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = readCart();
      const item = next[Number(button.dataset.cartPlus)];
      if (!item) return;
      item.quantity = Number(item.quantity || 1) + 1;
      writeCart(next);
      renderLocalCart();
    });
  });
  cart.querySelectorAll("[data-cart-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = readCart();
      next.splice(Number(button.dataset.cartRemove), 1);
      writeCart(next);
      renderLocalCart();
    });
  });
  cart.querySelector("[data-cart-checkout]")?.addEventListener("click", () => {
    checkoutLocalCart(readCart());
  });
  updateCartBadges();
}

function productScore(product) {
  return Number(isOnSale(product)) * 10000
    + Number(product.total_sales || 0) * 10
    + Number(product.rating_count || 0)
    + numericPrice(product) / 1000;
}

function productsForCategory(slugs, limit = 3) {
  const wanted = new Set(slugs);
  return state.products
    .filter((product) => isSafeDisplayProduct(product))
    .filter((product) => (product.categories || []).some((cat) => wanted.has(cat.slug)))
    .sort((a, b) => productScore(b) - productScore(a))
    .slice(0, limit);
}

function renderShopCollections() {
  const collections = [
    {
      title: "Smart Daily Upgrades",
      tagline: "Selected practical electronics and home helpers for a cleaner everyday routine.",
      slugs: ["consumer-electronics", "home-appliances", "3c-item", "home-improvement"],
    },
    {
      title: "Pet Care Picks",
      tagline: "Small finds for pets and the people who care for them.",
      slugs: ["pet-item", "dog", "cat"],
    },
    {
      title: "Fashion Essentials",
      tagline: "Easy pieces and accessories chosen for everyday styling.",
      slugs: ["ladys-fashion", "fashion", "ladys-bag-box"],
    },
    {
      title: "Home & Lifestyle",
      tagline: "Useful home goods selected for comfort, storage and daily living.",
      slugs: ["house-item", "home-garden", "home-furniture", "kitchenware"],
    },
    {
      title: "Outdoor & Mobility",
      tagline: "A compact selection for commuting, outdoor time and active days.",
      slugs: ["sports-outdoor", "motor-industry", "emotorcycle", "motorcycle"],
    },
    {
      title: "Care & Wellness",
      tagline: "Discreet care products and personal essentials, shown only when suitable for display.",
      slugs: ["health-care", "care-disinfection", "personal-care-appliances"],
    },
  ];

  return collections.map((collection) => {
    const products = productsForCategory(collection.slugs, 3);
    if (!products.length) return "";
    return `
      <section class="curated-row">
        <div class="curated-copy">
          <p class="eyebrow">Curated Picks</p>
          <h3>${collection.title}</h3>
          <p>${collection.tagline}</p>
        </div>
        <div class="product-grid curated-products">
          ${products.map(card).join("")}
        </div>
      </section>
    `;
  }).join("") || `<p class="muted">Curated products are temporarily unavailable.</p>`;
}

function renderProductGrid() {
  const current = route();
  const grid = $("#productGrid");
  const deals = $("#dealsGrid");
  if (!grid) return;

  updatePageChrome();
  if (current.product) {
    renderProductDetail(current.product);
    renderPagination(0);
    return;
  }
  applyRouteFilter();
  renderHeading();

  const isHome = current.view === "home" && !current.cat && !current.q;
  const isShop = current.view === "shop" && !current.cat && !current.q;
  const currentCategory = current.cat ? state.categories.find((item) => item.slug === current.cat || String(item.id) === current.cat) : null;
  const adultRoute = currentCategory && isAdultCategory(currentCategory);
  if (adultRoute && !hasAdultAccess()) {
    grid.innerHTML = "";
    renderPagination(0);
    showAgeGate(window.location.pathname);
    return;
  }

  const renderSource = isHome ? [] : state.filtered.filter((product) => adultRoute ? isPhysicalProduct(product) : isSafeDisplayProduct(product));
  const pages = Math.max(1, Math.ceil(renderSource.length / state.perPage));
  if (!isHome) state.page = Math.min(Math.max(1, state.page), pages);
  const limit = isHome ? 0 : state.perPage;
  const start = isHome ? 0 : (state.page - 1) * state.perPage;
  const visible = renderSource.slice(start, start + limit);

  grid.innerHTML = isHome ? "" : (visible.map((product, index) => card(product, index)).join("") || `<p class="muted">No products found.</p>`);
  renderPagination(isHome ? 0 : renderSource.length);

  if (deals) {
    window.setTimeout(() => {
      const saleProducts = state.products.filter((product) => isOnSale(product) && isSafeDisplayProduct(product));
      const fallbackProducts = [...state.products].filter(isSafeDisplayProduct).sort((a, b) => numericPrice(b) - numericPrice(a));
      deals.innerHTML = (saleProducts.length ? saleProducts : fallbackProducts).slice(0, 8).map(card).join("");
    }, 80);
  }
}

function productImages(product) {
  const images = (product.images || []).map((image) => image.src).filter(Boolean);
  return images.length ? images : ["/assets/img/placeholder.png"];
}

function renderProductDetail(slug) {
  const product = state.products.find((item) => item.slug === slug || String(item.id) === slug);
  const detail = $("#productDetailPage");
  if (!detail) return;

  if (!product) {
    detail.innerHTML = `
      <div class="product-detail-header">
        <h1>Product not found</h1>
      </div>
      <div class="product-detail-rule"></div>
      <p class="muted">This product is temporarily unavailable.</p>
    `;
    return;
  }

  const images = productImages(product);
  const title = decodeHtml(product.name || "Product");
  const categories = (product.categories || []).map((cat) => `
    <a href="/shop/product-category/${encodeURIComponent(cat.slug)}/">${decodeHtml(cat.name)}</a>
  `).join(", ");
  const description = stripHtml(product.short_description || product.description || "Product details are available on the original Daqi store.");
  const variationFields = variationAttributes(product);
  const variationHtml = variationFields.length ? `
    <div class="variation-options">
      ${variationFields.map((attribute) => {
        const field = attributeFieldName(attribute);
        const defaultValue = (product.default_attributes || []).find((item) => item.name === attribute.name || item.id === attribute.id)?.option || "";
        return `
          <label>
            <span>${decodeHtml(attribute.name)}</span>
            <select data-variation-field="${field}">
              <option value="">Choose ${decodeHtml(attribute.name)}</option>
              ${(attribute.options || []).map((option) => `<option value="${decodeHtml(option)}" ${option === defaultValue ? "selected" : ""}>${decodeHtml(option)}</option>`).join("")}
            </select>
          </label>
        `;
      }).join("")}
    </div>
  ` : "";

  detail.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-gallery">
        <div class="product-thumbs">
          ${images.slice(0, 6).map((src, index) => `
            <button type="button" class="${index === 0 ? "active" : ""}" data-detail-image="${src}" aria-label="View product image ${index + 1}">
              <img src="${src}" alt="${title} thumbnail ${index + 1}" loading="lazy" decoding="async">
            </button>
          `).join("")}
        </div>
        <div class="product-main-image">
          <img id="detailMainImage" src="${images[0]}" alt="${title}">
        </div>
      </div>
      <div class="product-detail-info">
        <div class="product-detail-titlebar">
          <h1>${title}</h1>
          <div class="product-media-links" aria-label="Product media links">
            ${PRODUCT_MEDIA_LINKS.map((item) => `<a href="${item.url}" target="_blank" rel="noopener" aria-label="${item.label}">${item.icon}</a>`).join("")}
          </div>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-price">${productPrice(product)}</div>
        <div class="detail-stock">Status: <span class="${product.stock_status === "instock" ? "in-stock" : "out-of-stock"}">${product.stock_status === "instock" ? "In stock" : (product.stock_status || "N/A")}</span></div>
        <div class="detail-divider"></div>
        ${variationHtml}
        <div class="quantity-row">
          <span>Quantity:</span>
          <div class="quantity-control" aria-label="Quantity selector">
            <button type="button" data-qty-minus>-</button>
            <strong id="detailQty">1</strong>
            <button type="button" data-qty-plus>+</button>
          </div>
        </div>
        <div class="detail-actions">
          <a class="detail-cart-btn" data-cart-action href="${originalCartUrl(product)}" target="_blank" rel="noopener">Add to cart</a>
          <a class="detail-book-btn" data-checkout-action href="${originalCheckoutUrl(product)}" target="_blank" rel="noopener">Buy Now</a>
        </div>
        <div class="detail-divider"></div>
        <p class="detail-categories">Categories: ${categories || "Daqi Product"}</p>
        ${product.sku ? `<p class="detail-meta">SKU: ${product.sku}</p>` : ""}
        <div class="detail-description">${description.slice(0, 900)}</div>
      </div>
    </div>
  `;

  detail.querySelectorAll("[data-detail-image]").forEach((button) => {
    button.addEventListener("click", () => {
      detail.querySelectorAll("[data-detail-image]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const image = $("#detailMainImage");
      if (image) image.src = button.dataset.detailImage;
    });
  });

  let qty = 1;
  const setQty = (value) => {
    qty = Math.max(1, value);
    const label = $("#detailQty");
    if (label) label.textContent = String(qty);
    const cartAction = detail.querySelector("[data-cart-action]");
    const checkoutAction = detail.querySelector("[data-checkout-action]");
    if (cartAction) cartAction.href = originalCartUrl(product, qty);
    if (checkoutAction) checkoutAction.href = originalCheckoutUrl(product, qty);
  };
  detail.querySelector("[data-qty-minus]")?.addEventListener("click", () => setQty(qty - 1));
  detail.querySelector("[data-qty-plus]")?.addEventListener("click", () => setQty(qty + 1));
  const readVariationSelection = () => {
    const selected = selectedVariationAttributes(detail, product);
    if (product.type !== "variable") return { selected: {}, variation: null };
    if (!selected) {
      window.alert("Please choose product options first.");
      return null;
    }
    return { selected, variation: null };
  };
  const resolveVariationSelection = async () => {
    const base = readVariationSelection();
    if (!base || product.type !== "variable") return base;
    try {
      const variation = await matchedVariation(product, base.selected);
      if (!variation) {
        return base;
      }
      return { ...base, variation };
    } catch {
      return base;
    }
  };
  const updateVariationPrice = async () => {
    if (product.type !== "variable") return;
    const selected = selectedVariationAttributes(detail, product);
    const priceEl = detail.querySelector(".detail-price");
    const stockEl = detail.querySelector(".detail-stock span");
    if (!selected || !priceEl) return;
    try {
      const variation = await matchedVariation(product, selected);
      if (!variation) return;
      priceEl.textContent = variationPrice(variation, product);
      if (stockEl) {
        const inStock = variation.stock_status ? variation.stock_status === "instock" : true;
        stockEl.textContent = inStock ? "In stock" : (variation.stock_status || "N/A");
        stockEl.classList.toggle("in-stock", inStock);
        stockEl.classList.toggle("out-of-stock", !inStock);
      }
    } catch {
      // Keep the parent product price when variation details are not available.
    }
  };
  detail.querySelectorAll("[data-variation-field]").forEach((select) => {
    select.addEventListener("change", updateVariationPrice);
  });
  updateVariationPrice();

  const submitDetailAction = async (event, path) => {
    event.preventDefault();
    const resolved = await resolveVariationSelection();
    if (!resolved) return;
    submitOriginalCartAction(path, product, qty, resolved.variation, resolved.selected);
  };
  detail.querySelector("[data-cart-action]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    const resolved = await resolveVariationSelection();
    if (!resolved) return;
    addLocalCartItem(product, qty, resolved.variation, resolved.selected);
    window.location.href = "/cart/";
  });
  detail.querySelector("[data-checkout-action]")?.addEventListener("click", (event) => submitDetailAction(event, "/checkout/"));
}

function runSearch(q = $("#headerSearch")?.value.trim() || "", selected = $("#categorySearchSelect")?.value || "") {
  const categoryPath = selected ? `/shop/product-category/${encodeURIComponent(selected)}/` : "/shop/";
  window.location.href = `${categoryPath}?view=search&q=${encodeURIComponent(q)}`;
}

function showAgeGate(targetHref = "/shop/") {
  state.pendingAdultHref = targetHref;
  $("#ageOverlay")?.classList.add("open");
  $("#ageOverlay")?.setAttribute("aria-hidden", "false");
  document.body.classList.add("age-blur");
}

function closeAgeGate() {
  $("#ageOverlay")?.classList.remove("open");
  $("#ageOverlay")?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("age-blur");
}

function bindEvents() {
  $(".notice-close")?.addEventListener("click", () => $(".notice-bar")?.remove());
  $("#searchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });
  $("#mobileSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch($("#mobileSearchInput")?.value.trim() || "", $("#mobileCategorySearchSelect")?.value || "");
  });
  $("#sortSelect")?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.page = 1;
    renderProductGrid();
  });
  $("#perPageSelect")?.addEventListener("change", (event) => {
    state.perPage = Number(event.target.value) || 10;
    state.page = 1;
    renderProductGrid();
  });
  document.querySelector("[data-scroll-categories]")?.addEventListener("click", () => {
    $("#featured-categories")?.scrollIntoView({ block: "start" });
  });
  document.addEventListener("click", (event) => {
    const mobileCategoryToggle = event.target.closest(".mobile-category-toggle");
    if (mobileCategoryToggle) {
      event.preventDefault();
      event.stopPropagation();
      const node = mobileCategoryToggle.closest(".mobile-category-node");
      const isOpen = node?.classList.toggle("open");
      mobileCategoryToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      mobileCategoryToggle.textContent = isOpen ? "−" : "+";
      return;
    }

    const sidebarToggle = event.target.closest(".shop-sidebar-toggle");
    if (sidebarToggle) {
      event.preventDefault();
      const group = sidebarToggle.closest(".shop-sidebar-group");
      const isOpen = group?.classList.toggle("open");
      sidebarToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      return;
    }

    const adultLink = event.target.closest("[data-adult-category]");
    if (adultLink && !hasAdultAccess()) {
      event.preventDefault();
      showAgeGate(adultLink.getAttribute("href") || "/shop/");
      return;
    }

    const cardDetail = event.target.closest("[data-card-detail]");
    if (cardDetail && !event.target.closest("a, button, select, input, textarea")) {
      window.open(cardDetail.dataset.cardDetail, "_blank", "noopener");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const cardDetail = event.target.closest("[data-card-detail]");
    if (!cardDetail) return;
    event.preventDefault();
    window.open(cardDetail.dataset.cardDetail, "_blank", "noopener");
  });
  $("#ageConfirmBtn")?.addEventListener("click", () => {
    window.sessionStorage.setItem("daqiAdultAccess", "yes");
    const target = state.pendingAdultHref || window.location.pathname;
    closeAgeGate();
    if (target !== window.location.pathname) {
      window.location.href = target;
    } else {
      renderCategories();
      renderProductGrid();
    }
  });
  $("#ageExitBtn")?.addEventListener("click", () => {
    closeAgeGate();
    window.location.href = "/shop/";
  });
  $("#openCartBtn")?.addEventListener("click", () => { window.location.href = "/cart/"; });
  $("#mobileHeaderCart")?.addEventListener("click", () => { window.location.href = "/cart/"; });
  const routeKeepsMobileCategoryActive = () => {
    const current = route();
    return (current.view === "shop" && !current.q) || Boolean(current.cat);
  };
  const openMobileDrawer = (mode = "menu") => {
    const drawer = $("#mobileDrawer");
    const overlay = $("#mobileDrawerOverlay");
    const title = drawer?.querySelector(".mobile-drawer-head strong");
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    drawer?.classList.toggle("category-mode", mode === "category");
    overlay?.classList.toggle("category-mode", mode === "category");
    if (title) title.textContent = mode === "category" ? "Main Menu" : "Daqi";
    if (mode === "category") $("#mobileCategoryBtn")?.classList.add("active");
  };
  const closeMobileDrawer = () => {
    const drawer = $("#mobileDrawer");
    const overlay = $("#mobileDrawerOverlay");
    drawer?.classList.remove("open", "category-mode");
    overlay?.classList.remove("open", "category-mode");
    $("#mobileCategoryBtn")?.classList.toggle("active", routeKeepsMobileCategoryActive());
  };
  $("#desktopMenuBtn")?.addEventListener("click", () => {
    openMobileDrawer();
  });
  $("#homeSlidePrev")?.addEventListener("click", () => {
    goHomePromo(state.homePromoIndex - 1);
    startHomePromoTimer();
  });
  $("#homeSlideNext")?.addEventListener("click", () => {
    goHomePromo(state.homePromoIndex + 1);
    startHomePromoTimer();
  });
  $("#mobileDrawerBtn")?.addEventListener("click", () => {
    openMobileDrawer();
  });
  const closeMobileSearch = () => {
    $("#mobileSearchOverlay")?.classList.remove("open");
    $("#mobileSearchOverlay")?.setAttribute("aria-hidden", "true");
  };
  $("#mobileDrawerClose")?.addEventListener("click", closeMobileDrawer);
  $("#mobileDrawerOverlay")?.addEventListener("click", closeMobileDrawer);
  $("#mobileDrawer")?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileDrawer);
  });
  $("#mobileDrawer")?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMobileDrawer();
  });
  $("#mobileCategoryBtn")?.addEventListener("click", () => {
    openMobileDrawer("category");
  });
  $("#mobileCartBtn")?.addEventListener("click", () => { window.location.href = "/cart/"; });
  $("#mobileSearchBtn")?.addEventListener("click", () => {
    $("#mobileSearchOverlay")?.classList.add("open");
    $("#mobileSearchOverlay")?.setAttribute("aria-hidden", "false");
    window.setTimeout(() => $("#mobileSearchInput")?.focus(), 50);
  });
  $("#mobileSearchClose")?.addEventListener("click", closeMobileSearch);
  $("#mobileSearchOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "mobileSearchOverlay") closeMobileSearch();
  });
}

async function init() {
  bindEvents();
  const perPageSelect = $("#perPageSelect");
  if (perPageSelect) perPageSelect.value = String(state.perPage);
  await loadData();
  updateCartBadges();
  renderCategorySearchMenu();
  renderCategories();
  renderHeroProducts();
  renderHomePromos();
  renderMobileHero();
  const current = route();
  renderLocalCart();
  renderProductGrid();
}

init().catch((error) => {
  console.error(error);
  const grid = $("#productGrid");
  if (grid) grid.innerHTML = '<p class="muted">Product data is temporarily unavailable.</p>';
});
