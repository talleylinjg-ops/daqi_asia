"use strict";
function getWcNonce(){let n=window.wcStoreNonce??"";console.log("【Nonce调试打印】当前获取到的Nonce: ",n);return n;}
(function(){let v=getWcNonce();console.log("【页面加载】Nonce获取状态：",!!v," 当前Nonce值：",v);})();
async function addToCart(pid,qty=1,extra={}){
    const n=getWcNonce();
    console.log("【加购调试】携带Nonce: ",n);
    const body=JSON.stringify({id:pid,quantity:qty,...extra});
    try{
        const r=await fetch("/wp-json/wc/store/cart/items",{
            method:"POST",
            headers:{"Content-Type":"application/json","X-WC-Store-API-Nonce":n},
            body
        });
        const res=await r.json();
        console.log("加购返回结果：",res);
        const cartR=await fetch("/wp-json/wc/store/cart",{headers:{"X-WC-Store-API-Nonce":n}});
        const cart=await cartR.json();
        console.log("购物车数据：",cart);
        return res;
    }catch(e){console.error("加购请求失败",e);return null;}
}
async function getProductVariations(pid){
    const n=getWcNonce();
    try{
        const r=await fetch(`/wp-json/wc/store/products/${pid}/variations`,{headers:{"X-WC-Store-API-Nonce":n}});
        const d=await r.json();
        if(!r.ok){console.log(`products.js:88 商品${pid}无变体接口，状态码：`,r.status);return [];}
        return d;
    }catch(e){console.error("变体接口请求异常",e);return [];}
}