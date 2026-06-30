"use strict";

(function initLayout(){
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

// 拉取单个商品变体属性
async function getVariantAttr(pid) {
    const ck = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
    const cs = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/v3/products/${pid}/variations?consumer_key=${ck}&consumer_secret=${cs}`, {
            credentials: "include"
        });
        const list = await res.json();
        if(!list || list.length === 0) return null;
        const first = list[0];
        const varArr = [];
        first.attributes.forEach(item=>{
            varArr.push({
                attribute: item.slug,
                value: item.option
            });
        });
        return varArr;
    }catch(e){
        return null;
    }
}

// 前端直接加入购物车，使用浏览器本地会话
window.addToCart = async function(pid, type) {
    const payload = {
        id: pid,
        quantity: 1
    };
    // 可变商品补充标准variation数组
    if(type === "variable") {
        const varArr = await getVariantAttr(pid);
        if(varArr) payload.variation = varArr;
    }
    console.log("最终提交体", payload);
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const ret = await res.json();
        if(res.ok) {
            alert("Add success! Cart will show goods");
        }else{
            console.log(ret);
            alert("Failed");
        }
    }catch(e){
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