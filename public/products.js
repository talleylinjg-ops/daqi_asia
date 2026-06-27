// 【高危警告】consumerKey/Secret 禁止直接写前端！上线请改用后端代理接口中转
// WooCommerce v3 密钥（仅本地调试使用，生产环境后端中转）
const consumerKey = 'ck_8e53e17efba521ed240e3993d522677a3a438862';
const consumerSecret = 'cs_8cbc41d8d8451ecface53ba1c620d5093df9bc4d';
// Store API 购物车接口地址 + 购物车页面跳转链接
const WP_API_BASE = "https://daqi.asia/wp-json/wc/store";
const CART_PAGE_URL = "https://daqi.asia/cart"; // 你的购物车页面地址

// 统一封装Fetch请求，减少重复代码
async function fetchRequest(url, options = {}) {
  const defaultOpt = {
    method: "GET",
    credentials: "same-origin", // 修复原代码credentials非法值问题
    headers: {
      "Content-Type": "application/json"
    }
  };
  const mergeOpt = { ...defaultOpt, ...options };
  try {
    const res = await fetch(url, mergeOpt);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "请求异常");
    return data;
  } catch (err) {
    console.error("接口请求错误：", err);
    return false;
  }
}

// ===================== 购物车相关函数 =====================
// 获取购物车
async function getCartData() {
  return await fetchRequest(`${WP_API_BASE}/cart`);
}

// 简单商品加购
async function addToCart(productId, quantity = 1) {
  return await fetchRequest(`${WP_API_BASE}/cart/items`, {
    method: "POST",
    body: JSON.stringify({
      id: productId,
      quantity: quantity
    })
  });
}

// 变体商品专用函数
async function addVariableToCart(productId, quantity = 1, variationId, attrObj) {
  return await fetchRequest(`${WP_API_BASE}/cart/items`, {
    method: "POST",
    body: JSON.stringify({
      id: productId,
      quantity: quantity,
      variation: variationId,
      attributes: attrObj
    })
  });
}

// ===================== 原有加载商品逻辑 =====================
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 元素');
    return;
  }

  container.innerHTML = '<div class="loading">⏳ 加载商品中...</div>';

  try {
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const siteUrl = 'https://daqi.asia';
    const response = await fetch(`${siteUrl}/wp-json/wc/v3/products?per_page=20`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
      // 兼容无图商品
      const imgSrc = product.images?.length > 0
        ? product.images[0].src
        : 'https://via.placeholder.com/300x300/eee/ccc?text=无图片';
      // 兼容价格为空
      const priceText = product.price ? `$${product.price}` : "暂无定价";
      html += `
        <div class="product-card">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" />
          <h3>${product.name}</h3>
          <div class="price">${priceText}</div>
          <button class="add-to-cart" data-product-id="${product.id}" data-product-type="${product.type}">加入购物车</button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // 重构点击逻辑：完全移除alert，简单商品加购成功直接跳转购物车
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function() {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        // 按钮加载状态防重复点击
        const originText = this.innerText;
        this.innerText = "处理中...";
        this.disabled = true;

        if (pType === 'simple') {
          const res = await addToCart(pid, 1);
          if (res?.key) {
            // 加购成功，直接跳转购物车（无弹窗）
            window.location.href = CART_PAGE_URL;
          } else {
            // 失败仅控制台打印，不弹alert
            console.log(`商品${pid}加购失败`, res);
          }
        } else if (pType === 'variable') {
          // 变体商品移除alert，直接跳商品详情页选规格
          window.location.href = `https://daqi.asia/product/${product.slug}`;
        }

        // 恢复按钮状态
        this.innerText = originText;
        this.disabled = false;
      });
    });

  } catch (error) {
    console.error('API 请求失败:', error);
    container.innerHTML = `<p class="error-msg">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);