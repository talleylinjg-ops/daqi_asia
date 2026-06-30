"use strict";

window.addToCart = async function(pid, qty = 1, type = "simple", slug = "") {
    let reqData = { id: pid, quantity: qty };
    let getVarSuccess = false;

    if (type === "variable" && slug) {
        try {
            const res = await fetch(`https://daqi.asia/wp-json/wc/store/products/${slug}/variations`, {
                credentials: "include",
                signal: AbortSignal.timeout(5000)
            });
            if (res.ok) {
                const list = await res.json();
                if (list.length > 0) {
                    const firstVar = list[0];
                    reqData.variation = firstVar.id;
                    reqData.attributes = firstVar.attributes;
                    getVarSuccess = true;
                }
            }
        } catch (err) {
            // 跨域/500/超时全部判定为拉取变体失败
            getVarSuccess = false;
        }
    }

    // 拉取变体失败，彻底删除variation、attributes字段，按简单商品提交
    if (!getVarSuccess) {
        delete reqData.variation;
        delete reqData.attributes;
    }

    try {
        const resp = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(reqData)
        });
        const resJson = await resp.json();
        if (resp.ok) {
            alert("Add to cart success!");
        } else {
            console.log("Cart Error Detail：", resJson);
            alert("Add to cart failed, please retry");
        }
    } catch (e) {
        alert("Add to cart failed, please retry");
    }
};

(function initBox(){
    const loadingText = document.createElement("p");
    loadingText.className = "loading-tip";
    loadingText.innerText = "⏳ 加载商品中...";
    document.body.prepend(loadingText);

    const goodsWrap = document.createElement("div");
    goodsWrap.className = "goods-box";
    goodsWrap.style.maxWidth = "1200px";
    goodsWrap.style.margin = "0 auto";
    goodsWrap.style.padding = "15px";
    document.body.prepend(goodsWrap);
})();

async function loadGoods(){
    const tip = document.querySelector(".loading-tip");
    const box = document.querySelector(".goods-box");
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
        if (!res.ok) throw new Error("load fail");
        const goodsList = await res.json();
        tip.style.display = "none";
        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        goodsList.forEach(item => {
            const imgUrl = item.images?.[0]?.thumbnail || "";
            html += `<div style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if(imgUrl) html += `<img src="${imgUrl}" style="width:100%;height:200px;object-fit:cover;">`;
            html += `<h4>${item.name}</h4>`;
            html += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            html += `<button onclick="addToCart(${item.id},1,'${item.type}','${item.slug}')" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            html += `</div>`;
        });
        html += `</div>`;
        box.innerHTML = html;
    } catch (error) {
        if(tip) tip.innerText = "商品加载失败，请刷新页面";
    }
}

loadGoods();