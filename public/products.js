"use strict";
let globalGoodsList = [];
const CK = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
const CS = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";

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

async function getProductData(pid) {
    try {
        const res = await fetch(`https://daqi.asia/proxy-variants.php?pid=${pid}`, {credentials:"include"});
        if(!res.ok) return null;
        return await res.json();
    }catch(e){
        return null;
    }
}

async function loadAllGoods(){
    const tipDom = document.querySelector(".loading-tip");
    const boxDom = document.querySelector(".goods-box");
    try {
        const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {credentials:"include"});
        if (!listRes.ok) throw new Error("商品加载失败");
        globalGoodsList = await listRes.json();
        tipDom.style.display = "none";

        let htmlStr = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';
        globalGoodsList.forEach((item, index) => {
            const imgSrc = item.images?.[0]?.thumbnail || "";
            htmlStr += `<div data-pid="${item.id}" data-type="${item.type}" style="border:1px solid #eee;padding:10px;border-radius:6px;">
                <img src="${imgSrc}" style="width:100%;height:auto;">
                <h4>${item.name}</h4>
                <div>Price: ${item.prices.price}</div>
                <button class="add-cart-btn" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
            </div>`;
        });
        htmlStr += `</div>`;
        boxDom.innerHTML = htmlStr;

        document.querySelectorAll(".add-cart-btn").forEach(btn => {
            btn.addEventListener("click", async function() {
                const wrap = this.closest("[data-pid]");
                const pid = Number(wrap.dataset.pid);
                const type = wrap.dataset.type;

                // v3 购物车接口入参固定结构
                const payload = {
                    product_id: pid,
                    quantity: 1
                };

                if(type === "variable"){
                    const data = await getProductData(pid);
                    if(!data || data.variants.length === 0) return;
                    const firstVar = data.variants[0];
                    payload.variation_id = firstVar.id;
                    // 全局属性数组，满足v3接口校验
                    payload.variation = {};
                    data.parent_attrs.forEach(attr=>{
                        payload.variation[attr.slug] = firstVar.attributes.find(v=>v.name===attr.name).option;
                    });
                }

                console.log("提交购物车 payload", payload);
                // 使用v3后台购物车接口，不再用store/cart/items
                const apiUrl = `https://daqi.asia/wp-json/wc/v3/cart/add-item?consumer_key=${CK}&consumer_secret=${CS}`;
                try {
                    const res = await fetch(apiUrl, {
                        method: "POST",
                        headers: {"Content-Type":"application/json"},
                        credentials: "include",
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    if(res.ok){
                        alert("Add to cart success!");
                    }else{
                        console.log("错误", json);
                        alert("Add to cart failed, please retry");
                    }
                }catch(e){
                    alert("Add to cart failed, please retry");
                }
            });
        });
    } catch (loadErr) {
        if (tipDom) tipDom.innerText = "商品加载失败，请刷新页面";
    }
}
loadAllGoods();