"use strict";
const CK = "ck_215cd99f4996b2dd6a503ad2a8ff7a7511c0b7fe";
const CS = "cs_9424255ada2191c49b5cd93adeac27880e3e071d";

(async function(){
    const tip = document.createElement("p");
    tip.innerText = "Loading products...";
    document.body.prepend(tip);
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))";

    const listRes = await fetch("https://daqi.asia/wp-json/wc/store/products", {credentials:"include"});
    const goods = await listRes.json();
    tip.remove();

    for(const item of goods){
        const div = document.createElement("div");
        div.dataset.pid = item.id;
        div.dataset.type = item.type;
        div.style.cssText = "border:1px solid #eee;padding:10px;border-radius:6px";
        div.innerHTML = `
            <img src="${item.images[0]?.thumbnail}" style="width:100%;height:auto">
            <h4>${item.name}</h4>
            <div>Price: ${item.prices.price}</div>
            <button class="add-btn" style="width:100%;margin-top:8px;padding:6px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
        `;
        wrap.appendChild(div);
    }
    document.body.prepend(wrap);

    document.querySelectorAll(".add-btn").forEach(btn=>{
        btn.addEventListener("click", async function(){
            const box = this.closest("[data-pid]");
            const pid = Number(box.dataset.pid);
            const type = box.dataset.type;
            const payload = { product_id: pid, quantity: 1 };

            if(type === "variable"){
                const res = await fetch(`https://daqi.asia/proxy-variants.php?pid=${pid}`, {credentials:"include"});
                const data = await res.json();
                if(data.variants.length === 0) return;
                const varItem = data.variants[0];
                payload.variation_id = varItem.id;
                payload.variation = {};
                data.parent_attrs.forEach(attr=>{
                    const match = varItem.attributes.find(a=>a.name === attr.name);
                    payload.variation[attr.slug] = match.option;
                });
            }

            console.log("v3购物车提交体", payload);
            const api = `https://daqi.asia/wp-json/wc/v3/cart/add-item?consumer_key=${CK}&consumer_secret=${CS}`;
            const cartRes = await fetch(api, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                credentials:"include",
                body:JSON.stringify(payload)
            });
            const ret = await cartRes.json();
            if(cartRes.ok) alert("Add to cart success!");
            else {
                console.log(ret);
                alert("Add to cart failed, please retry");
            }
        });
    });
})();