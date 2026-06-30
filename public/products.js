"use strict";

(function initLayout(){
    const loadingTip = document.createElement("p");
    loadingTip.className = "loading-tip";
    loadingTip.innerText = "⏳ Loading products...";
    loadingTip.style.textAlign = "center";
    document.body.prepend(loadingTip);

    const goodsWrap = document.createElement("div");
    goodsWrap.className = "goods-box";
    goodsWrap.style.maxWidth = "1200px";
    goodsWrap.style.margin = "0 auto";
    goodsWrap.style.padding = "15px";
    document.body.prepend(goodsWrap);
})();

// 获取可变商品标准属性数组
async function getVariationPayload(productId) {
    const ck = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
    const cs = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/v3/products/${productId}/variations?consumer_key=${ck}&consumer_secret=${cs}`, {
            credentials: "include"
        });
        const variants = await res.json();
        if (!Array.isArray(variants) || variants.length === 0) return null;
        const firstVar = variants[0];
        const output = [];
        firstVar.attributes.forEach(attrItem => {
            output.push({
                attribute: attrItem.slug,
                value: attrItem.option
            });
        });
        return output;
    } catch (err) {
        console.error("获取变体失败", err);
        return null;
    }
}

// 加入购物车：浏览器原生请求，共用本机购物车Cookie
window.addToCart = async function(pid, productType) {
    const payload = {
        id: pid,
        quantity: 1
    };
    // 可变商品拼接标准variation
    if (productType === "variable") {
        const varPayload = await getVariationPayload(pid);
        if (varPayload) payload.variation = varPayload;
    }
    console.log("提交购物车完整JSON", payload);

    try {
        // 关键：credentials: "include" 带上当前浏览器全部购物车Cookie
        const cartRes = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const result = await cartRes.json();
        console.log("购物车接口返回完整数据", result);

        if (cartRes.ok) {
            alert("Add to cart success! Please open cart page to view items");
            // 自动拉取当前购物车，控制台打印已加入的商品，验证是否存入本地会话
            refreshLocalCart();
        } else {
            alert("Add failed, check console log");
        }
    } catch (netErr) {
        console.error("网络请求异常", netErr);
        alert("Network error");
    }
};

// 读取浏览器当前真实购物车，控制台输出所有商品，用来验证是否添加成功
async function refreshLocalCart() {
    try {
        const cartData = await fetch("https://daqi.asia/wp-json/wc/store/cart", {
            credentials: "include"
        });
        const cartJson = await cartData.json();
        console.log("=== 当前浏览器本地购物车完整内容 ===", cartJson);
    } catch (e) {
        console.error("读取购物车失败", e);
    }
}

// 加载商品列表
async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("Load product failed");
        const goodsList = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        goodsList.forEach(item => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `
                <div style="border:1px solid #eee;padding:10px;border-radius:6px;">
                    <img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">
                    <h4>${item.name}</h4>
                    <div style="color:#c00;">${item.prices.price_html}</div>
                    <button onclick="addToCart(${item.id}, '${item.type}')" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
                </div>
            `;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "Load product failed, refresh page";
        console.error(loadErr);
    }
}
window.addEventListener("DOMContentLoaded", loadAllGoods);