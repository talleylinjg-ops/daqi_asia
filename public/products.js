"use strict";

(function initLayout(){
    // 查看购物车按钮
    const cartViewBtn = document.createElement("button");
    cartViewBtn.innerText = "View Cart";
    cartViewBtn.style.position = "fixed";
    cartViewBtn.style.top = "10px";
    cartViewBtn.style.right = "10px";
    cartViewBtn.style.padding = "6px 12px";
    cartViewBtn.style.background = "#333";
    cartViewBtn.style.color = "#fff";
    cartViewBtn.style.border = "none";
    cartViewBtn.style.borderRadius = "4px";
    cartViewBtn.onclick = getCurrentCart;
    document.body.appendChild(cartViewBtn);

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

// 读取浏览器购物车
async function getCurrentCart() {
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart", {
            credentials: "include"
        });
        const cart = await res.json();
        console.log("【本机浏览器购物车完整数据】", cart);
        alert("打开控制台F12查看购物车打印内容");
    } catch (e) {
        console.error("读取购物车失败", e);
    }
}

// 获取变体ID
async function getVarId(pid) {
    const ck = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
    const cs = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";
    try {
        const res = await fetch(`https://daqi.asia/wp-json/wc/v3/products/${pid}/variations?consumer_key=${ck}&consumer_secret=${cs}`, {
            credentials: "include"
        });
        const list = await res.json();
        if(!list || list.length === 0) return null;
        return list[0].id;
    }catch(e){
        return null;
    }
}

// 加入购物车：移除 X-Requested-With 避免跨域拦截
window.addToCart = async function(pid, type) {
    let targetId = pid;
    if(type === "variable") {
        const vid = await getVarId(pid);
        if(!vid) {
            alert("获取变体失败");
            return;
        }
        targetId = vid;
    }
    const addUrl = `https://daqi.asia/?add-to-cart=${targetId}`;
    try {
        const res = await fetch(addUrl, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "quantity=1"
        });
        alert("Add to cart success! Click View Cart to check");
        getCurrentCart();
    } catch (err) {
        console.error(err);
        alert("Network / CORS error");
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
        console.error(loadErr);
    }
}
window.addEventListener("DOMContentLoaded", loadAllGoods);