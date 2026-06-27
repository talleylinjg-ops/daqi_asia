// WooCommerce v3 密钥（拉商品列表）
const consumerKey = 'ck_8e53e17efba521ed240e3993d522677a3a438862';
const consumerSecret = 'cs_8cbc41d8d8451ecface53ba1c620d5093df9bc4d';
// 唯一前端可用购物车接口
const WP_API_BASE = "https://daqi.asia/wp-json/wc/store";

// ===================== 购物车相关函数 =====================
// 获取购物车
async function getCartData() {
  try {
    const res = await fetch(`${WP_API_BASE}/cart`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
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

// 简单商品加购
async function addToCart(productId, quantity = 1) {
  try {
    const res = await fetch(`${WP_API_BASE}/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
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

// 变体商品专用函数：仅传商品ID、数量、变体ID，无需attributes
async function addVariableToCart(productId, quantity = 1, variationId) {
  try {
    const res = await fetch(`${WP_API_BASE}/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: productId,
        quantity: quantity,
        variation: variationId
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

// ===================== 商品加载渲染逻辑 =====================
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();
    if (!Array.isArray(products)) {
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
      const imgSrc = product.images && product.images.length > 0 ? product.images[0].src : 'https://via.placeholder.com/300x300/eee/ccc?text=无图片';
      html += `
        <div class="product-card">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" />
          <h3>${product.name}</h3>
          <div class="price">$${product.price}</div>
          <button class="add-to-cart" data-product-id="${product.id}" data-product-type="${product.type}">加入购物车</button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function() {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        if(pType === 'simple'){
          const res = await addToCart(pid,1);
          alert(res?.key ? `商品${pid}加入购物车成功` : '加入失败');
        }else if(pType === 'variable'){
          alert('变体调用格式：addVariableToCart(商品ID, 数量, 变体ID)');
        }
      });
    });
  } catch (error) {
    console.error('商品加载失败：', error);
    container.innerHTML = `<p class="error-msg">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);