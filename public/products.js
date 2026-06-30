"use strict";
let validNonce = null;

async function fetchValidNonce() {
    try {
        const res = await fetch("https://daqi.asia/wp-json/custom/v1/get-nonce", {
            signal: AbortSignal.timeout(6000)
        });
        const data = await res.json();
        validNonce = data.nonce;
    } catch (err) {
        console.error("获取后台验证串失败", err);
    }
}

async function addToCart(pid, qty = 1, extra = {}) {
    if (!validNonce) {
        await fetchValidNonce();
    }
    if (!validNonce) {
        alert("页面验证参数获取失败，请刷新页面");
        return null;
    }
    const payload = { id: pid, quantity: qty, ...extra };
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": validNonce
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });
        const addResult = await res.json();
        if (!res.ok) {
            throw new Error(addResult.message || "接口异常");
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
    if (!validNonce) await fetchValidNonce();
    if (!validNonce) return [];
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/store/products/${pid}/variations`, {
            headers: { "X-WC-Store-API-Nonce": validNonce },
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
    fetchValidNonce();
})();

window.addToCart = addToCart;
window.getProductVariations = getProductVariations;

window.loadGoods = async function(){
    if (!validNonce) await fetchValidNonce();
    const t=document.querySelector(".loading-tip");
    const b=document.querySelector(".goods-box");
    try{
        const r=await fetch("https://daqi.asia/wp-json/wc/store/products",{
            headers: { "X-WC-Store-API-Nonce": validNonce },
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