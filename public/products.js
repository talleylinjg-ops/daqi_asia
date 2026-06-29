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
    console.log("【Nonce调试打印】当前获取到的Nonce:", WC_STORE_NONCE);
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
  console.log("【加购调试】携带Nonce:", WC_STORE_NONCE);
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

// 获取可变商品全部变体信息（弹窗专用，过滤库存&当前商品）
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
    const variants = await res.json();
    // 过滤：仅当前商品、有库存的变体
    return variants.filter(item => item.product_id === productId && item.stock_quantity > 0);
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

// ===================== 弹窗工具函数 无跳转 修复数据错乱 =====================
// 创建规格选择弹窗
function createVariationModal() {
  const oldModal = document.getElementById('variation-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'variation-modal';
  modal.style.cssText = `
    position: fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;z-index:9999;
  `;
  modal.innerHTML = `
    <div style="background:#fff;width:90%;max-width:500px;border-radius:12px;padding:24px;position:relative;">
      <button id="close-modal" style="position:absolute;top:12px;right:16px;border:none;background:transparent;font-size:22px;cursor:pointer;">×</button>
      <h3 id="modal-title" style="margin:0 0 16px;"></h3>
      <div id="attr-wrap" style="margin-bottom:20px;"></div>
      <div style="display:flex;gap:12px;align-items:center;">
        <label>数量：</label>
        <input type="number" id="qty-input" value="1" min="1" style="width:70px;padding:6px;">
      </div>
      <button id="confirm-add" style="margin-top:20px;width:100%;padding:12px;background:#4CAF50;color:#fff;border:none;border-radius:6px;cursor:pointer;">加入购物车</button>
    </div>
  `;
  document.body.appendChild(modal);

  // 关闭弹窗
  document.getElementById('close-modal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target.id === 'variation-modal') modal.remove(); };
  return modal;
}

// 渲染变体规格选择器（清空旧DOM，隔离不同商品数据）
function renderVariationPopup(variations, productName, productId) {
  const oldModal = document.getElementById('variation-modal');
  if (oldModal) oldModal.remove();

  const modal = createVariationModal();
  modal.dataset.pid = productId;
  document.getElementById('modal-title').innerText = productName;
  const attrWrap = document.getElementById('attr-wrap');
  attrWrap.innerHTML = ""; // 清空上一个商品的规格，杜绝数据错乱
  let allAttrMap = {};

  // 收集当前商品专属属性
  variations.forEach(item => {
    item.attributes.forEach(attr => {
      if (!allAttrMap[attr.name]) allAttrMap[attr.name] = new Set();
      allAttrMap[attr.name].add(attr.value);
    });
  });

  // 生成下拉选择框
  Object.keys(allAttrMap).forEach(attrKey => {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';
    let selectHtml = `<label>${attrKey}：</label><select data-key="${attrKey}" style="margin-left:8px;padding:6px;">`;
    allAttrMap[attrKey].forEach(val => {
      selectHtml += `<option value="${val}">${val}</option>`;
    });
    selectHtml += `</select>`;
    wrap.innerHTML = selectHtml;
    attrWrap.appendChild(wrap);
  });

  // 确认加购按钮事件
  document.getElementById('confirm-add').onclick = async () => {
    const selects = attrWrap.querySelectorAll('select');
    const selectedAttrs = {};
    selects.forEach(sel => selectedAttrs[sel.dataset.key] = sel.value);
    const qty = Number(document.getElementById('qty-input').value);

    // 精准匹配当前商品变体ID
    const targetVar = variations.find(v => {
      return v.attributes.every(a => selectedAttrs[a.name] === a.value);
    });

    if (!targetVar) {
      alert("请完整选择所有商品规格");
      return;
    }

    const addResult = await addVariableToCart(productId, qty, targetVar.id, selectedAttrs);
    if (addResult?.key) {
      modal.remove();
      alert("加入购物车成功");
      getCartData();
    } else {
      alert("加购失败，请重新选择规格");
    }
  };
}

// 加载商品列表
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 元素');
    return;
  }

  container.innerHTML = '<div class="loading">⏳ 加载商品中...</div>';

  // 先拉取Nonce鉴权 + 打印调试
  const nonceOk = await fetchWcNonce();
  console.log("【页面加载】Nonce获取状态：", nonceOk, "当前Nonce值：", WC_STORE_NONCE);
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
      // 价格undefined兜底修复
      const priceDisplay = product.price ? `$${product.price}` : "$0.00";
      html += `
        <div class="product-card">
          <img src="${imgSrc}" alt="${product.name}" loading="lazy" />
          <h3>${product.name}</h3>
          <div class="price">${priceDisplay}</div>
          <button class="add-to-cart" 
                  data-product-id="${product.id}" 
                  data-product-type="${product.type}"
                  data-product-slug="${product.slug}">加入购物车</button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // 按钮点击事件：变体弹窗，无页面跳转
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', async function() {
        const pid = Number(this.dataset.productId);
        const pType = this.dataset.productType;
        const originText = this.textContent;
        const productName = this.parentElement.querySelector('h3').innerText;

        this.textContent = "处理中...";
        this.disabled = true;

        if (pType === 'simple') {
          const res = await addToCart(pid, 1);
          if (res?.key) {
            alert("加入购物车成功");
            getCartData();
          } else {
            console.log(`商品${pid}加购失败`, res);
          }
          this.textContent = originText;
          this.disabled = false;
        } else if (pType === 'variable') {
          // 完全移除页面跳转，弹窗加载规格
          const vars = await getProductVariations(pid);
          this.textContent = originText;
          this.disabled = false;
          if (!vars || vars.length === 0) {
            alert("该商品暂无可选规格");
            return;
          }
          renderVariationPopup(vars, productName, pid);
        }
      });
    });

  } catch (error) {
    console.error('API 请求失败:', error);
    container.innerHTML = `<p class="error-msg">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProducts);