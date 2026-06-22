(function() {
  var siteUrl = 'https://daqi.asia';
  var consumerKey = 'ck_7314eb29ed0e1d50b8f9296bb0a590e7e0845e5c';
  var consumerSecret = 'cs_c2d99cdc2b9094943d11e897202ceae1cb8a98a4';
  var container = document.getElementById('product-container');

  async function loadProducts() {
    try {
      var credentials = btoa(consumerKey + ':' + consumerSecret);
      var apiUrl = siteUrl + '/wp-json/wc/v3/products?per_page=20';

      var response = await fetch(apiUrl, {
        headers: {
          'Authorization': 'Basic ' + credentials,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var products = await response.json();

      if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">暂无商品</p>';
        return;
      }

      var html = '<div class="product-grid">';
      for (var i = 0; i < products.length; i++) {
        var product = products[i];
        var imgSrc = product.images && product.images.length > 0
          ? product.images[0].src
          : 'https://via.placeholder.com/300x300/eee/ccc?text=无图片';
        html += '<div class="product-card">';
        html += '<img src="' + imgSrc + '" alt="' + product.name + '" />';
        html += '<h3>' + product.name + '</h3>';
        html += '<div class="price">$' + product.price + '</div>';
        html += '<button class="add-to-cart">加入购物车</button>';
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;

    } catch (error) {
      container.innerHTML = '<p style="text-align:center;color:red;">⚠️ 商品加载失败，请稍后刷新</p>';
      console.error('API 请求失败:', error);
    }
  }

  loadProducts();
})();