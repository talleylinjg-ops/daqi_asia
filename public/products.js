"use strict";

(function initLayout(){
    // 查看购物车按钮
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

// 读取浏览器购物车
async function getCurrentCart() {
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart", {
            credentials: "include"
        });
        const cart = await res.json();
        console.log("【本机浏览器购物车完整数据】", cart);
        alert("F12控制台查看购物车");
    } catch (e) {
        console.error(e);
    }
}

// 传统表单方式加入购物车，写入浏览器真实Cookie，购物车可读取
window.addToCart = async function (pid, type) {
    let addUrl = "";
    // 简单商品
    if (type === "simple") {
        addUrl = `https://daqi.asia/?add-to-cart=${pid}`;
    }
    // 可变商品：直接填变体ID
    if (type === "variable") {
        const ck = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
        const cs = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";
        const varRes = await fetch(`https://daqi.asia/wp-json/wc/v3/products/${pid}/variations?consumer_key=${ck}&consumer_secret=${cs}`, {credentials:"include"});
        const varList = await varRes.json();
        const varId = varList[0].id;
        addUrl = `https://daqi.asia/?add-to-cart=${varId}`;
    }

    try {
        // 带cookie请求，写入本地购物会话
        const res = await fetch(addUrl, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: `quantity=1`
        });
        alert("Add to cart success! Click View Cart to check");
        getCurrentCart();
    } catch (err) {
        console.error(err);
        alert("Add failed");
    }
};

async function loadAllGoods() {
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