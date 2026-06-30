// 【已彻底删除astro/v1接口请求，纯全局变量读取Nonce】
function getWcNonce() {
    const nonce = window.wcStoreNonce ?? "";
    console.log("【Nonce调试打印】当前获取到的Nonce: ", nonce);
    return nonce;
}

// 页面初始化打印nonce日志（对应236行打印）
(function initNonceLog() {
    const val = getWcNonce();
    console.log("【页面加载】Nonce获取状态：", !!val, " 当前Nonce值：", val);
})();

// 加入购物车
async function addToCart(productId, quantity = 1, variationData = {}) {
    const nonce = getWcNonce();
    console.log("【加购调试】携带Nonce: ", nonce);

    const payload = {
        id: productId,
        quantity: quantity,
        ...variationData
    };

    try {
        const res = await fetch("/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": nonce
            },
            body: JSON.stringify(payload)
        });

        const addResult = await res.json();
        console.log("加购返回结果：", addResult);

        // 拉取最新购物车
        const cartResp = await fetch("/wp-json/wc/store/cart", {
            headers: {
                "X-WC-Store-API-Nonce": nonce
            }
        });
        const cartData = await cartResp.json();
        console.log("购物车数据：", cartData);

        return addResult;
    } catch (err)
        console.error("加购请求失败", err);
        return null;
    }
}

// 获取商品变体列表
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
        console.error("变体接口请求异常", err);
        return [];
    }
}

// ==================== 下方是你原有页面业务调用代码自行保留 ====================
// 示例调用：
// await addToCart(17375, 1);
// const variants = await getProductVariations(17381);