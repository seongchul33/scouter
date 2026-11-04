/* 추가 기능: 위임받은 NFT 표시
   delegate.xyz v2 에서 이 지갑이 받은 위임을 읽고, 위임한 지갑의 BAYC·MAYC·Koda·Otherdeed 를 카드로 보여 준다.
   끄려면 index.html 에서 이 파일의 <script> 줄을 지운다. */
(function(){
  var ST={};
  // getIncomingDelegations 결과(Delegation[]) 해석. 항목당 7칸: type,to,from,rights,contract,tokenId,amount
  function decode(hex){
    var h=(hex||'').slice(2),out=[];if(h.length<128)return out;
    var n=parseInt(h.slice(64,128),16);
    for(var i=0;i<n;i++){
      var b=128+i*448,w=function(k){return h.slice(b+k*64,b+k*64+64)};
      out.push({type:parseInt(w(0),16),from:('0x'+w(2).slice(24)).toLowerCase(),contract:('0x'+w(4).slice(24)).toLowerCase(),tokenId:w(5)?BigInt('0x'+w(5)).toString():'0'});
    }
    return out;
  }
  var colQuery=function(cs){return cs.map(function(c){return 'contractAddresses[]='+COLS[c].addr}).join('&')};
  function load(p){
    var a=p.addr;if(ST[a])return ST[a];
    ST[a]={s:'loading',items:[]};
    rpc([{jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:DELEG,data:'0x42f87c25'+padAddr(a)},'latest']}]).then(function(res){
      var r=(res||[])[0],ds=decode(r&&r.result);
      // 위임한 지갑별로 어떤 컬렉션/토큰을 쓸 수 있는지 정리
      var by={};
      ds.forEach(function(d){
        var c=BY_ADDR[d.contract];
        var o=by[d.from]=by[d.from]||{all:false,cols:{},toks:[]};
        if(d.type===1)o.all=true;
        else if(d.type===2&&c)o.cols[c]=true;
        else if(d.type===3&&c)o.toks.push({c:c,id:+d.tokenId});
      });
      var jobs=Object.keys(by).map(function(from){
        var o=by[from],cs=o.all?Object.keys(COLS):Object.keys(o.cols),list=[];
        var pHold=cs.length?getJSON(API+'getNFTsForOwner?owner='+from+'&'+colQuery(cs)+'&withMetadata=true&pageSize=100').then(function(j){
          (j.ownedNfts||[]).forEach(function(n){var c=BY_ADDR[n.contract.address.toLowerCase()];if(!c)return;var id=+n.tokenId;storeMeta(ikey(c,id),n);list.push({c:c,id:id,from:from})});
        }).catch(function(){}):Promise.resolve();
        // 토큰 단위 위임은 위임한 지갑이 아직 그 NFT를 갖고 있는지 확인(ownerOf)
        var pTok=o.toks.length?rpc(o.toks.map(function(t,i){return{jsonrpc:'2.0',id:i,method:'eth_call',params:[{to:COLS[t.c].addr,data:'0x6352211e'+hex64(t.id)},'latest']}})).then(function(rs){
          o.toks.forEach(function(t,i){var x=(rs||[]).filter(function(y){return y.id===i})[0];if(x&&x.result&&('0x'+x.result.slice(-40)).toLowerCase()===from)list.push({c:t.c,id:t.id,from:from})});
        }).catch(function(){}):Promise.resolve();
        return Promise.all([pHold,pTok]).then(function(){return list});
      });
      return Promise.all(jobs).then(function(ls){
        var seen={},items=[];
        ls.forEach(function(l){l.forEach(function(x){var k=ikey(x.c,x.id);if(seen[k])return;seen[k]=1;items.push(x);mwOf(x.c,x.id)})});
        items.sort(function(x,y){return floorOf(y.c)-floorOf(x.c)});
        ST[a]={s:'ok',items:items,froms:Object.keys(by).length};
      });
    }).catch(function(){ST[a]={s:'err',items:[]}}).then(function(){softRender()});
    return ST[a];
  }
  (window.XT=window.XT||[]).push({
    id:'deleg',
    section:function(p){
      if(!p.real||!p.delegIn)return '';
      var x=load(p);
      var head='<div class="sh"><div><h2>위임받은 NFT</h2><p>delegate.xyz로 위임받아 이 지갑으로 Otherside·Mudwater에서 쓸 수 있는 NFT</p></div></div>';
      var body;
      if(x.s==='loading')body='<div class="panel empty">위임 정보를 불러오는 중…</div>';
      else if(x.s==='err')body='<div class="panel empty">위임 정보를 불러오지 못했습니다.</div>';
      else if(!x.items.length)body='<div class="panel empty">위임은 '+p.delegIn+'건 있지만, 위임한 지갑에 BAYC · MAYC · Koda · Otherdeed가 없습니다.</div>';
      else body='<div class="cards">'+x.items.map(function(n){return nftCard(n,{owner:n.from,sub:'위임: '+short(n.from)})}).join('')+'</div>';
      return '<div class="sec">'+head+body+'</div>';
    }
  });
})();
