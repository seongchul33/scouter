/* 추가 기능: Otherside 플레이어 배지
   ApeChain의 Otherside 프로필 NFT를 가진 지갑 = 게임에 들어와 본 지갑.
   끄려면 index.html 에서 이 파일의 <script> 줄을 지운다. */
(function(){
  var PROFILE='0x484E2cB099c0394E4f4cfEB65aC24D4AD3C6967A';
  var APE_RPC='https://rpc.apechain.com/http';
  var ST={};
  function check(a){
    if(ST[a])return ST[a];
    ST[a]={s:'loading'};
    fetch(APE_RPC,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:PROFILE,data:'0x70a08231'+a.slice(2).toLowerCase().padStart(64,'0')},'latest']})})
    .then(function(r){return r.json()})
    .then(function(j){ST[a]={s:'ok',n:j.result&&j.result.length>2?parseInt(j.result,16):0}})
    .catch(function(){ST[a]={s:'err'}})
    .then(function(){softRender()});
    return ST[a];
  }
  (window.XT=window.XT||[]).push({
    id:'player',
    // 플레이어 지갑이면 '처음 시작하는 순서'를 숨긴다. 확인 중에도 숨겨서 깜빡임을 막는다.
    hideSteps:function(ps){
      return (ps||[]).some(function(p){
        if(!p.real)return false;
        var x=check(p.addr);
        return x.s==='loading'||(x.s==='ok'&&x.n>0);
      });
    },
    badge:function(p){
      if(!p.real)return '';
      var x=check(p.addr);
      if(x.s!=='ok'||!x.n)return '';
      return '<a class="chain" style="background:#EDE9FE;color:#6D28D9;border-color:#DDD6FE;text-decoration:none" href="https://apescan.io/address/'+p.addr+'#nfttransfers" target="_blank" rel="noopener" title="ApeChain에 Otherside 프로필 NFT가 있는 지갑입니다">● Otherside 플레이어</a>';
    }
  });
})();
