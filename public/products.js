"use strict";

window.addToCart = async function(pid, qty = 1, type = "simple", varList = []) {
    const submitBody = { id: pid, quantity: qty };

    // 仅可变商品且预加载到变体才追加参数
    if (type === "variable" && varList.length > 0) {
        const firstVar = varList[0];
        submitBody.variation = firstVar.id;
        submitBody.attributes = firstVar.attributes;
    }

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
        // _embed 预加载所有变体，彻底取消单独/variations请求
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products?_embed", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("商品列表接口异常");
        const goodsData = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        goodsData.forEach(item => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            // 取出预嵌入的变体数组
            const variants = item._embedded?.variations ?? [];
            // JSON转义，避免html onclick语法报错
            const varStr = JSON.stringify(variants).replace(/"/g, "&quot;");

            htmlStr += `<div style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if (imgSrc) htmlStr += `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">`;
            htmlStr += `<h4>${item.name}</h4>`;
            htmlStr += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            htmlStr += `<button onclick='addToCart(${item.id},1,"${item.type}",${varStr})' style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            htmlStr += `</div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "商品加载失败，请刷新页面";
    }
}
loadAllGoods();