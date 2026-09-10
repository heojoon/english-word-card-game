(function(){'use strict';
var art={
  warrior:'assets/avatars/warrior.webp?v=20260910-4',
  mage:'assets/avatars/mage.webp?v=20260910-2',
  pugilist:'assets/avatars/pugilist.webp?v=20260910-2',
  ranger:'assets/avatars/ranger.webp?v=20260910-2'
};
var em={'⚔️':'warrior','🔮':'mage','🥊':'pugilist','🏹':'ranger'};

function addStyle(){
  if(document.getElementById('avatarArtStyle'))return;
  var s=document.createElement('style');
  s.id='avatarArtStyle';
  s.textContent=[
    '.avatar,.mini-avatar{overflow:visible!important;position:relative;background:#fff!important}',
    '.avatar{width:82px!important;height:82px!important;border-radius:18px!important}',
    '.avatar .avatar-art{width:88px;height:88px}',
    '.mini-avatar{width:46px!important;height:46px!important;border-radius:12px!important}',
    '.mini-avatar .avatar-art{width:50px;height:50px}',
    '.avatar-art{object-fit:contain;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 5px 7px rgba(15,23,42,.22));pointer-events:none}',
    '.gear{z-index:3}',
    '.char-card{min-height:104px;grid-template-columns:92px 1fr auto}',
    '.class-choice{min-height:142px;padding:10px 6px!important;display:flex;flex-direction:column;align-items:center;justify-content:center}',
    '.class-choice .ico{display:flex!important;width:100%!important;height:98px!important;align-items:center;justify-content:center;margin:0 0 6px!important}',
    '.class-art{width:100px;height:100px;object-fit:contain;display:block;filter:drop-shadow(0 6px 8px rgba(15,23,42,.20))}',
    '@media(max-width:600px){.char-card{grid-template-columns:92px 1fr auto}.class-grid{grid-template-columns:1fr 1fr!important}.class-choice{min-height:135px}.class-art{width:94px;height:94px}}'
  ].join('');
  document.head.appendChild(s);
}
function findKey(t){for(var e in em)if(t.indexOf(e)>=0)return em[e];return null}
function avatar(n){
  if(!n)return;
  var old=n.querySelector('.avatar-art');
  if(old)return;
  var k=findKey(n.textContent||'');
  if(!k||!art[k])return;
  var g=n.querySelector('.gear');
  Array.prototype.forEach.call(n.childNodes,function(x){if(x.nodeType===3)x.nodeValue=''});
  var i=document.createElement('img');
  i.className='avatar-art';i.src=art[k];i.alt='';i.draggable=false;
  n.insertBefore(i,g||n.firstChild);
}
function classes(){
  Array.prototype.forEach.call(document.querySelectorAll('.class-choice'),function(b){
    var k=b.getAttribute('data-class'),x=b.querySelector('.ico');
    if(!x||!art[k]||x.querySelector('img'))return;
    x.textContent='';
    var i=document.createElement('img');i.className='class-art';i.src=art[k];i.alt='';i.draggable=false;x.appendChild(i);
  });
}
function decorate(){addStyle();Array.prototype.forEach.call(document.querySelectorAll('.avatar,.mini-avatar'),avatar);classes()}
var scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;decorate()})}
var o=new MutationObserver(schedule);
function start(){decorate();o.observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();