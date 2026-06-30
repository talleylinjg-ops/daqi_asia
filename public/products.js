"use strict";

(function initLayout(){
    const loadingTip = document.createElement("p");
    loadingTip.className = "loading-tip";
    loadingTip.innerText = "⏳ 加载商品中...";
    document.body.prepend(loadingTip);
    const goodsWrap = document.createElement("div");
    goodsWrap.className = "goods-box";
    goodsWrap.style.maxWidth = "1200px";
    goodsWrap.style.margin = "0 auto";
    goodsWrap.style.padding = "15px";
    document.body.prepend(goodsWrap);
})();

async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("商品列表加载失败");
        const goodsData = await listRes.json();
        tipDom.style.display = "none";
        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        goodsData.forEach(item => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `<div style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if (imgSrc) htmlStr += `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">`;
            htmlStr += `<h4>${item.name}</h4>`;
            htmlStr += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            htmlStr += `<button onclick="quickAddCart(${item.id})" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            htmlStr += `</div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "商品加载失败，请刷新页面";
    }
}

// 极简提交，无任何变体参数，绕过API强制校验
window.quickAddCart = async function(pid) {
    const submitBody = { id: pid, quantity: 1 };
    console.log("最终提交体", submitBody);
    try {
        const cartRes = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(submitBody)
        });
        const cartJson = await cartRes.json();
        if (cartRes.ok) {
            alert("Add to cart success!");
        } else {
            console.log("Cart Error Detail：", cartJson);
            alert("Add to cart failed, please retry");
        }
    } catch (netErr) {
        alert("Add to cart failed, please retry");
    }
};
loadAllGoods();