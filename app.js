/* ========== 유틸 ========== */
function xmur3(s){var h=1779033703^s.length;for(var i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^=h>>>16)>>>0}}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rngFor(s){return mulberry32(xmur3(s)())}
var $=function(s,r){return(r||document).querySelector(s)};
var fmtUsd=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
var fmtEth=function(n){return n>=100?n.toFixed(0):n>=10?n.toFixed(1):n>=1?n.toFixed(2):n.toFixed(3)};
var fmtPct=function(n){return (n>=0?'+':'')+(n*100).toFixed(1)+'%'};
var short=function(a){return a.slice(0,6)+'…'+a.slice(-4)};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function addrFor(seed){var r=rngFor('addr:'+seed),s='0x';for(var i=0;i<40;i++)s+='0123456789abcdef'[Math.floor(r()*16)];return s}
function grad(seed){var r=rngFor('g:'+seed);var h=Math.floor(r()*360);return 'linear-gradient(135deg,hsl('+h+',70%,60%),hsl('+((h+60)%360)+',70%,45%))'}
function cls(n){return n>=0?'up':'down'}
function getJSON(u,opt){return fetch(u,opt).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}

/* ========== 데이터 ========== */
// 배포 환경에서는 /api/nft 프록시를 거쳐 Alchemy 키를 숨긴다. 파일을 직접 열었을 때(file://)만 공용 demo 키로 바로 호출.
var API=location.protocol==='file:'?'https://eth-mainnet.g.alchemy.com/nft/v3/demo/':'/api/nft/';
var RPC='https://ethereum-rpc.publicnode.com';
var APE_TOKEN='0x4d224452801ACEd8B2F0aebE155379bb5D594381';
var COLS={
  BAYC:{name:'Bored Ape Yacht Club',addr:'0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',lo:0,hi:9999,floor:5.8,packs:10,holders:5582,use:'아바타',ut:'g',rep:5769},
  MAYC:{name:'Mutant Ape Yacht Club',addr:'0x60E4d786628Fea6478F785A6d7e704777c86a7c6',lo:0,hi:9999,floor:0.7238,packs:2,holders:12078,use:'아바타',ut:'g',rep:5000},
  KODA:{name:'Koda',addr:'0xE012Baf811CF9c05c408e879C399960D1f305903',lo:1,hi:9999,floor:0.6096,packs:0,holders:3223,use:'아바타 · 영지 보너스',ut:'g',rep:3829},
  OTHERDEED:{name:'Otherdeed for Otherside',addr:'0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258',lo:1,hi:99999,floor:0.07,packs:0,holders:null,use:'영지 · 자원 채집',ut:'y',rep:12401}
};
var BY_ADDR={};Object.keys(COLS).forEach(function(k){BY_ADDR[COLS[k].addr.toLowerCase()]=k});
var LIVE={eth:2240,ape:0.11,ethLive:false,floorLive:{}};
var SEEDS=['demo-whale.eth','ape-demo.eth','mayc-demo.eth','koda-demo.eth','land-demo.eth','vault-demo.eth',addrFor('w7'),addrFor('w8'),addrFor('w9'),addrFor('w10')];
var SEED_ADDR={};SEEDS.forEach(function(s){SEED_ADDR[s.slice(-4)==='.eth'?addrFor(s):s]=s});
var POP=[['BAYC',5769],['BAYC',8817],['MAYC',5000],['MAYC',1],['KODA',3829],['KODA',1000],['OTHERDEED',12401],['BAYC',1],['MAYC',100],['OTHERDEED',100]];
var START=Date.UTC(2026,9,17),DEADLINE=Date.UTC(2027,0,19);
function dleft(){return Math.ceil((DEADLINE-Date.now())/86400000)}
function dday(){var d=dleft();return d>=0?'D-'+d:'마감'}
function floorOf(c){return COLS[c].floor}

/* ========== 실시간 가격 ========== */
function loadPrices(){
  getJSON('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,apecoin&vs_currencies=usd').then(function(j){
    if(j.ethereum&&j.ethereum.usd){LIVE.eth=j.ethereum.usd;LIVE.ethLive=true}
    if(j.apecoin&&j.apecoin.usd)LIVE.ape=j.apecoin.usd;
    paintEth();softRender();
  }).catch(function(){});
  Object.keys(COLS).forEach(function(c){
    getJSON(API+'getFloorPrice?contractAddress='+COLS[c].addr).then(function(j){
      var f=j.openSea&&j.openSea.floorPrice;if(f){COLS[c].floor=f;LIVE.floorLive[c]=true;softRender()}
    }).catch(function(){});
  });
}
function paintEth(){$('#ethpx').textContent='ETH $'+Math.round(LIVE.eth).toLocaleString('en-US')}

