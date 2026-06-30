"use strict";

(function initLayout(){
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

// 调用同域中转，彻底避开跨域
window.addToCart = async function(pid) {
    try {
        const res = await fetch("https://daqi.asia/cart-proxy.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pid: pid })
        });
        const ret = await res.json();
        if (ret.success) {
            alert("Add success, click View Cart to check");
            getCurrentCart();
        } else {
            alert("Add failed");
        }
    } catch (err) {
        console.error(err);
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
                    <button onclick="addToCart(${item.id})" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
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