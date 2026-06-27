const STORE_API = "https://daqi.asia/wp-json/wc/store";
const consumerKey = 'ck_8e53e17efba521ed240e3993d522677a3a438862';
const consumerSecret = 'cs_8cbc41d8d8451ecface53ba1c620d5093df9bc4d';

// 获取购物车列表
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

// 普通单品AJAX加购
async function addToCart(productId, quantity = 1) {
  try {
    const res = await fetch(`${STORE_API}/cart/items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId, quantity: quantity })
    });
    const data = await res.json();
    console.log("加购返回结果：", data);
    return data;
  } catch (err) {
    console.error("普通商品加购失败：", err);
    return null;
  }
}

// 渲染商品列表
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 容器');
    return;
  }
  container.innerHTML = '<div class="loading">⏳ 加载商品中...</div>';
  try {
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const response = await fetch(`https://daqi.asia/wp-json/wc/v3/products?per_page=20`, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();
    if (!Array.isArray(products)) {
      container.innerHTML = '<p style="text-align:center;color:#999;">暂无商品</p>';
      return;
    }
    let html = `<div class="product-grid">`;
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
    html += `</div>`;
    container.innerHTML = html;

    // 点击逻辑：完全删除alert弹窗，17381直接跳转，其余simple走AJAX
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function () {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        // 固定变体商品ID17381，直接跳转原生加购链接
        if (pid === 17381) {
          window.location.href = "https://daqi.asia/?add-to-cart=17381&quantity=1&variation_id=17382&attribute_pa_direction=input";
          return;
        }
        // 普通单品执行AJAX加购
        if (pType === "simple") {
          await addToCart(pid, 1);
        }
      });
    });
  } catch (error) {
    console.error("商品加载失败：", error);
    container.innerHTML = `<p style="text-align:center;color:red;">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);