/* ========== NFT 이미지 (Alchemy) ========== */
var IMG={},META={},QUEUE=[],qTimer=null;
function ikey(c,id){return c+':'+id}
function queueImg(c,id){var k=ikey(c,id);if(IMG[k]!==undefined||QUEUE.indexOf(k)>=0)return;QUEUE.push(k);clearTimeout(qTimer);qTimer=setTimeout(flushImgs,20)}
function flushImgs(){
  var ks=QUEUE.splice(0,100);if(!ks.length)return;
  ks.forEach(function(k){IMG[k]=null});
  fetch(API+'getNFTMetadataBatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tokens:ks.map(function(k){var p=k.split(':');return{contractAddress:COLS[p[0]].addr,tokenId:p[1]}})})})
  .then(function(r){return r.json()}).then(function(j){
    (j.nfts||[]).forEach(function(n){var c=BY_ADDR[(n.contract&&n.contract.address||'').toLowerCase()];if(!c)return;var k=ikey(c,n.tokenId);storeMeta(k,n)});
    ks.forEach(function(k){if(!IMG[k])IMG[k]=false;applyImg(k)});
  }).catch(function(){ks.forEach(function(k){IMG[k]=false;applyImg(k)})});
  if(QUEUE.length)setTimeout(flushImgs,40);
}
function storeMeta(k,n){
  var im=n.image||{};IMG[k]=im.thumbnailUrl||im.cachedUrl||im.pngUrl||false;
  var md=(n.raw&&n.raw.metadata)||{};
  META[k]={big:im.cachedUrl||im.pngUrl||im.thumbnailUrl||null,traits:md.attributes||md.traits||[],rank:md.rarity&&md.rarity.rank||null};
}
function applyImg(k){
  var u=IMG[k];document.querySelectorAll('.art[data-k="'+k+'"]').forEach(function(el){setImg(el,u)});
}
function setImg(el,u){
  el.classList.remove('sk');
  if(!u||el.querySelector('img'))return;
  var big=el.hasAttribute('data-big'),k=el.getAttribute('data-k'),src=big&&META[k]&&META[k].big?META[k].big:u;
  var im=new Image();im.alt='';im.decoding='async';
  im.onload=function(){im.classList.add('ok')};im.onerror=function(){im.remove()};
  im.src=src;el.appendChild(im);
}
function artHtml(c,id,big){
  var k=ikey(c,id),known=IMG[k];
  if(known===undefined)queueImg(c,id);
  return '<div class="art'+(known===undefined||known===null?' sk':'')+'" data-k="'+k+'"'+(big?' data-big':'')+'>'+svgArt(c,id)+'</div>';
}
function hydrateImgs(){document.querySelectorAll('.art[data-k]').forEach(function(el){var u=IMG[el.getAttribute('data-k')];if(u!==undefined&&u!==null)setImg(el,u)})}
function svgArt(c,id){
  var r=rngFor('art:'+c+id),h=Math.floor(r()*360);
  var s='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="hsl('+h+',45%,90%)"/>';
  s+='<circle cx="50" cy="56" r="26" fill="hsl('+h+',40%,80%)"/><circle cx="50" cy="56" r="26" fill="none" stroke="hsl('+h+',40%,70%)" stroke-width="1"/>';
  s+='<text x="50" y="61" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="hsl('+h+',35%,38%)">'+c.slice(0,4)+'</text>';
  return s+'</svg>';
}

/* ========== 지갑 데이터 ========== */
var WAL={};
function isSeed(id){return SEEDS.indexOf(id)>=0}
function series(seed){var r=rngFor('s:'+seed),v=new Array(91);v[90]=1;var drift=(r()-.45)*0.006;for(var j=89;j>=0;j--)v[j]=v[j+1]*(1-drift+(r()-.5)*0.035);return v}
/* ========== Mudwater 신청 여부 (온체인 실시간) ==========
   Totems 컨트랙트(mudwater.bayc.com/v1/release.json 의 entitlementContract)를 직접 조회.
   ape 키: BAYC = tokenId, MAYC = tokenId | 2^255 */
var TOTEMS='0x1Be98Ff2D1FB66Abcb9809c6dc90DEdE1f97eeC8';
var DELEG='0x00000000000000447e69651d841bD8D104Bed493';
var MW={},MWQ=[],mwT=null;
function hex64(n){return BigInt(n).toString(16).padStart(64,'0')}
function mwArg(c,id){return c==='MAYC'?(BigInt(id)|(1n<<255n)).toString(16).padStart(64,'0'):hex64(id)}
function mwOf(c,id){if(!COLS[c]||!COLS[c].packs)return null;var k=ikey(c,id);if(!MW[k]){MW[k]={status:'loading'};MWQ.push([c,id]);clearTimeout(mwT);mwT=setTimeout(flushMw,20)}return MW[k]}
function flushMw(){
  var list=MWQ.splice(0,40);if(!list.length)return;
  var b=[];list.forEach(function(x,i){var a=mwArg(x[0],x[1]);
    b.push({jsonrpc:'2.0',id:i*3,method:'eth_call',params:[{to:TOTEMS,data:'0x0361bf14'+a},'latest']});
    b.push({jsonrpc:'2.0',id:i*3+1,method:'eth_call',params:[{to:TOTEMS,data:'0x7ed0f1c1'+a},'latest']});
    b.push({jsonrpc:'2.0',id:i*3+2,method:'eth_call',params:[{to:TOTEMS,data:'0x933f4f6f'+a},'latest']})});
  rpc(b).then(function(res){
    var g=function(i){var o=(res||[]).filter(function(r){return r.id===i})[0];return o&&o.result};
    list.forEach(function(x,i){var r=g(i*3),d=g(i*3+1),c=g(i*3+2),k=ikey(x[0],x[1]);
      if(!r||r==='0x'){MW[k]={status:'err'};return}
      var cl='0x'+c.slice(-40);MW[k]={status:'ok',left:parseInt(r,16),done:parseInt(d,16),claimant:/^0x0+$/.test(cl)?null:cl}});
  }).catch(function(){list.forEach(function(x){MW[ikey(x[0],x[1])]={status:'err'}})})
  .then(function(){softRender();if(MWQ.length)setTimeout(flushMw,40)});
}
/* NFT 하나의 미신청 팩 수. 조회 전/실패/대상 아님이면 0 */
function packsLeft(c,id){var m=mwOf(c,id);return m&&m.status==='ok'?m.left:0}
/* delegate.xyz v2: 지갑의 위임 건수 (나가는/들어오는) */
function delegCount(hex){if(!hex||hex.length<130)return 0;return parseInt(hex.slice(66,130),16)||0}
function padAddr(a){return a.slice(2).toLowerCase().padStart(64,'0')}
function sampleWallet(id){
  var key=id.toLowerCase(),isEns=key.slice(-4)==='.eth',addr=isEns?addrFor(key):key;
  var r=rngFor('p:'+addr),big=SEEDS.indexOf(key)>-1&&SEEDS.indexOf(key)<6;
  var n=2+Math.floor(r()*5)+(big?4:0),nfts=[];
  var pick=key==='land-demo.eth'?['OTHERDEED','OTHERDEED','KODA']:key==='koda-demo.eth'?['KODA','KODA','OTHERDEED']:key==='mayc-demo.eth'?['MAYC','MAYC','MAYC']:null;
  for(var i=0;i<n;i++){var pk=r(),c=pick&&i<3?pick[i]:pk<.3?'BAYC':pk<.65?'MAYC':pk<.85?'KODA':'OTHERDEED',C=COLS[c],tid=C.lo+Math.floor(r()*(C.hi-C.lo+1));
    if(!nfts.some(function(x){return x.c===c&&x.id===tid}))nfts.push({c:c,id:tid})}
  return {key:key,id:isSeed(key)?key:key,addr:addr,ens:isEns?key:(SEED_ADDR[addr]&&SEED_ADDR[addr].slice(-4)==='.eth'?SEED_ADDR[addr]:null),nfts:nfts,eth:Math.round(r()*4000)/100,ape:Math.floor(r()*3000),real:false,ratio:series(addr),vault:r()<.45,res:Math.floor(r()*30),status:'ok'};
}
function finish(p){
  p.nfts.forEach(function(x){mwOf(x.c,x.id)});
  p.nfts.sort(function(a,b){return floorOf(b.c)-floorOf(a.c)});
  return p;
}
function wallet(id){
  var key=id.toLowerCase();
  if(WAL[key])return WAL[key];
  if(isSeed(key)||SEED_ADDR[key]){WAL[key]=finish(sampleWallet(SEED_ADDR[key]||key));return WAL[key]}
  WAL[key]={key:key,id:key,status:'loading'};
  loadReal(key);
  return WAL[key];
}
function rpc(batch){return getJSON(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(batch)})}
function loadReal(key){
  var isEns=key.slice(-4)==='.eth';
  var resolve=isEns?getJSON('https://api.ensideas.com/ens/resolve/'+encodeURIComponent(key)).then(function(j){if(!j.address)throw new Error('ens');return{addr:j.address.toLowerCase(),ens:key,avatar:j.avatar}})
    :getJSON('https://api.ensideas.com/ens/resolve/'+key).then(function(j){return{addr:key,ens:j.name||null,avatar:j.avatar}}).catch(function(){return{addr:key,ens:null}});
  resolve.then(function(info){
    var q=Object.keys(COLS).map(function(c){return 'contractAddresses[]='+COLS[c].addr}).join('&');
    var nftP=getJSON(API+'getNFTsForOwner?owner='+info.addr+'&'+q+'&withMetadata=true&pageSize=100');
    var balP=rpc([{jsonrpc:'2.0',id:1,method:'eth_getBalance',params:[info.addr,'latest']},{jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:APE_TOKEN,data:'0x70a08231'+info.addr.slice(2).padStart(64,'0')},'latest']},{jsonrpc:'2.0',id:3,method:'eth_call',params:[{to:DELEG,data:'0x51525e9a'+padAddr(info.addr)},'latest']},{jsonrpc:'2.0',id:4,method:'eth_call',params:[{to:DELEG,data:'0x42f87c25'+padAddr(info.addr)},'latest']}]).catch(function(){return[]});
    return Promise.all([nftP,balP]).then(function(res){
      var j=res[0],b=res[1]||[],nfts=[];
      (j.ownedNfts||[]).forEach(function(n){var c=BY_ADDR[n.contract.address.toLowerCase()];if(!c)return;var id=+n.tokenId;storeMeta(ikey(c,id),n);nfts.push({c:c,id:id})});
      var raw=function(i){var x=b.filter&&b.filter(function(o){return o.id===i})[0];return x&&x.result},get=function(i){var x=b.filter&&b.filter(function(o){return o.id===i})[0];return x&&x.result?parseInt(x.result,16)/1e18:0};
      var p={key:key,id:key,addr:info.addr,ens:info.ens,nfts:nfts,more:j.totalCount>nfts.length?j.totalCount:0,eth:get(1),ape:get(2),real:true,ratio:series(info.addr),vault:delegCount(raw(3))>0,delegOut:delegCount(raw(3)),delegIn:delegCount(raw(4)),res:Math.floor(rngFor('res'+info.addr)()*30),status:'ok'};
      WAL[key]=finish(p);
    });
  }).catch(function(e){WAL[key]={key:key,id:key,status:'err',msg:isEns?'이 ENS 이름을 찾지 못했습니다.':'지갑 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}})
  .then(function(){if(curWalletKeys().indexOf(key)>=0)softRender()});
}
function nftValue(p){return p.nfts.reduce(function(a,x){return a+floorOf(x.c)*LIVE.eth},0)}
function total(p){return nftValue(p)+p.eth*LIVE.eth+p.ape*LIVE.ape}
function vals(p){var t=total(p);return p.ratio.map(function(x){return x*t})}
function ret(p,d){return p.ratio[90]/p.ratio[90-d]-1}
function unclaimed(p){return p.nfts.reduce(function(a,x){return a+packsLeft(x.c,x.id)},0)}
function topNft(p){return p.nfts[0]}

/* ========== 저장 (브라우저) ========== */
var MEM=[];
function loadSaved(){try{var v=localStorage.getItem('scouter.wallets');return v?JSON.parse(v):MEM}catch(e){return MEM}}
function storeSaved(a){MEM=a;try{localStorage.setItem('scouter.wallets',JSON.stringify(a))}catch(e){}}
function isSaved(id){return loadSaved().indexOf(id)>=0}
function toggleSave(id){var a=loadSaved().slice(),i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);storeSaved(a);updateBadge()}
function updateBadge(){var n=loadSaved().length,b=$('#meCount');b.style.display=n?'inline-block':'none';b.textContent=n}

/* ========== 차트 ========== */
var CH={};
function chartHtml(key,v,unit){
  CH[key]={v:v,unit:unit};var W=760,H=230,pl=58,pr=10,pt=14,pb=26,mn=Math.min.apply(null,v),mx=Math.max.apply(null,v);
  if(mx===mn){mx+=1;mn-=1}var pad=(mx-mn)*.12;mn-=pad;mx+=pad;
  var X=function(i){return pl+(W-pl-pr)*i/(v.length-1)},Y=function(x){return pt+(H-pt-pb)*(1-(x-mn)/(mx-mn))};
  var d=v.map(function(x,i){return(i?'L':'M')+X(i).toFixed(1)+' '+Y(x).toFixed(1)}).join(' ');
  var up=v[v.length-1]>=v[0],col=up?'#16A34A':'#DC2626',area=d+' L'+X(v.length-1)+' '+(H-pb)+' L'+pl+' '+(H-pb)+' Z';
  var lab=function(x){return unit==='eth'?fmtEth(x):x>=1e6?'$'+(x/1e6).toFixed(1)+'M':x>=1e3?'$'+(x/1e3).toFixed(0)+'K':fmtUsd(x)};
  var g='';for(var k=0;k<4;k++){var y=Y(mn+(mx-mn)*k/3);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#EEF2F7"/><text x="'+(pl-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="11" font-family="ui-monospace,Consolas,monospace" fill="#94A3B8">'+lab(mn+(mx-mn)*k/3)+'</text>'}
  var xs='';[0,Math.floor((v.length-1)/2),v.length-1].forEach(function(i){var dt=new Date(Date.now()-(v.length-1-i)*86400000);xs+='<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="'+(i===0?'start':i===v.length-1?'end':'middle')+'" font-size="11" font-family="ui-monospace,Consolas,monospace" fill="#94A3B8">'+(dt.getMonth()+1)+'/'+dt.getDate()+'</text>'});
  return '<div class="chart" data-ck="'+key+'"><svg viewBox="0 0 '+W+' '+H+'"><defs><linearGradient id="gr'+key+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".22"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+g+xs+'<path d="'+area+'" fill="url(#gr'+key+')"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2.2" stroke-linejoin="round"/><line class="cx" x1="0" x2="0" y1="'+pt+'" y2="'+(H-pb)+'" stroke="#94A3B8" stroke-dasharray="3 3" style="display:none"/><circle class="cd" r="4.5" fill="'+col+'" stroke="#fff" stroke-width="2" style="display:none"/></svg><div class="tip"></div></div>';
}
function bindCharts(){
  document.querySelectorAll('.chart').forEach(function(el){
    var o=CH[el.dataset.ck];if(!o)return;var v=o.v,svg=$('svg',el),tip=$('.tip',el),cx=$('.cx',el),cd=$('.cd',el);
    var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v);if(mx===mn){mx+=1;mn-=1}var pad=(mx-mn)*.12;mn-=pad;mx+=pad;
    el.onmousemove=function(e){var rc=svg.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*760,i=Math.round((x-58)/(760-68)*(v.length-1));
      if(i<0||i>v.length-1){tip.style.display='none';cx.style.display=cd.style.display='none';return}
      var X=58+(760-68)*i/(v.length-1),Y=14+(230-40)*(1-(v[i]-mn)/(mx-mn));
      cx.setAttribute('x1',X);cx.setAttribute('x2',X);cd.setAttribute('cx',X);cd.setAttribute('cy',Y);cx.style.display=cd.style.display='';
      var dt=new Date(Date.now()-(v.length-1-i)*86400000);tip.style.display='block';tip.textContent=(dt.getMonth()+1)+'/'+dt.getDate()+'  '+(o.unit==='eth'?fmtEth(v[i])+' ETH':fmtUsd(v[i]));
      tip.style.left=Math.max(4,Math.min(e.clientX-rc.left+14,rc.width-150))+'px'};
    el.onmouseleave=function(){tip.style.display='none';cx.style.display=cd.style.display='none'};
  });
}

/* ========== 검색 ========== */
var cat='all';
var CATS=[['all','전체'],['wallet','지갑'],['ens','ENS'],['nft','NFT']];
var PH={all:'지갑 주소, ENS, NFT 번호 (예: BAYC #5769)',wallet:'0x로 시작하는 지갑 주소',ens:'name.eth',nft:'컬렉션 + 번호 (예: MAYC #5000)'};
var ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
function searchHtml(big){return '<div class="sb-row">'+ICON+'<input class="q" autocomplete="off" spellcheck="false" placeholder="'+esc(PH[cat])+'">'+(big?'':'<span class="kbd">/</span>')+'<button class="go" type="button">검색</button></div><div class="sug"></div>'}
var ALIAS={bayc:'BAYC','bored ape':'BAYC','bored apes':'BAYC',mayc:'MAYC','mutant ape':'MAYC',koda:'KODA',otherdeed:'OTHERDEED',deed:'OTHERDEED'};
function nftOf(low){var m=low.match(/^(bayc|mayc|koda|otherdeed|bored apes?|mutant ape|deed)\s*[#\-]?\s*(\d{1,6})$/);return m?{c:ALIAS[m[1]],id:+m[2]}:null}
function parse(q){
  q=q.trim();if(!q)return null;var low=q.toLowerCase();
  var n=nftOf(low);
  if(n&&(cat==='all'||cat==='nft')){var C=COLS[n.c];if(n.id<C.lo||n.id>C.hi)return{t:'none',msg:n.c+' 번호는 '+C.lo+'부터 '+C.hi.toLocaleString('en-US')+'까지입니다.'};return{t:'nft',c:n.c,id:n.id}}
  if(/^0x[0-9a-f]{40}$/.test(low)&&(cat==='all'||cat==='wallet'))return{t:'wallet',id:low};
  if(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/.test(low)&&(cat==='all'||cat==='ens'))return{t:'wallet',id:low};
  if(cat==='ens'&&/^[a-z0-9-]+$/.test(low))return{t:'wallet',id:low+'.eth'};
  if(cat!=='nft'){var s=SEEDS.filter(function(x){return x.indexOf(low)>=0})[0];if(s)return{t:'wallet',id:s}}
  return{t:'none'};
}
function go(p){if(p.t==='wallet')nav('/wallet/'+encodeURIComponent(p.id));else if(p.t==='nft')nav('/nft/'+p.c+'/'+p.id)}
function sugW(id){var p=isSeed(id)?wallet(id):null,t=p&&p.nfts&&topNft(p);return '<a href="#" data-fill="'+esc(id)+'"><span class="th">'+(t?artHtml(t.c,t.id):'')+'</span><span class="mono">'+esc(id.slice(0,2)==='0x'?short(id):id)+'</span><span class="t w">'+(id.slice(-4)==='.eth'?'ENS':'지갑')+'</span></a>'}
function sugN(c,id){return '<a href="#" data-fill="'+esc(c)+' #'+id+'"><span class="th">'+artHtml(c,id)+'</span><span>'+esc(c)+' <span class="mono">#'+id+'</span></span><span class="t n">NFT</span></a>'}
function suggestions(q){
  var low=q.trim().toLowerCase(),out=[];
  if(!low){out.push('<div class="hd">인기 검색</div>');SEEDS.slice(0,3).forEach(function(s){out.push(sugW(s))});POP.slice(0,3).forEach(function(n){out.push(sugN(n[0],n[1]))});return out.join('')}
  if(cat!=='nft')SEEDS.filter(function(s){return s.indexOf(low)>=0}).slice(0,4).forEach(function(s){out.push(sugW(s))});
  if(cat==='all'||cat==='nft'){
    var tok=low.split(/[\s#\-]/)[0],num=(low.match(/(\d+)/)||[])[1],cs=[];
    if(tok.length>=2){Object.keys(COLS).forEach(function(c){if(c.toLowerCase().indexOf(tok)===0)cs.push(c)});if('bored'.indexOf(tok)===0)cs.push('BAYC');if('mutant'.indexOf(tok)===0)cs.push('MAYC')}
    cs.filter(function(c,i){return cs.indexOf(c)===i}).forEach(function(c){if(num&&+num>=COLS[c].lo&&+num<=COLS[c].hi)out.push(sugN(c,+num));else if(!num)POP.filter(function(n){return n[0]===c}).slice(0,2).forEach(function(n){out.push(sugN(n[0],n[1]))})});
  }
  var pr=parse(q);if(pr&&pr.t==='wallet'&&!out.length)out.push(sugW(pr.id));if(pr&&pr.t==='nft'&&!out.length)out.push(sugN(pr.c,pr.id));
  return out.join('')||'<div class="none">일치하는 항목이 없습니다</div>';
}
function mountSearch(host,big){
  host.innerHTML=searchHtml(big);
  var q=$('.q',host),s=$('.sug',host),btn=$('.go',host),idx=-1;
  var open=function(){idx=-1;s.innerHTML=suggestions(q.value);s.classList.add('open');hydrateImgs()};
  var submit=function(){
    var p=parse(q.value);if(!p)return;
    if(p.t==='none'&&!p.msg){var first=s.querySelector('a[data-fill]');if(first){q.value=first.dataset.fill;p=parse(q.value)}}
    if(!p||p.t==='none'){s.innerHTML='<div class="none">'+esc(p&&p.msg||'찾지 못했습니다. 지갑 주소, ENS, NFT 번호를 확인해 주세요.')+'</div>';s.classList.add('open');return}
    s.classList.remove('open');q.blur();go(p);
  };
  q.addEventListener('focus',open);q.addEventListener('input',open);
  q.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();submit();return}
    if(e.key==='Escape'){s.classList.remove('open');q.blur();return}
    var items=[].slice.call(s.querySelectorAll('a[data-fill]'));if(!items.length)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();idx=e.key==='ArrowDown'?(idx+1)%items.length:(idx-1+items.length)%items.length;items.forEach(function(x,i){x.classList.toggle('act',i===idx)});q.value=items[idx].dataset.fill}
  });
  btn.addEventListener('click',function(e){e.preventDefault();submit()});
  document.addEventListener('click',function(e){if(!host.contains(e.target))s.classList.remove('open')});
  s.addEventListener('click',function(e){var a=e.target.closest('a[data-fill]');if(!a)return;e.preventDefault();q.value=a.dataset.fill;s.classList.remove('open');q.focus()});
}

/* ========== 화면 조각 ========== */
var S={rank:30,period:30,mePeriod:30,pop:'floor',v3:false};
function walletName(p){return p.ens||short(p.addr)}
function whoCell(p){var t=topNft(p);return '<div class="who"><span class="th">'+(t?artHtml(t.c,t.id):'')+'</span><div style="min-width:0"><div class="nm">'+esc(walletName(p))+'</div><div class="sm">'+short(p.addr)+'</div></div></div>'}
function nftCard(n,opt){
  opt=opt||{};var C=COLS[n.c],pk=packsLeft(n.c,n.id);
  return '<a class="card" href="#" data-nav="/nft/'+n.c+'/'+n.id+(opt.owner?'?o='+encodeURIComponent(opt.owner):'')+'"><div style="position:relative">'+(opt.rank?'<span class="rkb">#'+opt.rank+'</span>':'')+(pk?'<span class="pk">미신청 '+pk+'팩</span>':'')+artHtml(n.c,n.id)+'<span class="b3d" data-nav="/nft/'+n.c+'/'+n.id+'?v=3d'+(opt.owner?'&o='+encodeURIComponent(opt.owner):'')+'">3D 보기</span></div>'
  +'<div class="in"><div class="t1"><b>'+n.c+'</b><span>#'+n.id+'</span></div><div class="t2">'+(opt.sub?esc(opt.sub):C.name)+'</div>'
  +'<div class="t3"><div><small>FLOOR</small><b>'+fmtEth(C.floor)+' ETH</b></div><span class="tag '+C.ut+'">'+C.use.split(' ·')[0]+'</span></div></div></a>';
}
function seg(act,cur,opts){return '<div class="seg">'+opts.map(function(o){return '<button data-act="'+act+'" data-v="'+o[0]+'" class="'+(cur===o[0]?'on':'')+'">'+o[1]+'</button>'}).join('')+'</div>'}
var PER=[[7,'7D'],[30,'30D'],[90,'90D']];

/* ========== 홈 ========== */
function viewHome(){
  var chips=['demo-whale.eth','BAYC #5769','MAYC #5000','KODA #3829'].map(function(x){return '<a href="#" data-fill="'+esc(x)+'">'+esc(x)+'</a>'}).join('');
  var h='<section class="hero"><div class="big"><img src="img/logo-icon.png" alt=""><span>otherbridge</span></div><p>지갑과 NFT를 검색하고, 오늘의 플레이 가이드를 확인하세요</p>'
   +'<div class="cats">'+CATS.map(function(c){return '<button data-act="cat" data-v="'+c[0]+'" class="'+(cat===c[0]?'on':'')+'">'+c[1]+'</button>'}).join('')+'</div><div class="sb" id="homesb"></div><div class="chips">'+chips+'</div></section>';
  h+=myBlock();
  var pop=POP.slice(0,8).map(function(n){return{c:n[0],id:n[1]}});if(S.pop==='floor')pop.sort(function(a,b){return floorOf(b.c)-floorOf(a.c)});
  h+='<div class="sec"><div class="sh"><div><h2>많이 찾는 NFT</h2><p>눌러서 이 NFT로 할 수 있는 것을 확인하세요</p></div>'+seg('pop',S.pop,[['floor','바닥가순'],['search','검색순']])+'</div><div class="cards">'+pop.map(function(n,i){return nftCard(n,{rank:i+1})}).join('')+'</div></div>';
  return h;
}
function myBlock(){
  var ids=loadSaved();
  var head='<div class="sh"><div><h2>내 정보</h2><p>저장한 지갑을 합쳐서 보여 줍니다</p></div>'+(ids.length?'<a href="#" class="more" data-nav="/me">마이페이지 전체 보기 →</a>':'')+'</div>';
  if(!ids.length)return '<div class="sec">'+head+'<div class="panel empty"><b>저장한 지갑이 없습니다</b>지갑을 검색한 뒤 <b style="display:inline;color:#0F766E">+ 내 지갑 추가</b>를 누르면 여기에 자산과 받을 수 있는 혜택이 나옵니다.<div style="margin-top:16px"><button class="btn pri" data-act="save" data-id="demo-whale.eth">예시 지갑으로 보기</button></div></div></div>';
  var all=ids.map(wallet),ps=all.filter(function(p){return p.status==='ok'});
  if(!ps.length)return '<div class="sec">'+head+'<div class="stats">'+[1,2,3,4].map(function(){return '<div class="panel stat"><div class="skl" style="width:50%"></div><div class="skl" style="height:22px;width:70%"></div></div>'}).join('')+'</div></div>';
  var d=S.mePeriod,sum=new Array(91).fill(0);ps.forEach(function(p){vals(p).forEach(function(x,i){sum[i]+=x})});
  var r=sum[90]/sum[90-d]-1,nfts=[];ps.forEach(function(p){p.nfts.forEach(function(n){nfts.push({n:n,o:p})})});
  nfts.sort(function(a,b){return floorOf(b.n.c)-floorOf(a.n.c)});
  var un=ps.reduce(function(a,p){return a+unclaimed(p)},0);
  var h='<div class="sec">'+head
   +'<div class="stats"><div class="panel stat"><small>합산 자산</small><b>'+fmtUsd(sum[90])+'</b><em>'+fmtEth(sum[90]/LIVE.eth)+' ETH</em></div><div class="panel stat"><small>'+d+'일 수익률</small><b class="'+cls(r)+'">'+fmtPct(r)+'</b><em>합산 기준</em></div><div class="panel stat"><small>지갑 · NFT</small><b>'+ps.length+' · '+nfts.length+'</b><em>'+(all.length>ps.length?(all.length-ps.length)+'개 불러오는 중':'모두 불러옴')+'</em></div><div class="panel stat'+(un?' hot':'')+'"><small>받을 수 있는 혜택</small><b style="'+(un?'color:var(--vio)':'')+'">'+(un?un+'팩':'없음')+'</b><em>Mudwater '+dday()+'</em></div></div>'
   +'<div class="mygrid"><div class="panel"><div class="ph"><h3>내 지갑</h3></div><table><thead><tr><th>지갑</th><th class="r">자산</th><th class="r hide-m">'+d+'D</th><th class="r">미신청</th></tr></thead><tbody>'
   +ps.map(function(p){var x=ret(p,d),u=unclaimed(p);return '<tr data-nav="/wallet/'+encodeURIComponent(p.id)+'"><td>'+whoCell(p)+'</td><td class="r num">'+fmtUsd(total(p))+'</td><td class="r num hide-m '+cls(x)+'">'+fmtPct(x)+'</td><td class="r num" style="color:var(--vio)">'+(u?u+'팩':'—')+'</td></tr>'}).join('')+'</tbody></table></div>'
   +'<div class="panel"><div class="ph"><h3>내 NFT 상위 '+Math.min(6,nfts.length)+'개<small>바닥가 높은 순</small></h3>'+(nfts.length>6?'<a href="#" class="more" data-nav="/me">전체 '+nfts.length+'개 →</a>':'')+'</div><div class="mini">'
   +nfts.slice(0,6).map(function(x){var C=COLS[x.n.c],pk=packsLeft(x.n.c,x.n.id);return '<a class="mcard" href="#" data-nav="/nft/'+x.n.c+'/'+x.n.id+'?o='+encodeURIComponent(x.o.id)+'"><div style="position:relative">'+artHtml(x.n.c,x.n.id)+(pk?'<span class="pk">'+pk+'팩</span>':'')+'</div><div class="mi"><b>'+x.n.c+' #'+x.n.id+'</b><span>'+fmtEth(C.floor)+' ETH</span></div></a>'}).join('')
   +'</div></div></div></div>';
  return h;
}
function kpiFloor(c){var C=COLS[c];return '<div class="panel kpi"><div class="k">'+c+' 바닥가</div><div class="v">'+fmtEth(C.floor)+'<small>ETH</small></div><div class="src'+(LIVE.floorLive[c]?' live':'')+'">'+(LIVE.floorLive[c]?'OpenSea 실시간 · ':'')+fmtUsd(C.floor*LIVE.eth)+'</div></div>'}

/* ========== 가이드 ========== */
function guideBlock(ps){
  var un=ps.reduce(function(a,p){return a+unclaimed(p)},0),res=ps.reduce(function(a,p){return a+p.res},0),vault=ps.some(function(p){return p.vault}),din=ps.reduce(function(a,p){return a+(p.delegIn||0)},0);
  var hasDeed=ps.some(function(p){return p.nfts.some(function(n){return n.c==='OTHERDEED'})});
  var cr=rngFor('craft:'+ps.map(function(p){return p.addr}).join()),craft=[{n:'고급 촉매제 제작 후 판매',m:'희귀 파편 '+(4+Math.floor(cr()*12))+'개',g:.08+cr()*.22},{n:'영지 보너스 조합 제작',m:'파편 + 침전물',g:.03+cr()*.15},{n:'침전물 그대로 판매',m:'침전물 '+(10+Math.floor(cr()*40))+'개',g:-.02+cr()*.06}];
  var o='<div class="sec"><div class="sh"><div><h2>플레이 가이드</h2><p>지금 할 수 있는 것부터</p></div></div><div class="guide">';
  o+=un>0?'<div class="panel gd hot"><span class="tag v">Mudwater · '+dday()+'</span><div class="big">'+un+'팩</div><h4>아직 받지 않은 카드팩</h4><p>마감 2027-01-19. NFT를 팔면 받지 않은 팩도 함께 넘어갑니다.</p><div><a class="btn pri" href="https://mudwater.bayc.com" target="_blank" rel="noopener">공식 사이트로 이동 ↗</a></div></div>'
        :'<div class="panel gd"><span class="tag s">Mudwater</span><h4>받을 카드팩이 없습니다</h4><p>보유 NFT의 카드팩을 모두 받았거나 대상 NFT가 없습니다.</p></div>';
  o+='<div class="panel gd"><span class="tag s">약 10분</span><h4>오늘의 일일 퀘스트</h4><p>일일 퀘스트를 1회 완료하고 경험치를 쌓으세요.</p></div>';
  o+='<div class="panel gd"><span class="tag y">오늘 받을 수 있음</span><h4>영지 채집 자원 '+res+'개</h4><p>'+(hasDeed?'내 영지에서 채집된 자원을 받고, 다른 플레이어의 채집 수수료를 확인하세요.':'다른 영지에서 채집한 자원을 확인하고 받으세요.')+'</p></div>';
  o+='</div></div>';
  o+='<div class="sec"><div class="sh"><div><h2>제작 경로 추천</h2><p>보유 자원으로 만들 수 있는 것</p></div></div><div class="panel"><table><thead><tr><th>경로</th><th>필요 자원</th><th class="r">예상 수익률</th></tr></thead><tbody>'+craft.map(function(c){return '<tr style="cursor:default"><td style="font-weight:700">'+c.n+'</td><td style="color:var(--sub)">'+c.m+'</td><td class="r num '+cls(c.g)+'">'+fmtPct(c.g)+'</td></tr>'}).join('')+'</tbody></table></div></div>';
  o+='<div class="sec"><div class="sh"><div><h2>처음 시작하는 순서</h2></div></div><div class="steps"><div class="panel step"><b>Otherside 입장</b><span>내 지갑 또는 위임 지갑으로 접속</span></div><div class="panel step"><b>아바타 적용</b><span>아바타 변경(F1)에서 내 NFT 선택</span></div><div class="panel step"><b>퀘스트 · Mudwater 대전</b><span>일일 퀘스트 또는 카드 대전</span></div><div class="panel step"><b>모임 · 행사</b><span>소모임과 행사에 참여</span></div></div></div>';
  o+='<div class="sec"><div class="panel note"><i>↗</i><div>'+(din?'이 지갑은 다른 지갑에서 위임을 '+din+'건 받았습니다 (delegate.xyz). 위임한 지갑의 NFT로 게임에 접속하고, 해당 ape의 Mudwater 팩도 이 지갑에서 신청할 수 있습니다.':vault?'보관 지갑이 위임으로 연결되어 있습니다 (delegate.xyz). 사용 지갑으로 접속하면 NFT를 옮기지 않고 게임에서 쓸 수 있습니다.':'고가 NFT를 보관 지갑에 두었다면 <a href="https://delegate.xyz" target="_blank" rel="noopener">delegate.xyz</a>에서 위임을 설정해 NFT를 옮기지 않고 접속할 수 있습니다.')+'</div></div></div>';
  return o;
}

/* ========== 지갑 ========== */
function loadingView(t){return '<div class="whead"><div class="av"><div class="art sk" style="aspect-ratio:1"></div></div><div style="flex:1;max-width:340px"><div class="skl" style="height:26px;width:60%"></div><div class="skl" style="width:90%"></div></div></div><div class="stats">'+[1,2,3,4].map(function(){return '<div class="panel stat"><div class="skl" style="width:50%"></div><div class="skl" style="height:24px;width:70%"></div></div>'}).join('')+'</div><div class="empty">'+esc(t)+'</div>'}
function viewWallet(id){
  var p=wallet(id);
  if(p.status==='loading')return loadingView('온체인에서 지갑 정보를 불러오는 중…');
  if(p.status==='err')return '<div class="panel empty"><b>'+esc(p.msg)+'</b>다른 주소나 ENS로 검색해 보세요.</div>';
  var saved=isSaved(p.id),d=S.period,v=vals(p).slice(90-d),r=ret(p,d),t=topNft(p),un=unclaimed(p);
  var h='<div class="whead"><div class="av">'+(t?artHtml(t.c,t.id):'<div class="art"></div>')+'</div><div><h1>'+esc(walletName(p))+'</h1><div class="addr">'+p.addr+'<button class="copy" data-act="copy" data-v="'+p.addr+'">복사</button><a class="copy" href="https://etherscan.io/address/'+p.addr+'" target="_blank" rel="noopener">Etherscan ↗</a></div>'
   +'<span class="chain">ETHEREUM</span><span class="chain">SOLANA</span><span class="chain">APECHAIN</span>'+(p.real?'<span class="src live" style="margin-left:6px">온체인 실시간</span>':'')+'</div><div class="sp"></div>'
   +'<button class="btn '+(saved?'saved':'pri')+'" data-act="save" data-id="'+esc(p.id)+'">'+(saved?'✓ 내 지갑에 저장됨':'+ 내 지갑 추가')+'</button></div>';
  h+='<div class="stats"><div class="panel stat"><small>총 자산</small><b>'+fmtUsd(total(p))+'</b><em>'+fmtEth(total(p)/LIVE.eth)+' ETH</em></div>'
   +'<div class="panel stat"><small>'+d+'일 수익률</small><b class="'+cls(r)+'">'+fmtPct(r)+'</b><em>자산 변화율</em></div>'
   +'<div class="panel stat"><small>보유 NFT</small><b>'+(p.more||p.nfts.length)+'개</b><em>ETH '+fmtEth(p.eth)+' · APE '+Math.round(p.ape).toLocaleString('en-US')+'</em></div>'
   +'<div class="panel stat'+(un?' hot':'')+'"><small>받을 수 있는 혜택</small><b style="'+(un?'color:var(--vio)':'')+'">'+(un?un+'팩':'없음')+'</b><em>Mudwater '+dday()+'</em></div></div>';
  h+='<div class="panel"><div class="ph"><h3>자산 추이</h3>'+seg('period',S.period,PER)+'</div>'+chartHtml('w'+d,v,'usd')+'</div>';
  h+='<div class="sec"><div class="sh"><div><h2>보유 NFT</h2><p>'+(p.nfts.length?'바닥가 높은 순':'Otherside 대상 컬렉션 NFT가 없습니다')+'</p></div></div>'+(p.nfts.length?'<div class="cards">'+p.nfts.map(function(n){return nftCard(n,{owner:p.id})}).join('')+'</div>':'<div class="panel empty">BAYC · MAYC · Koda · Otherdeed를 보유하면 여기에 표시됩니다.</div>')+'</div>';
  return h+guideBlock([p]);
}

/* ========== NFT ========== */
var NFTD={};
function nftDetail(c,id){
  var k=ikey(c,id);if(NFTD[k])return NFTD[k];
  NFTD[k]={status:'loading'};
  var C=COLS[c];
  Promise.all([
    getJSON(API+'getNFTMetadata?contractAddress='+C.addr+'&tokenId='+id).then(function(n){storeMeta(k,n)}).catch(function(){if(IMG[k]===undefined)IMG[k]=false}),
    getJSON(API+'getOwnersForNFT?contractAddress='+C.addr+'&tokenId='+id).then(function(j){return j.owners&&j.owners[0]}).catch(function(){return null})
  ]).then(function(r){NFTD[k]={status:'ok',owner:r[1]?r[1].toLowerCase():null};if(ROUTE.indexOf('/nft/'+c+'/'+id)===0)softRender()});
  return NFTD[k];
}
function viewNft(c,tid,owner){
  c=(c||'').toUpperCase();var C=COLS[c];if(!C||isNaN(tid))return '<div class="panel empty"><b>찾을 수 없는 NFT입니다.</b></div>';
  var k=ikey(c,tid),D=nftDetail(c,tid),M=META[k]||{traits:[]};
  var ownerId=owner||(D.owner||null),op=ownerId?wallet(ownerId):null;
  if(op&&op.status!=='ok')op=null;
  var held=op&&op.nfts?op.nfts.filter(function(n){return n.c===c&&n.id===tid})[0]:null;
  var mw=mwOf(c,tid),left=mw&&mw.status==='ok'?mw.left:0;
  var deleg=mw&&mw.claimant&&ownerId&&mw.claimant!==ownerId.toLowerCase();
  var mwText=!mw?'':mw.status==='loading'?'카드팩 신청 여부 확인 중…':mw.status==='err'?'카드팩 신청 여부를 불러오지 못했습니다.'
    :left>0?'받지 않은 카드팩 <b>'+left+'팩</b>'+(mw.done?' (총 '+(left+mw.done)+'팩 중 '+mw.done+'팩 신청함)':'')+'. 마감 '+dday()+'. 판매하면 남은 팩도 함께 넘어갑니다.'+(deleg?' 신청은 위임받은 지갑 <a href="#" data-nav="/wallet/'+mw.claimant+'" class="mono">'+short(mw.claimant)+'</a>에서 할 수 있습니다.':'')
    :mw.done?'카드팩 '+mw.done+'팩을 모두 받았습니다.':'이 NFT의 카드팩은 아직 배포되지 않았습니다.';
  var r=rngFor('n:'+c+tid),s=[],cur=1;for(var i=0;i<60;i++){cur=cur*(1+(r()-.5)*0.05);s.push(cur)}var sc=C.floor/s[59];s=s.map(function(v){return v*sc});
  var tr=(M.traits||[]).filter(function(t){return t&&t.trait_type&&t.value!==undefined&&t.value!==''}).slice(0,16);
  var row=function(a,b){return '<div class="kv"><span>'+a+'</span><b>'+b+'</b></div>'};
  var left='<div class="nleft"><div class="hero-art stage'+(S.v3?' on3d':'')+'"><div class="vt"><button data-act="v3" data-v="0" class="'+(S.v3?'':'on')+'">2D</button><button data-act="v3" data-v="1" class="'+(S.v3?'on':'')+'">3D</button></div>'+artHtml(c,tid,true)+'<div class="cv" id="cv3d"></div><div class="hint">'+(S.v3?'드래그로 회전 · 휠로 확대':'3D를 눌러 입체로 보기')+'</div></div>'+(S.v3?animBar(c):'')
   +'<div class="panel box"><div class="bh">컬렉션 정보</div>'+row('컬렉션',C.name)+row('쓰임',C.use)+row('보유 지갑',C.holders?C.holders.toLocaleString('en-US'):'—')+row('Mudwater',C.packs?'NFT당 '+C.packs+'팩':'—')+'</div>'
   +'<div class="panel"><div class="ph" style="padding:10px 16px"><h3 style="font-size:13px">속성 '+(tr.length?'<small style="display:inline;margin-left:6px">'+tr.length+'개 · 온체인 메타데이터</small>':'')+'</h3></div>'+(tr.length?'<div class="traits">'+tr.map(function(t){return '<div class="trait"><small>'+esc(t.trait_type)+'</small><b>'+esc(t.value)+'</b></div>'}).join('')+'</div>':'<div class="box" style="color:var(--sub)">속성 정보를 불러오는 중이거나 없습니다.</div>')+'</div></div>';
  var can='<div class="can">'
   +(c==='OTHERDEED'?'<div><span class="tag y">영지</span><span>자원 채집과 수수료 설정이 가능한 땅. 다른 플레이어가 채집하면 수수료를 받습니다.</span></div>':'<div><span class="tag g">아바타</span><span>Otherside 3D 아바타로 사용. 아바타 변경(F1)에서 선택.</span></div>')
   +(c==='KODA'?'<div><span class="tag y">영지 보너스</span><span>영지 채집에서 게임 내 이점.</span></div>':'')
   +(mw?'<div><span class="tag v">Mudwater</span><span>'+mwText+'</span></div>':'')
   +'</div>'+(left>0?'<div class="links"><a class="btn pri sm" href="https://mudwater.bayc.com" target="_blank" rel="noopener">Mudwater 공식 사이트 ↗</a></div>':'');
  var right='<div class="nright"><div class="nhead"><div><a class="crumb" href="#" data-fill="'+c+'">'+C.name+'</a><h1>'+c+' #'+tid+'</h1>'
   +'<div class="owner">'+(D.status==='loading'?'소유자 확인 중…':ownerId?'소유자 <a href="#" data-nav="/wallet/'+encodeURIComponent(op&&op.id||ownerId)+'">'+esc(op?walletName(op):short(ownerId))+'</a>':'소유자 정보 없음')+(op?' · 지갑 자산 '+fmtUsd(total(op))+' · NFT '+op.nfts.length+'개':'')+'</div></div>'
   +'<div class="pricebox"><small>컬렉션 바닥가</small><div class="p">'+fmtEth(C.floor)+' ETH</div><span>'+fmtUsd(C.floor*LIVE.eth)+(LIVE.floorLive[c]?' · OpenSea 실시간':'')+'</span></div></div>'
   +'<div class="ngrid">'
   +'<div class="panel"><div class="ph"><h3>이 NFT로 할 수 있는 것</h3></div>'+can+'</div>'
   +'<div class="panel"><div class="ph"><h3>토큰 정보</h3></div><div class="box">'+row('토큰 ID','#'+tid)+row('희귀도 순위',M.rank?'#'+M.rank.toLocaleString('en-US'):'—')+row('체인','Ethereum')+row('규격','ERC-721')+row('컨트랙트','<a class="mono" href="https://etherscan.io/address/'+C.addr+'" target="_blank" rel="noopener">'+short(C.addr)+'</a>')
   +'<div class="links" style="padding:8px 0 0"><a class="btn sm" href="https://opensea.io/assets/ethereum/'+C.addr+'/'+tid+'" target="_blank" rel="noopener">OpenSea ↗</a><a class="btn sm" href="https://etherscan.io/nft/'+C.addr+'/'+tid+'" target="_blank" rel="noopener">Etherscan ↗</a></div></div></div>'
   +'<div class="panel span2"><div class="ph"><h3>바닥가 추이</h3><span class="src">60D</span></div>'+chartHtml('n'+c+tid,s,'eth')+'</div>'
   +'</div></div>';
  return '<div class="nftp">'+left+right+'</div>';
}

/* ========== 마이페이지 ========== */
function viewMe(){
  var ids=loadSaved();
  if(!ids.length)return '<div class="whead"><h1>마이페이지</h1></div><div class="panel empty"><b>저장한 지갑이 없습니다</b>지갑을 검색한 뒤 <span style="color:var(--acc)">+ 내 지갑 추가</span>를 눌러 보세요.<div style="margin-top:18px"><a class="btn pri" href="#" data-nav="/">지갑 검색하기</a></div></div>';
  var all=ids.map(wallet),ps=all.filter(function(p){return p.status==='ok'});
  if(!ps.length)return loadingView('저장한 지갑을 불러오는 중…');
  var d=S.mePeriod,sum=new Array(91).fill(0);ps.forEach(function(p){vals(p).forEach(function(x,i){sum[i]+=x})});
  var v=sum.slice(90-d),r=sum[90]/sum[90-d]-1,nfts=[];ps.forEach(function(p){p.nfts.forEach(function(n){nfts.push({n:n,o:p})})});
  var un=ps.reduce(function(a,p){return a+unclaimed(p)},0);
  var h='<div class="whead"><div><h1>마이페이지</h1></div><div class="sp"></div><span class="src">저장한 지갑은 이 브라우저에만 보관됩니다</span></div>'
   +'<div class="stats"><div class="panel stat"><small>합산 자산</small><b>'+fmtUsd(sum[90])+'</b><em>'+fmtEth(sum[90]/LIVE.eth)+' ETH</em></div><div class="panel stat"><small>'+d+'일 수익률</small><b class="'+cls(r)+'">'+fmtPct(r)+'</b><em>합산 기준</em></div><div class="panel stat"><small>지갑 · NFT</small><b>'+ps.length+' · '+nfts.length+'</b><em>'+(all.length>ps.length?(all.length-ps.length)+'개 불러오는 중':'모두 불러옴')+'</em></div><div class="panel stat'+(un?' hot':'')+'"><small>받을 수 있는 혜택</small><b style="'+(un?'color:var(--vio)':'')+'">'+(un?un+'팩':'없음')+'</b><em>Mudwater '+dday()+'</em></div></div>'
   +'<div class="panel"><div class="ph"><h3>합산 자산 추이</h3>'+seg('meperiod',S.mePeriod,PER)+'</div>'+chartHtml('me'+d,v,'usd')+'</div>'
   +'<div class="sec"><div class="sh"><div><h2>내 지갑</h2></div></div><div class="panel"><table><thead><tr><th>지갑</th><th class="r">자산</th><th class="r hide-m">'+d+'D</th><th class="r hide-m">NFT</th><th class="r">미신청</th><th></th></tr></thead><tbody>'
   +ps.map(function(p){var x=ret(p,d),u=unclaimed(p);return '<tr data-nav="/wallet/'+encodeURIComponent(p.id)+'"><td>'+whoCell(p)+'</td><td class="r num">'+fmtUsd(total(p))+'</td><td class="r num hide-m '+cls(x)+'">'+fmtPct(x)+'</td><td class="r num hide-m">'+p.nfts.length+'</td><td class="r num" style="color:var(--vio)">'+(u?u+'팩':'—')+'</td><td class="r"><button class="x" title="제거" data-act="save" data-id="'+esc(p.id)+'">✕</button></td></tr>'}).join('')+'</tbody></table></div></div>'
   +'<div class="sec"><div class="sh"><div><h2>보유 NFT 전체</h2></div></div><div class="cards">'+nfts.map(function(x){return nftCard(x.n,{owner:x.o.id,sub:walletName(x.o)})}).join('')+'</div></div>';
  return h+guideBlock(ps);
}

/* ========== 3D 보기 ========== */
var THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',threeP=null;
var V3={anim:'idle',rx:0.18,ry:-0.45,zoom:1,live:null};
function loadThree(){if(window.THREE)return Promise.resolve();if(!threeP)threeP=new Promise(function(res,rej){var s=document.createElement('script');s.src=THREE_URL;s.onload=res;s.onerror=function(){threeP=null;rej()};document.head.appendChild(s)});return threeP}
function traitOf(tr,name){var t=(tr||[]).filter(function(x){return String(x.trait_type||'').toLowerCase()===name.toLowerCase()})[0];return t?String(t.value):''}
function hcol(str,s,l){var r=rngFor('c:'+str);return 'hsl('+Math.floor(r()*360)+','+s+'%,'+l+'%)'}
var FUR={'Tan':'#C8A27A','Brown':'#8B5A3C','Dark Brown':'#5C3A26','Golden Brown':'#B07A3E','Black':'#2F2F33','Gray':'#8E9096','White':'#EEE8E0','Cream':'#EADBC0','Red':'#B8433A','Blue':'#4A78C2','Pink':'#E6A1B8','Zombie':'#8FB08A','Robot':'#A9B4C2','Trippy':'#9B6BD6','Noise':'#7A7A80','Death Bot':'#6B7280','Solid Gold':'#E2B23C','Cheetah':'#D9A54B','Dmt':'#7C5CC4','Dark Blue':'#2E4A7D','Light Blue':'#8EC3E8','Light Brown':'#B98B63','Purple':'#7E57C2','Green':'#5E9E5A'};
var DEED={'Growth':'#6BBF59','Decay':'#7A6A55','Harsh':'#C9B48A','Volcanic':'#A3422C','Psychedelic':'#B05CD6','Mineral':'#7FA7C9','Infinite':'#E8D27A'};
function mat(col,o){o=o||{};return new THREE.MeshStandardMaterial({color:new THREE.Color(col),flatShading:true,roughness:o.r!=null?o.r:.78,metalness:o.m||0,emissive:new THREE.Color(o.e||'#000'),emissiveIntensity:o.ei||0})}
function mesh(g,m,x,y,z,sx,sy,sz){var o=new THREE.Mesh(g,m);o.position.set(x||0,y||0,z||0);if(sx)o.scale.set(sx,sy,sz);return o}
function ico(r,d){return new THREE.IcosahedronGeometry(r,d==null?1:d)}
function lerp(o,k,v){o[k]+=(v-o[k])*0.14}

function mkApe(tr,c,id){
  var T=THREE,r=rngFor('3d'+c+id),root=new T.Group(),body=new T.Group();root.add(body);
  var furN=traitOf(tr,'Fur').replace(/^M[123]\s+/i,'');
  var fur=FUR[furN]||(furN?hcol(furN,c==='MAYC'?50:35,c==='MAYC'?50:45):(c==='MAYC'?hcol('m'+id,45,48):'#8B5A3C'));
  var skin=c==='MAYC'?'#C9D79A':'#E6C7A0',dark='#2A1C14';
  var clothesN=traitOf(tr,'Clothes'),hatN=traitOf(tr,'Hat'),eyesN=traitOf(tr,'Eyes'),earN=traitOf(tr,'Earring');
  var F=mat(fur),S=mat(skin),D=mat(dark);
  var top=clothesN?mat(hcol(clothesN,55,48)):F;
  body.add(mesh(ico(.5),top,0,1.0,0,1,1.25,.85));
  if(!clothesN)body.add(mesh(ico(.36),S,0,.95,.3,1,1.15,.5));
  [-1,1].forEach(function(s){body.add(mesh(new T.CylinderGeometry(.13,.11,.55,7),F,s*.22,.32,0));body.add(mesh(ico(.15,0),S,s*.22,.06,.07,1,.6,1.4))});
  var arms=[];
  [1,-1].forEach(function(s){var p=new T.Group();p.position.set(s*.5,1.42,0);p.add(mesh(new T.CylinderGeometry(.11,.1,.65,7),top,0,-.32,0));p.add(mesh(ico(.13,0),S,0,-.68,0));p.rotation.z=s*.14;body.add(p);arms.push(p)});
  var head=new T.Group();head.position.y=1.95;body.add(head);
  head.add(mesh(ico(.55),F));
  head.add(mesh(ico(.36),S,0,-.14,.36,1.1,.75,.7));
  [-1,1].forEach(function(s){
    head.add(mesh(ico(.17),F,s*.56,.02,0,1,1,.55));head.add(mesh(ico(.1),S,s*.59,.02,.05,1,1,.5));
    head.add(mesh(ico(.11),mat('#ffffff'),s*.19,.1,.43,1,1,.6));head.add(mesh(ico(.065),mat('#111111'),s*.19,.1,.49));
    head.add(mesh(ico(.03,0),D,s*.06,-.08,.62));
  });
  head.add(mesh(new T.BoxGeometry(.24,.025,.03),D,0,-.27,.58));
  if(/laser/i.test(eyesN))[-1,1].forEach(function(s){var b=mesh(new T.CylinderGeometry(.02,.02,2.2,6),mat('#ff2a2a',{e:'#ff2a2a',ei:1}),s*.19,.1,1.55);b.rotation.x=Math.PI/2;head.add(b)});
  else if(/sunglass|3d|blindfold|visor|hypnot|glass/i.test(eyesN))head.add(mesh(new T.BoxGeometry(.62,.13,.05),mat('#111827',{r:.3,m:.4}),0,.1,.52));
  if(earN)head.add(mesh(new T.TorusGeometry(.05,.015,6,12),mat('#E2B23C',{m:.6,r:.35}),-.62,-.12,.04));
  if(/crown/i.test(hatN)){var g=mat('#E8B730',{m:.55,r:.35});head.add(mesh(new T.CylinderGeometry(.34,.3,.22,10,1,true),g,0,.55,0));for(var i=0;i<6;i++){var a=i/6*Math.PI*2;head.add(mesh(new T.ConeGeometry(.06,.18,4),g,Math.cos(a)*.32,.74,Math.sin(a)*.32))}}
  else if(/halo/i.test(hatN)){var h=mesh(new T.TorusGeometry(.32,.035,6,24),mat('#FDE68A',{e:'#FDE68A',ei:.6}),0,.78,0);h.rotation.x=Math.PI/2;head.add(h)}
  else if(/horn/i.test(hatN)){[-1,1].forEach(function(s){var k=mesh(new T.ConeGeometry(.09,.35,5),mat('#B91C1C'),s*.3,.55,0);k.rotation.z=-s*.35;head.add(k)})}
  else if(hatN){var hc=mat(hcol(hatN,60,50));head.add(mesh(new T.SphereGeometry(.57,10,6,0,Math.PI*2,0,Math.PI/2.3),hc,0,.12,0));var br=mesh(new T.CylinderGeometry(.6,.6,.04,12),hc,0,.2,.12);head.add(br)}
  if(c==='MAYC')for(var j=0;j<6;j++){var a2=r()*Math.PI*2,y=r()*.4-.1;head.add(mesh(ico(.05+r()*.04,0),mat(hcol('d'+id+j,55,45)),Math.cos(a2)*.52,y,Math.sin(a2)*.52))}
  return{root:root,cy:1.25,dist:1,kind:'ape',anim:function(t,a){
    var ta=[.14,-.14];
    if(a==='wave')ta=[2.55+Math.sin(t*9)*.35,-.14];
    if(a==='win')ta=[2.8,-2.8];
    lerp(arms[0].rotation,'z',ta[0]);lerp(arms[1].rotation,'z',ta[1]);
    var by=a==='win'?Math.abs(Math.sin(t*5))*.22:Math.sin(t*2)*.025;body.position.y+=(by-body.position.y)*.3;
    head.rotation.y=a==='wave'?Math.sin(t*3)*.12:Math.sin(t*.8)*.15;head.rotation.z=a==='wave'?.12:0;
  }};
}
function mkKoda(tr,c,id){
  var T=THREE,root=new T.Group(),body=new T.Group();root.add(body);
  var hN=traitOf(tr,'Head')||('h'+id),cN=traitOf(tr,'Core')||('c'+id),eN=traitOf(tr,'Eyes');
  var H=mat(hcol(hN,55,62)),C=mat(hcol(cN,50,52)),dk=mat(hcol(hN,45,32));
  body.add(mesh(ico(.48),C,0,.55,0,1,1,.9));
  [-1,1].forEach(function(s){body.add(mesh(ico(.14,0),dk,s*.25,.1,.08,1,.6,1.3))});
  var arms=[];[1,-1].forEach(function(s){var p=new T.Group();p.position.set(s*.42,.75,0);p.add(mesh(ico(.13),C,0,-.18,0,1,1.5,1));p.rotation.z=s*.3;body.add(p);arms.push(p)});
  var head=new T.Group();head.position.y=1.45;body.add(head);
  head.add(mesh(ico(.72),H,0,0,0,1,.92,.95));
  [-1,1].forEach(function(s){var k=mesh(new T.ConeGeometry(.12,.55,5),dk,s*.42,.62,0);k.rotation.z=-s*.42;head.add(k);
    head.add(mesh(ico(.19),mat('#ffffff'),s*.26,.04,.6,1,1,.6));head.add(mesh(ico(.1),mat('#111111'),s*.26,.04,.7))});
  if(/third/i.test(eN)){head.add(mesh(ico(.12),mat('#ffffff'),0,.36,.62,1,1,.6));head.add(mesh(ico(.06),mat('#7C3AED',{e:'#7C3AED',ei:.6}),0,.36,.69))}
  head.add(mesh(new T.TorusGeometry(.09,.02,6,12,Math.PI),mat('#2A1C14'),0,-.22,.66,1,1,1));head.children[head.children.length-1].rotation.z=Math.PI;
  return{root:root,cy:1.05,dist:.95,kind:'koda',anim:function(t,a){
    var ta=[.3,-.3];if(a==='wave')ta=[2.3+Math.sin(t*9)*.4,-.3];if(a==='win')ta=[2.6,-2.6];
    lerp(arms[0].rotation,'z',ta[0]);lerp(arms[1].rotation,'z',ta[1]);
    var by=a==='win'?Math.abs(Math.sin(t*5))*.25:Math.sin(t*2.2)*.03;body.position.y+=(by-body.position.y)*.3;
    head.rotation.z=Math.sin(t*1.1)*.06;
  }};
}
function mkDeed(tr,c,id){
  var T=THREE,r=rngFor('deed'+id),root=new T.Group(),isl=new T.Group();root.add(isl);
  var cat=traitOf(tr,'Category'),env=traitOf(tr,'Environment')||cat||('e'+id),sed=traitOf(tr,'Sediment')||('s'+id),tier=+traitOf(tr,'Sediment Tier')||1+Math.floor(r()*3);
  var topc=DEED[cat]||hcol(env,45,52);
  isl.add(mesh(new T.CylinderGeometry(1.1,.75,.6,6),mat('#8B6B4A'),0,.3,0));
  var bot=mesh(new T.ConeGeometry(.75,.6,6),mat('#6B4F36'),0,-.29,0);bot.rotation.x=Math.PI;isl.add(bot);
  isl.add(mesh(new T.CylinderGeometry(1.12,1.12,.14,6),mat(topc),0,.66,0));
  var n=3+Math.floor(r()*4),cry=[];
  for(var i=0;i<n;i++){var a=r()*Math.PI*2,d=.25+r()*.6,x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(r()<.55){isl.add(mesh(new T.CylinderGeometry(.035,.045,.18,5),mat('#5B3A1E'),x,.82,z));isl.add(mesh(new T.ConeGeometry(.17,.42,6),mat(hcol(env+'t',45,38)),x,1.1,z))}
    else isl.add(mesh(new T.DodecahedronGeometry(.1+r()*.08),mat('#9AA3AE'),x,.8,z))}
  for(var k=0;k<tier;k++){var a2=k/tier*Math.PI*2+.5,cr=mesh(new T.OctahedronGeometry(.13),mat(hcol(sed,70,55),{e:hcol(sed,70,55),ei:.45,r:.3}),Math.cos(a2)*.2,1.0+k*.05,Math.sin(a2)*.2,1,1.6,1);isl.add(cr);cry.push(cr)}
  var kd=traitOf(tr,'Koda');if(kd&&!/^(no|none|false|0)$/i.test(kd)){isl.add(mesh(ico(.2),mat('#A5B4FC'),-.55,.92,.35))}
  return{root:root,cy:.6,dist:1.0,kind:'deed',anim:function(t,a){isl.position.y=Math.sin(t*1.4)*.06;cry.forEach(function(o,i){o.rotation.y=t*1.5+i})}};
}
function mount3d(c,id){
  var host=$('#cv3d');if(!host)return;
  if(V3.live)V3.live.stop();
  host.innerHTML='<div class="ld">3D 불러오는 중…</div>';
  loadThree().then(function(){if(document.body.contains(host))build3d(host,c,id)}).catch(function(){host.innerHTML='<div class="ld">3D를 불러오지 못했습니다</div>'});
}
function build3d(host,c,id){
  var T=THREE,W=host.clientWidth||400,H=host.clientHeight||400,R;
  try{R=new T.WebGLRenderer({antialias:true,alpha:true})}catch(e){host.innerHTML='<div class="ld">이 브라우저는 3D를 지원하지 않습니다</div>';return}
  R.setPixelRatio(Math.min(2,window.devicePixelRatio||1));R.setSize(W,H);
  host.innerHTML='';host.appendChild(R.domElement);
  var sc=new T.Scene(),cam=new T.PerspectiveCamera(32,W/H,.1,100);
  sc.add(new T.HemisphereLight(0xffffff,0x9aa8b8,.8));var dl=new T.DirectionalLight(0xffffff,.8);dl.position.set(3,5,4);sc.add(dl);var bl=new T.DirectionalLight(0xbff3ea,.4);bl.position.set(-4,2,-3);sc.add(bl);
  var ring=mesh(new T.TorusGeometry(1.3,.035,8,64),mat('#1FC8B0',{e:'#1FC8B0',ei:.4}));ring.rotation.x=Math.PI/2;sc.add(ring);
  var disc=mesh(new T.CircleGeometry(1.3,48),new T.MeshStandardMaterial({color:0xDCE3EC,roughness:1}),0,-.005,0);disc.rotation.x=-Math.PI/2;sc.add(disc);
  var av;var tr=(META[ikey(c,id)]||{}).traits||[];
  av=c==='OTHERDEED'?mkDeed(tr,c,id):c==='KODA'?mkKoda(tr,c,id):mkApe(tr,c,id);
  if(av.kind==='deed'){ring.visible=disc.visible=false}
  sc.add(av.root);
  var el=R.domElement,drag=null,run=true,t0=performance.now();
  el.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,rx:V3.rx,ry:V3.ry};try{el.setPointerCapture(e.pointerId)}catch(_){}el.style.cursor='grabbing'});
  el.addEventListener('pointermove',function(e){if(!drag)return;V3.ry=drag.ry+(e.clientX-drag.x)*.01;V3.rx=Math.max(-.25,Math.min(.75,drag.rx+(e.clientY-drag.y)*.006))});
  var up=function(){drag=null;el.style.cursor=''};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',function(e){e.preventDefault();V3.zoom=Math.max(.55,Math.min(1.7,V3.zoom*(e.deltaY>0?1.08:.93)))},{passive:false});
  function stop(){if(!run)return;run=false;R.dispose();sc.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()})}
  function frame(now){
    if(!run)return;if(!document.body.contains(el)){stop();return}
    var t=(now-t0)/1000;if(V3.anim==='spin'&&!drag)V3.ry+=.025;
    av.root.rotation.y=V3.ry;av.anim(t,V3.anim);
    var d=6.4*V3.zoom*av.dist;cam.position.set(0,av.cy+Math.sin(V3.rx)*d,Math.cos(V3.rx)*d);cam.lookAt(0,av.cy,0);
    var w=host.clientWidth,h=host.clientHeight;if(w&&h&&(w!==W||h!==H)){W=w;H=h;R.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix()}
    R.render(sc,cam);requestAnimationFrame(frame);
  }
  V3.live={stop:stop};requestAnimationFrame(frame);
}
function animBar(c){
  var opts=c==='OTHERDEED'?[['idle','대기'],['spin','회전']]:[['idle','대기'],['wave','인사'],['win','승리'],['spin','회전']];
  return '<div class="abar">'+opts.map(function(o){return '<button data-act="anim" data-v="'+o[0]+'" class="'+(V3.anim===o[0]?'on':'')+'">'+o[1]+'</button>'}).join('')+'<span class="src" style="margin-left:auto;align-self:center">속성(트레이트)으로 만든 간이 3D</span></div>';
}

