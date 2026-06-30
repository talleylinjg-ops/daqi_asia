// ===================== Nonce 获取逻辑（已废弃astro自定义接口，改用全局变量） =====================
function getWcNonce() {
    const nonce = window.wcStoreNonce ?? "";
    console.log("【Nonce调试打印】当前获取到的Nonce: ", nonce);
    return nonce;
}

// 页面加载时打印Nonce状态（对应日志 products.js:236）
(function initPrintNonceLog() {
    const val = getWcNonce();
    console.log("【页面加载】Nonce获取状态：", !!val, " 当前Nonce值：", val);
})();

// ===================== 加购商品函数 =====================
async function addToCart(productId, quantity = 1, variationParams = {}) {
    const nonce = getWcNonce();
    console.log("【加购调试】携带Nonce: ", nonce);

    const requestBody = {
        id: productId,
        quantity: quantity,
        ...variationParams
    };

    try {
        const response = await fetch("/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": nonce
            },
            body: JSON.stringify(requestBody)
        });

        const addResult = await response.json();
        console.log("加购返回结果：", addResult);

        // 请求最新购物车数据
        const cartRes = await fetch("/wp-json/wc/store/cart", {
            headers: {
                "X-WC-Store-API-Nonce": nonce
            }
        });
        const cartData = await cartRes.json();
        console.log("购物车数据：", cartData);

        return addResult;
    } catch (error) {
        console.error("加购请求异常", error);
        return null;
    }
}

// ===================== 获取商品变体接口（修复404日志打印） =====================
async function getProductVariations(productId) {
    const nonce = getWcNonce();
    try {
        const res = await fetch(`/wp-json/wc/store/products/${productId}/variations`, {
            headers: {
                "X-WC-Store-API-Nonce": nonce
            }
        });

        const resData = await res.json();
        if (!res.ok) {
            console.log(`products.js:88 商品${productId}无变体接口，状态码：`, res.status);
            return [];
        }
        return resData;
    } catch (err)
        console.error("变体接口网络错误", err);
        return [];
    }
}

// ===================== 业务调用示例（你原有409行调用位置参考） =====================
// const variations = await getProductVariations(17381);
// await addToCart(17375, 1);