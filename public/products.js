"use strict";
function getWcNonce(){return "";}

// 加购
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
            body:JSON.stringify(payload),
            signal:AbortSignal.timeout(8000)
        });
        const addResult=await res.json();
        const cartRes=await fetch("/wp-json/wc/store/cart",{
            headers:{"X-WC-Store-API-Nonce":n},
            signal:AbortSignal.timeout(8000)
        });
        const cartData=await cartRes.json();
        return addResult;
    }catch(err){
        console.error("加购请求失败",err);
        return null;
    }
}

// 获取商品变体（增加超时+失败提示输出，解决无限加载）
async function getProductVariations(pid){
    const n=getWcNonce();
    try{
        const res=await fetch(`/wp-json/wc/store/products/${pid}/variations`,{
            headers:{"X-WC-Store-API-Nonce":n},
            signal:AbortSignal.timeout(8000)
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