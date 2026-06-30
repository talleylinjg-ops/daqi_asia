"use strict";

(function initLayout(){
    const loadingTip = document.createElement("p");
    loadingTip.className = "loading-tip";
    loadingTip.innerText = "⏳ Loading products...";
    loadingTip.style.textAlign = "center";
    document.body.prepend(loadingTip);

    // 给容器 class=goods-box，和查询选择器对应
    const goodsWrap = document.createElement("div");
    goodsWrap.className = "goods-box";
    goodsWrap.style.maxWidth = "1200px";
    goodsWrap.style.margin = "0 auto";
    goodsWrap.style.padding = "15px";
    document.body.prepend(goodsWrap);
})();

// 加购函数
window.addToCart = async function(pid) {
    try {
        const res = await fetch("https://daqi.asia/add-cart-proxy.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pid: pid })
        });
        const data = await res.json();
        if (data.success) {
            alert("Add to cart success!");
        } else {
            console.log("Cart Error Detail：", data);
            alert("Add to cart failed, please retry");
        }
    } catch (e) {
        console.error(e);
        alert("Add to cart failed, network error");
    }
};

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

// 等页面DOM全部加载完再请求商品，防止阻塞空白
window.addEventListener("DOMContentLoaded", loadAllGoods);