// WooCommerce API 密钥
const consumerKey = 'ck_06d450d4d615501dc5e207a354c65db3ca5d72c2';
const consumerSecret = 'cs_e2350eb8c6d8f3afa7f5c3b1a11236a7595ed847';

// 获取商品数据并渲染
async function loadProducts() {
  const container = document.getElementById('product-container');
  if (!container) {
    console.error('找不到 product-container 元素');
    return;
  }

  // 显示加载状态
  container.innerHTML = '<div class="loading">⏳ 加载商品中...</div>';

  try {
    // 生成 Basic Auth 凭证
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);

    // 直接请求 daqi.asia 的 API（CORS 已在服务器端配置）
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

    // 渲染商品卡片
    let html = '<div class="product-grid">';
    products.forEach(product => {
      const imgSrc = product.images && product.images.length > 0
        ? product.images[0].src
        : 'https://via.placeholder.com/300x300/eee/ccc?text=无图片';
      html += `
        <div class="product-card">
          <img src="${imgSrc}" alt="${product.name}" />
          <h3>${product.name}</h3>
          <div class="price">$${product.price}</div>
          <button class="add-to-cart" data-product-id="${product.id}">加入购物车</button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

    // 给所有“加入购物车”按钮绑定事件（演示）
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', function() {
        alert(`商品 ID ${this.dataset.productId} 已加入购物车（演示功能）`);
      });
    });

  } catch (error) {
    console.error('API 请求失败:', error);
    container.innerHTML = `<p style="text-align:center;color:red;">⚠️ 商品加载失败，请稍后刷新</p>`;
  }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadProducts);