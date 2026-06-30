"use strict";
// 直接输出页面内容，不会空白
document.body.innerHTML = `
<div style="max-width:1200px;margin:0 auto;padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">
    <div style="border:1px solid #eee;padding:10px;border-radius:6px;">
        <h4>测试商品 17376</h4>
        <button onclick="addCart(17376)" style="width:100%;padding:8px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
    </div>
    <div style="border:1px solid #eee;padding:10px;border-radius:6px;">
        <h4>测试商品 17375</h4>
        <button onclick="addCart(17375)" style="width:100%;padding:8px;background:#007bff;color:#fff;border:none;border-radius:4px;">Add To Cart</button>
    </div>
</div>
`;

// 加购函数
window.addCart = async function (pidRaw) {
    const pid = parseInt(pidRaw, 10);
    if (isNaN(pid) || pid <= 0) {
        alert("商品ID异常");
        return;
    }
    try {
        const res = await fetch("https://daqi.asia/add-cart-proxy.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pid: pid })
        });
        const ret = await res.json();
        console.log(ret);
        if (ret.success) {
            alert("Add to cart success!");
        } else {
            alert("Add to cart failed");
        }
    } catch (e) {
        console.error(e);
        alert("网络错误");
    }
};