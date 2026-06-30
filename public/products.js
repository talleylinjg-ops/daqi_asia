"use strict";
// 后端关闭nonce校验，直接填空
function getWcNonce() {
    return "";
}

// 页面加载日志
(function initLog() {
    const val = getWcNonce();
    console.log("【页面加载】Nonce获取状态：", !!val, " 当前Nonce值：", val);
})();

// 加购
async function addToCart(pid, qty = 1, extra = {}) {
    const n = getWcNonce();
    console.log("【加购调试】携带Nonce: ", n);
    const payload = { id: pid, quantity: qty, ...extra };
    try {
        const res = await fetch("/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": n
            },
            body: JSON.stringify(payload)
        });
        const addResult = await res.json();
        console.log("加购返回结果：", addResult);

        const cartRes = await fetch("/wp-json/wc/store/cart", {
            headers: { "X-WC-Store-API-Nonce": n }
        });
        const cartData = await cartRes.json();
        console.log("购物车数据：", cartData);
        return addResult;
    } catch (err) {
        console.error("加购请求失败", err);
        return null;
    }
}

// 获取商品变体
async function getProductVariations(pid) {
    const n = getWcNonce();
    try {
        const res = await fetch(`/wp-json/wc/store/products/${pid}/variations`, {
            headers: { "X-WC-Store-API-Nonce": n }
        });
        const data = await res.json();
        if (!res.ok) {
            console.log(`products.js:88 商品${pid}无变体接口，状态码：`, res.status);
            return [];
        }
        return data;
    } catch (err) {
        console.error("变体接口请求异常", err);
        return [];
    }
}