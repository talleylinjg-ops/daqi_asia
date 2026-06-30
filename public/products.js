"use strict";

// 获取Woo Store API Nonce（从页面原生隐藏input读取，不要写死空）
function getWcNonce() {
    const nonceInput = document.querySelector('input[name="wc_store_api_nonce"]');
    if (nonceInput && nonceInput.value) {
        return nonceInput.value;
    }
    // 备用：如果主题挂载到window全局
    if (window.wcStoreApiNonce) {
        return window.wcStoreApiNonce;
    }
    return "";
}

// 加购函数
async function addToCart(pid, qty = 1, extra = {}) {
    const n = getWcNonce();
    if (!n) {
        alert("缺少接口验证参数，无法加入购物车");
        return null;
    }
    const payload = { id: pid, quantity: qty, ...extra };
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-WC-Store-API-Nonce": n
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });
        const addResult = await res.json();
        if (!res.ok) {
            throw new Error(addResult.message || "加购接口返回异常");
        }
        await fetch("https://daqi.asia/wp-json/wc/store/cart", {
            headers: { "X-WC-Store-API-Nonce": n },
            signal: AbortSignal.timeout(8000)
        });
        alert("Add to cart success!");
        return addResult;
    } catch (err) {
        console.error("加购请求失败", err);
        alert("Add to cart failed, please retry");
        return null;
    }
}

// 获取商品变体
async function getProductVariations(pid) {
    const n = getWcNonce();
    if (!n) return [];
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/store/products/${pid}/variations`, {
            headers: { "X-WC-Store-API-Nonce": n },
            signal: AbortSignal.timeout(8000)
        });
        const data = await res.json();
        if (!res.ok) {
            console.log(`商品${pid}无变体接口，状态码：`, res.status);
            return [];
        }
        return data;
    } catch (err) {
        console.error("变体接口请求异常", err);
        return [];
    }
}

// 页面初始化：创建加载提示、商品容器
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

// 全局挂载加载商品、加购、获取变体方法
window.addToCart = addToCart;
window.getProductVariations = getProductVariations;

// 加载商品列表
window.loadGoods = async function(){
    const n = getWcNonce();
    try{
        const r=await fetch("https://daqi.asia/wp-json/wc/store/products",{
            headers:{
                "X-WC-Store-API-Nonce": n
            }
        });
        const l=await r.json();
        const t=document.querySelector(".loading-tip");
        const b=document.querySelector(".goods-box");
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
        const t=document.querySelector(".loading-tip");
        if(t)t.textContent="加载异常";
        console.error("商品列表加载失败", e);
    }
};

// 页面载入自动执行加载
loadGoods();