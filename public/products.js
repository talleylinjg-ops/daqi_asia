"use strict";

window.addToCart = async function(pid, qty = 1, type = "simple", slug = "") {
    // 默认仅基础商品参数
    let submitBody = {
        id: pid,
        quantity: qty
    };

    // 仅可变商品才尝试拉取变体
    if (type === "variable" && slug) {
        let fetchVariationOk = false;
        let targetVariation = null;
        try {
            const varRes = await fetch(`https://daqi.asia/wp-json/wc/store/products/${slug}/variations`, {
                credentials: "include",
                signal: AbortSignal.timeout(4000)
            });
            if (varRes.ok) {
                const varList = await varRes.json();
                if (Array.isArray(varList) && varList.length > 0) {
                    targetVariation = varList[0];
                    fetchVariationOk = true;
                }
            }
        } catch (err) {
            // 跨域/500/超时 直接标记拉取失败
            fetchVariationOk = false;
        }

        // 只有成功拿到变体，才追加variation和attributes
        if (fetchVariationOk && targetVariation) {
            submitBody.variation = targetVariation.id;
            submitBody.attributes = targetVariation.attributes;
        }
        // 拉取失败：完全不添加variation、attributes，维持简单商品格式
    }

    // 提交购物车
    try {
        const cartRes = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
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

// 初始化页面容器
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

// 加载商品列表
async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            credentials: "include"
        });
        if (!listRes.ok) throw new Error("商品列表接口异常");
        const goodsData = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        goodsData.forEach(item => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `<div style="border:1px solid #eee;padding:10px;border-radius:6px;">`;
            if (imgSrc) {
                htmlStr += `<img src="${imgSrc}" style="width:100%;height:200px;object-fit:cover;">`;
            }
            htmlStr += `<h4>${item.name}</h4>`;
            htmlStr += `<div style="color:#c00;">${item.prices.price_html}</div>`;
            // 传入商品id、数量、type、slug四个参数
            htmlStr += `<button onclick="addToCart(${item.id},1,'${item.type}','${item.slug}')" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>`;
            htmlStr += `</div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "商品加载失败，请刷新页面";
    }
}

// 执行加载
loadAllGoods();