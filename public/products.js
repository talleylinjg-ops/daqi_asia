"use strict";
let cachedNonce = null;

// 远程拉取Nonce
async function fetchWcNonce() {
    if (cachedNonce) return cachedNonce;
    try {
        const resp = await fetch("https://daqi.asia/wp-json/astro-wc/v1/get-nonce");
        const json = await resp.json();
        cachedNonce = json.nonce;
        console.log("【Nonce调试打印】当前获取到的Nonce: ", cachedNonce);
        return cachedNonce;
    } catch (e) {
        console.error("拉取Nonce接口失败", e);
        cachedNonce = "";
        return "";
    }
}

// 页面加载预请求Nonce
(async function initLog() {
    const val = await fetchWcNonce();
    console.log("【页面加载】Nonce获取状态：", !!val, " 当前Nonce值：", val);
})();

// 加购函数
async function addToCart(pid, qty = 1, extra = {}) {
    const n = await fetchWcNonce();
    if (!n) return null;
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
    } catch (err)
        console.error("加购请求失败", err);
        return null;
    }
}

// 获取商品变体
async function getProductVariations(pid) {
    const n = await fetchWcNonce();
    if (!n) return [];
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
    } catch (err)
        console.error("变体接口请求异常", err);
        return [];
    }
}