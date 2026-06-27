const STORE_API = "https://daqi.asia/wp-json/wc/store";
const consumerKey = 'ck_8e53e17efba521ed240e3993d522677a3a438862';
const consumerSecret = 'cs_8cbc41d8d8451ecface53ba1c620d5093df9bc4d';

// 获取购物车（仅查询，不加购）
async function getCartData() {
  try {
    const res = await fetch(`${STORE_API}/cart`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    console.log("购物车数据：", data);
    return data;
  } catch (err) {
    console.error("获取购物车失败：", err);
    return null;
  }
}

// 加载商品列表，按钮改为跳转原生加购URL，完全抛弃POST API
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 容器');
    return;
  }
  container.innerHTML = '<div class="loading">⏳ 商品加载中...</div>';
  try {
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const res = await fetch(`https://daqi.asia/wp-json/wc/v3/products?per_page=20`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
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
      const imgSrc = product.images?.length ? product.images[0].src : "https://via.placeholder.com/300x300/eee/ccc?text=无图片";
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
    // 点击按钮直接跳转原生加购链接，无AJAX POST
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function() {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        // 普通商品链接
        if (pType === 'simple') {
          window.location.href = `https://daqi.asia/?add-to-cart=${pid}&quantity=1`;
        }
        // 变体商品固定链接 商品17381 变体17382 属性pa_direction=input
        if (pid === 17381 && pType === 'variable') {
          window.location.href = `https://daqi.asia/?add-to-cart=17381&quantity=1&variation_id=17382&attribute_pa_direction=input`;
        }
      });
    });
  } catch (error) {
    console.error("商品加载失败：", error);
    container.innerHTML = `<p class="error-msg">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);