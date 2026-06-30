"use strict";

let globalGoodsList = [];

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
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products?_embed", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("商品列表接口异常");
        globalGoodsList = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        globalGoodsList.forEach((item, index) => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `<div data-index="${index}" style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if (imgSrc) htmlStr += `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">`;
            htmlStr += `<h4>${item.name}</h4>`;
            htmlStr += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            htmlStr += `<button class="add-cart-btn" data-index="${index}" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            htmlStr += `</div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;

        document.querySelectorAll(".add-cart-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const idx = Number(this.dataset.index);
                const item = globalGoodsList[idx];
                const submitBody = { id: item.id, quantity: 1 };
                const variants = item._embedded?.variations ?? [];

                // 调试打印判断条件，定位为什么不走分支
                console.log("商品ID", item.id, "商品类型", item.type, "变体数量", variants.length);

                // 修复：宽松匹配type，强制读取第一条变体参数
                if ((item.type === "variable" || item.type === "variation") && variants.length > 0) {
                    const firstVar = variants[0];
                    submitBody.variation = firstVar.id;
                    submitBody.attributes = firstVar.attributes;
                    console.log("已追加变体参数", submitBody);
                }

                console.log("完整提交体", submitBody);
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
            });
        });
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "商品加载失败，请刷新页面";
    }
}
loadAllGoods();