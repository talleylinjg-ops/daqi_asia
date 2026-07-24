# DAQI Asia English Storefront

This is the DAQI Asia English storefront for Cloudflare Pages. It includes Cloudflare Pages Functions so WooCommerce API keys stay on the server side.

## Included

- Home view
- Shop product grid
- Category view
- Product detail view
- Keyword search view
- Simple category filter and sorting
- Buttons for cart/account/checkout-related actions link back to `https://daqi.asia`

## Not Included

- WordPress admin
- WordPress database restoration
- Login, cart, checkout, payment, orders
- Complex filters
- Manual translation or content rewriting

## Update Product Data

The browser code does not include WooCommerce API keys. In Cloudflare Pages, product data is requested from:

- `/api/products`
- `/api/categories`

These functions read Cloudflare environment variables:

- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`

If the function/API request fails, the frontend falls back to local JSON files:

- `data/products.json`
- `data/categories.json`

After the original WooCommerce REST API is fixed, run:

```bash
WC_CONSUMER_KEY="ck_xxx" WC_CONSUMER_SECRET="cs_xxx" node tools/sync-woocommerce.mjs
```

The current daqi.asia API returned PHP errors during testing, so local catalog data is included for layout verification. The sync script writes `data/sync-status.json` when an API error happens and keeps the existing JSON data.

## Deploy

Upload this folder to Cloudflare Pages. No build command is required.

Set these Cloudflare Pages environment variables before production use:

- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`

## Local Preview

Normal static preview:

```bash
python3 -m http.server 8098 --bind 127.0.0.1
```

Preview with local `/api/products` and `/api/categories` proxy:

```bash
WC_CONSUMER_KEY="ck_xxx" WC_CONSUMER_SECRET="cs_xxx" node tools/local-preview.mjs
```

Open:

```text
http://127.0.0.1:8098
```
