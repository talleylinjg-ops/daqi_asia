"use strict";
function getWcNonce(){return "";}
async function addToCart(pid,qty=1,extra={}){
    const n=getWcNonce();
    const payload={id:pid,quantity:qty,...extra};
    try{
        const res=await fetch("/wp-json/wc/store/cart/items",{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "X-WC-Store-API-Nonce":n
            },
            body:JSON.stringify(payload)
        });
        const addResult=await res.json();
        const cartRes=await fetch("/wp-json/wc/store/cart",{
            headers:{"X-WC-Store-API-Nonce":n}
        });
        const cartData=await cartRes.json();
        return addResult;
    }catch(err){
        console.error("加购请求失败",err);
        return null;
    }
}
async function getProductVariations(pid){
    const n=getWcNonce();
    try{
        const res=await fetch(`/wp-json/wc/store/products/${pid}/variations`,{
            headers:{"X-WC-Store-API-Nonce":n}
        });
        const data=await res.json();
        if(!res.ok){
            console.log(`products.js:88 商品${pid}无变体接口，状态码：`,res.status);
            return [];
        }
        return data;
    }catch(err){
        console.error("变体接口请求异常",err);
        return [];
    }
}