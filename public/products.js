// 后端WP域名
const WP_DOMAIN = "https://daqi.asia";
const WP_API_BASE = `${WP_DOMAIN}/wp-json/wc/store`;
const CART_URL = `${WP_DOMAIN}/cart`;
// Nonce专用接口
const NONCE_API = `${WP_DOMAIN}/wp-json/astro/v1/get-wc-nonce`;

// 全局缓存Nonce
let WC_STORE_NONCE = "";

// 第一步：远程获取Store API Nonce
async function fetchWcNonce() {
  try {
    const res = await fetch(NONCE_API, {
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const json = await res.json();
    WC_STORE_NONCE = json.nonce;
    return true;
  } catch (err) {
    console.error("获取Nonce失败，接口请求异常", err);
    return false;
  }
}

// 获取购物车数据
async function getCartData() {
  if (!WC_STORE_NONCE) await fetchWcNonce();
  try {
    const res = await fetch(`${WP_API_BASE}/cart`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-WC-Store-API-Nonce": WC_STORE_NONCE
      }
    });
    const data = await res.json();
    console.log("购物车数据：", data);
    return data;
  } catch (err) {
    console.error("获取购物车失败：", err);
    return null;
  }
}

// 简单商品加购（标准Store API）
async function addToCart(productId, quantity = 1) {
  if (!WC_STORE_NONCE) await fetchWcNonce();
  try {
    const res = await fetch(`${WP_API_BASE}/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-WC-Store-API-Nonce": WC_STORE_NONCE
      },
      body: JSON.stringify({
        id: productId,
        quantity: quantity
      })
    });
    const data = await res.json();
    console.log("加购返回结果：", data);
    return data;
  } catch (err) {
    console.error("加入购物车失败：", err);
    return null;
  }
}

// 获取可变商品全部变体信息（弹窗专用）
async function getProductVariations(productId) {
  if (!WC_STORE_NONCE) await fetchWcNonce();
  try {
    const res = await fetch(`${WP_API_BASE}/products/${productId}/variations`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-WC-Store-API-Nonce": WC_STORE_NONCE
      }
    });
    return await res.json();
  } catch (err) {
    console.error("拉取变体失败", err);
    return [];
  }
}

// 变体商品专用加购函数
async function addVariableToCart(productId, quantity = 1, variationId, attrObj) {
  if (!WC_STORE_NONCE) await fetchWcNonce();
  try {
    const res = await fetch(`${WP_API_BASE}/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-WC-Store-API-Nonce": WC_STORE_NONCE
      },
      body: JSON.stringify({
        id: productId,
        quantity: quantity,
        variation: {
          id: variationId,
          attributes: attrObj
        }
      })
    });
    const data = await res.json();
    console.log("变体商品加购结果：", data);
    return data;
  } catch (err) {
    console.error("变体商品加购失败：", err);
    return null;
  }
}

// 加载商品列表
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 元素');
    return;
  }

  container.innerHTML = '<div class="loading">⏳ 加载商品中...</div>';

  // 先拉取Nonce
  const nonceOk = await fetchWcNonce();
  if (!nonceOk) {
    container.innerHTML = '<p class="error-msg">鉴权令牌获取失败，请刷新页面</p>';
    return;
  }

  try {
    const response = await fetch(`${WP_API_BASE}/products?per_page=20`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-WC-Store-API-Nonce": WC_STORE_NONCE
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;">暂无商品</p>';
      return;
    }

    let html = `
      <style>
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .product-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .product-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          background: #f5f5f5;
        }
        .product-card h3 {
          font-size: 16px;
          margin: 12px 0 8px;
          min-height: 40px;
          overflow: hidden;
          font-weight: 600;
          color: #333;
          line-height: 1.3;
        }
        .product-card .price {
          color: #e44d26;
          font-size: 20px;
          font-weight: bold;
          margin: 8px 0 12px;
        }
        .product-card .add-to-cart {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          font-size: 15px;
          font-weight: 500;
          transition: background 0.2s ease;
          margin-top: auto;
        }
        .product-card .add-to-cart:hover {
          background: #45a049;
        }
        .product-card .add-to-cart:active {
          transform: scale(0.97);
        }
        .loading {
          text-align: center;
          padding: 60px;
          font-size: 18px;
          color: #999;
        }
        .error-msg {
          text-align: center;
          padding: 60px;
          font-size: 16px;
          color: #e74c3c;
        }
      </style>
      <div class="product-grid">
    `;

    products.forEach(product => {
      const imgSrc = product.images && product.images.length > 0
        ? product.images[0].src.replace('http://', 'https://')
        : 'https://via.placeholder.com/300x300/eee/ccc?text=无图片';
      html += `
        <div class="product-card">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" />
          <h3>${product.name}</h3>
          <div class="price">$${product.price}</div>
          <button class="add-to-cart" 
                  data-product-id="${product.id}" 
                  data-product-type="${product.type}"
                  data-product-slug="${product.slug}">加入购物车</button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // 点击事件（当前临时跳转，后续替换弹窗逻辑）
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function() {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        const slug = this.dataset.productSlug;
        const originText = this.textContent;

        this.textContent = "处理中...";
        this.disabled = true;

        if(pType === 'simple'){
          const res = await addToCart(pid,1);
          if(res?.key){
            window.location.href = CART_URL;
          }else{
            console.log(`商品${pid}加购失败`, res);
            this.textContent = originText;
            this.disabled = false;
          }
        }else if(pType === 'variable'){
          // 后续弹窗开发替换此处
          window.location.href = `${WP_DOMAIN}/product/${slug}`;
        }
      });
    });

  } catch (error) {
    console.error('API 请求失败:', error);
    container.innerHTML = `<p class="error-msg">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);