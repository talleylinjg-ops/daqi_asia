"use strict";
let globalGoodsList = [];
// 填入你提供的Woo v3 API密钥
const WC_API_KEYS = {
    consumer_key: "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe",
    consumer_secret: "cs_9424255ada2191c49b5cd93adeac27880e3e071d"
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

// v3 接口读取变体，支持数字ID，不再404
async function fetchVariants(productId) {
    const queryParams = new URLSearchParams({
        consumer_key: WC_API_KEYS.consumer_key,
        consumer_secret: WC_API_KEYS.consumer_secret
    });
    const url = `https://daqi.asia/wp-json/wc/v3/products/${productId}/variations?${queryParams.toString()}`;
    try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        return [];
    }
}

async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("商品列表加载失败");
        globalGoodsList = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        globalGoodsList.forEach((item, index) => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `<div data-index="${index}" style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if (imgSrc) htmlStr += `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">`;
            htmlStr += `<h4>${item.name}</h4>`;
            htmlStr += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            htmlStr += `<button class="add-cart-btn" data-pid="${item.id}" data-type="${item.type}" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            htmlStr += `</div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;

        // 绑定点击事件
        document.querySelectorAll(".add-cart-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const pid = Number(this.dataset.pid);
                const type = this.dataset.type;
                const submitBody = { id: pid, quantity: 1 };

                // 可变商品拉取变体，拼接variation+attributes
                if (type === "variable") {
                    const varList = await fetchVariants(pid);
                    if (varList.length > 0) {
                        const firstVar = varList[0];
                        submitBody.variation = firstVar.id;
                        submitBody.attributes = firstVar.attributes;
                    }
                }
                console.log("最终提交完整请求体", submitBody);

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