/* ========== 라우터 ========== */
var ROUTE=(function(){try{var h=location.hash;if(h&&h.indexOf('#/')===0)return decodeURIComponent(h.slice(1))}catch(e){}return '/'})();
var HIST=[],DEPTH=0;
/* 브라우저 뒤로·앞으로: 주소 뒤 #/경로 를 기록. 막힌 미리보기 창에서는 페이지 안 기록으로 대체 */
var CANH=(function(){try{history.replaceState({y:0,i:0},'');return true}catch(e){return false}})();
function routeFromHash(){try{var h=location.hash;if(h&&h.indexOf('#/')===0)return decodeURIComponent(h.slice(1))}catch(e){}return '/'}
function applyRoute(path){if(path.indexOf('/nft/')===0){S.v3=/[?&]v=3d/.test(path);V3.anim='idle';V3.ry=-.45;V3.rx=.18;V3.zoom=1}ROUTE=path}
function nav(path){
  if(path===ROUTE){render(true);return}
  if(CANH){try{history.replaceState({y:window.scrollY,i:DEPTH},'');history.pushState({y:0,i:DEPTH+1},'','#'+path);DEPTH++}catch(e){CANH=false}}
  if(!CANH)HIST.push(ROUTE);
  applyRoute(path);render(true);
}
function back(){
  if(CANH&&DEPTH>0){history.back();return}
  if(!CANH&&HIST.length){applyRoute(HIST.pop());render(true);return}
  nav('/');
}
window.addEventListener('popstate',function(e){
  var st=e.state||{};DEPTH=st.i||0;applyRoute(routeFromHash());render(false);
  var y=st.y||0;setTimeout(function(){window.scrollTo(0,y)},0);
});
applyRoute(ROUTE);
function curWalletKeys(){var pp=ROUTE.split('?')[0].split('/');if(pp[1]==='wallet')return[decodeURIComponent(pp[2]||'').toLowerCase()];if(pp[1]==='me')return loadSaved().map(function(x){return x.toLowerCase()});if(pp[1]==='nft'){var o=new URLSearchParams(ROUTE.split('?')[1]||'').get('o');var k=ikey((pp[2]||'').toUpperCase(),+pp[3]);var d=NFTD[k];return[o,d&&d.owner].filter(Boolean)}return[]}
var rT=null;function softRender(){clearTimeout(rT);rT=setTimeout(function(){var ae=document.activeElement;if(ae&&ae.classList&&ae.classList.contains('q'))return;var y=window.scrollY;render(false);window.scrollTo(0,y)},60)}
function render(top){
  var app=$('#app'),pp=ROUTE.split('?')[0],parts=pp.replace(/^\//,'').split('/'),qs=new URLSearchParams(ROUTE.split('?')[1]||'');
  var home=parts[0]==='';
  $('#navsb').style.display=home?'none':'block';
  $('#l-home').className='nl'+(home?' on':'');$('#l-me').className='nl'+(parts[0]==='me'?' on':'');
  var body;
  if(home)body=viewHome();
  else if(parts[0]==='wallet')body=viewWallet(decodeURIComponent(parts[1]||''));
  else if(parts[0]==='nft')body=viewNft(parts[1],+parts[2],qs.get('o'));
  else if(parts[0]==='me')body=viewMe();
  else body='<div class="panel empty"><b>페이지를 찾을 수 없습니다.</b></div>';
  app.innerHTML=(home?'':'<a href="#" data-back class="back">← 뒤로</a>')+body;
  if(home)mountSearch($('#homesb'),true);
  bindCharts();updateBadge();hydrateImgs();paintEth();
  if(parts[0]==='nft'&&S.v3&&COLS[(parts[1]||'').toUpperCase()])mount3d(parts[1].toUpperCase(),+parts[2]);
  if(top)window.scrollTo(0,0);
}
document.addEventListener('click',function(e){
  var bk=e.target.closest('[data-back]');if(bk){e.preventDefault();back();return}
  var b=e.target.closest('[data-act]');
  if(b){e.preventDefault();e.stopPropagation();var a=b.dataset.act,v=b.dataset.v,y=window.scrollY;
    if(a==='save'){toggleSave(b.dataset.id);render(false);window.scrollTo(0,y)}
    else if(a==='period'){S.period=+v;render(false);window.scrollTo(0,y)}
    else if(a==='meperiod'){S.mePeriod=+v;render(false);window.scrollTo(0,y)}
    else if(a==='rank'){S.rank=+v;render(false);window.scrollTo(0,y)}
    else if(a==='pop'){S.pop=v;render(false);window.scrollTo(0,y)}
    else if(a==='cat'){cat=v;render(false);window.scrollTo(0,y);var q=$('#homesb .q');if(q)q.focus()}
    else if(a==='v3'){S.v3=v==='1';render(false);window.scrollTo(0,y)}
    else if(a==='anim'){V3.anim=v;document.querySelectorAll('.abar button').forEach(function(x){x.classList.toggle('on',x.dataset.v===v)})}
    else if(a==='copy'){try{navigator.clipboard.writeText(v);b.textContent='복사됨'}catch(err){b.textContent='복사 실패'}}
    return}
  var nv=e.target.closest('[data-nav]');
  if(nv&&!e.target.closest('a[target]')){e.preventDefault();nav(nv.getAttribute('data-nav'));return}
  var fl=e.target.closest('[data-fill]');
  if(fl&&!fl.closest('.sug')){e.preventDefault();var inp=$('#homesb .q')||$('#navsb .q');inp.value=fl.dataset.fill;inp.focus();inp.dispatchEvent(new Event('input'));return}
});
document.addEventListener('keydown',function(e){if(e.key==='/'&&!(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))){var q=$('#homesb .q')||$('#navsb .q');if(q){e.preventDefault();q.focus()}}});
mountSearch($('#navsb'));
render(true);
loadPrices();
