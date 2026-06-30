"use strict";

// 从wp cookie解析生成store api nonce
function getWooNonce() {
    let cookie = document.cookie.split('; ').find(row => row.startsWith('woocommerce_session_'));
    if (!cookie) return "";
    const sessionVal = cookie.split('=')[1];
    // Woo Store API 标准nonce生成规则
    return btoa(`wc_store_${sessionVal.slice(-12)}`);
}

async function addToCart(pid, qty = 1, extra = {}) {
    const nonce = getWooNonce();
    const payload = { id: pid, quantity: qty, ...extra };
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": nonce
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });
        const addResult = await res.json();
        if (!res.ok) {
            throw new Error(addResult.message || "Add cart api error");
        }
        alert("Add to cart success!");
        return addResult;
    } catch (err) {
        console.error("加购请求失败", err);
        alert("Add to cart failed, please retry");
        return null;
    }
}

async function getProductVariations(pid) {
    const nonce = getWooNonce();
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/store/products/${pid}/variations`, {
            headers: {
                "X-WC-Store-API-Nonce": nonce
            },
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        if (!res.ok) {
            console.log(`商品${pid}无变体，状态码：`, res.status);
            return [];
        }
        return data;
    } catch (err) {
        console.error("变体接口请求异常", err);
        return [];
    }
}

(function initDom(){
    if(!document.querySelector(".loading-tip")){
        const p=document.createElement("p");
        p.className="loading-tip";
        p.textContent="⏳ 加载商品中...";
        document.body.prepend(p);
    }
    if(!document.querySelector(".goods-box")){
        const d=document.createElement("div");
        d.className="goods-box";
        d.style.maxWidth="1200px";
        d.style.margin="0 auto";
        d.style.padding="15px";
        document.body.prepend(d);
    }
})();

window.addToCart = addToCart;
window.getProductVariations = getProductVariations;

window.loadGoods = async function(){
    const nonce = getWooNonce();
    const t=document.querySelector(".loading-tip");
    const b=document.querySelector(".goods-box");
    try{
        const r=await fetch("https://daqi.asia/wp-json/wc/store/products",{
            headers: {
                "X-WC-Store-API-Nonce": nonce
            },
            signal: AbortSignal.timeout(10000)
        });
        const l=await r.json();
        if(!t||!b)return;
        t.style.display="none";
        let h=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">`;
        l.forEach(i=>{
            const img=i.images?.[0]?.thumbnail||"";
            h+=`<div style="border:1px solid #eee;padding:10px;border-radius:6px;">
                ${img?`<img src="${img}" style="width:100%;height:200px;object-fit:cover;">`:""}
                <h4>${i.name}</h4>
                <div style="color:#c00;">${i.prices.price_html}</div>
                <button onclick="addToCart(${i.id})" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
            </div>`;
        });
        h+=`</div>`;
        b.innerHTML=h;
    }catch(e){
        if(t)t.textContent="商品加载超时，请刷新页面";
        console.error("商品列表加载失败", e);
    }
};

loadGoods();