"use strict";

let cachedNonce = "";

// 同步读取缓存nonce，无则后台异步拉取
function getWcNonce() {
    // 1. 优先读取页面原生隐藏input
    const nonceInput = document.querySelector('input[name="wc_store_api_nonce"]');
    if (nonceInput?.value) {
        cachedNonce = nonceInput.value;
        return cachedNonce;
    }
    // 2. 读取页面全局nonce变量
    if (window.wcStoreApiNonce) {
        cachedNonce = window.wcStoreApiNonce;
        return cachedNonce;
    }
    // 3. 启动异步拉取nonce，先返回旧缓存
    fetchNonceAsync();
    return cachedNonce;
}

// 接口自动获取nonce存入缓存
async function fetchNonceAsync() {
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/v1/nonce", {
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) throw new Error("nonce接口异常");
        const data = await res.json();
        cachedNonce = data.nonce;
    } catch (err) {
        console.error("自动获取验证参数失败", err);
    }
}

// 加入购物车
async function addToCart(pid, qty = 1, extra = {}) {
    let n = getWcNonce();
    // 当前无缓存nonce，等待一次拉取
    if (!n) {
        await fetchNonceAsync();
        n = cachedNonce;
    }
    if (!n) {
        alert("缺少接口验证参数，无法加入购物车，请刷新页面重试");
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
        // 刷新购物车数据
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

// 获取商品变体列表
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
            console.log(`商品${pid}无变体，状态码：`, res.status);
            return [];
        }
        return data;
    } catch (err) {
        console.error("变体接口请求异常", err);
        return [];
    }
}

// 页面初始化DOM容器
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
    // 页面加载立刻预拉取nonce
    fetchNonceAsync();
})();

// 挂载全局方法，按钮onclick可调用
window.addToCart = addToCart;
window.getProductVariations = getProductVariations;

// 加载全部商品列表
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

// 自动加载商品
loadGoods();