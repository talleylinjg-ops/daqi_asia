"use strict";

async function addToCart(pid, qty = 1, productType = "simple", extra = {}) {
    let payload = { id: pid, quantity: qty, ...extra };
    // 只有可变商品才拉取变体
    if (productType === "variable") {
        const variations = await getProductVariations(pid);
        if (variations && variations.length > 0) {
            payload.variation = variations[0].id;
        }
    }

    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/cart/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000)
        });

        const addResult = await res.json();

        if (!res.ok) {
            alert("Add to cart failed, please retry");
            return null;
        }

        alert("Add to cart success!");
        return addResult;

    } catch (err) {
        alert("Add to cart failed, please retry");
        return null;
    }
}

async function getProductVariations(pid) {
    try {
        const res = await fetch("https://daqi.asia/wp-json/wc/store/products/" + pid + "/variations", {
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data;

    } catch (err) {
        return [];
    }
}

(function initDom() {
    if (!document.querySelector(".loading-tip")) {
        const p = document.createElement("p");
        p.className = "loading-tip";
        p.textContent = "⏳ 加载商品中...";
        document.body.prepend(p);
    }

    if (!document.querySelector(".goods-box")) {
        const d = document.createElement("div");
        d.className = "goods-box";
        d.style.maxWidth = "1200px";
        d.style.margin = "0 auto";
        d.style.padding = "15px";
        document.body.prepend(d);
    }
})();

window.addToCart = addToCart;
window.getProductVariations = getProductVariations;

window.loadGoods = async function () {
    const t = document.querySelector(".loading-tip");
    const b = document.querySelector(".goods-box");

    try {
        const r = await fetch("https://daqi.asia/wp-json/wc/store/products", {
            signal: AbortSignal.timeout(10000)
        });

        const l = await r.json();
        if (!t || !b) return;
        t.style.display = "none";

        let h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';

        l.forEach(function (i) {
            const img = i.images && i.images[0] ? i.images[0].thumbnail : "";
            // 把商品type传给点击事件
            h += '<div style="border:1px solid #eee;padding:10px;border-radius:6px;">';
            if (img) {
                h += '<img src="' + img + '" style="width:100%;height:200px;object-fit:cover;">';
            }
            h += '<h4>' + i.name + '</h4>';
            h += '<div style="color:#c00;">' + i.prices.price_html + '</div>';
            h += '<button onclick="addToCart(' + i.id + ', 1, \'' + i.type + '\')" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>';
            h += '</div>';
        });

        h += '</div>';
        b.innerHTML = h;

    } catch (e) {
        if (t) t.textContent = "加载异常";
    }
};

loadGoods();