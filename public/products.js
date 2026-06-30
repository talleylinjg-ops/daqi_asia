"use strict";

(function initLayout(){
    // 顶部查看购物车按钮
    const cartViewBtn = document.createElement("button");
    cartViewBtn.innerText = "View Cart";
    cartViewBtn.style.position = "fixed";
    cartViewBtn.style.top = "10px";
    cartViewBtn.style.right = "10px";
    cartViewBtn.style.padding = "6px 12px";
    cartViewBtn.style.background = "#333";
    cartViewBtn.style.color = "#fff";
    cartViewBtn.style.border = "none";
    cartViewBtn.style.borderRadius = "4px";
    cartViewBtn.onclick = getCurrentCart;
    document.body.appendChild(cartViewBtn);

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

// 读取当前浏览器真实购物车
async function getCurrentCart() {
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart", {
            credentials: "include"
        });
        const cart = await res.json();
        console.log("【本机浏览器购物车完整数据】", cart);
        alert("打开控制台F12查看购物车打印内容");
    } catch (e) {
        console.error("读取购物车失败", e);
    }
}

// 获取可变商品标准variation数组
async function getVariationPayload(productId) {
    const ck = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
    const cs = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/v3/products/${productId}/variations?consumer_key=${ck}&consumer_secret=${cs}`, {
            credentials: "include"
        });
        const variants = await res.json();
        if (!Array.isArray(variants) || variants.length === 0) return null;
        const first = variants[0];
        const arr = [];
        first.attributes.forEach(attr => {
            arr.push({
                attribute: attr.slug,
                value: attr.option
            });
        });
        return arr;
    } catch (e) {
        return null;
    }
}

// 加入购物车
window.addToCart = async function(pid, type) {
    const payload = { id: pid, quantity: 1 };
    if (type === "variable") {
        const varArr = await getVariationPayload(pid);
        if (varArr) payload.variation = varArr;
    }
    console.log("最终提交体", payload);

    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const ret = await res.json();
        if (res.ok) {
            alert("Add success, click View Cart to check");
            getCurrentCart();
        } else {
            console.log("失败详情", ret);
            alert("Add failed");
        }
    } catch (e) {
        alert("Network error");
    }
};

async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
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
    }
}
window.addEventListener("DOMContentLoaded", loadAllGoods);