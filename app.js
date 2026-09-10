(function(){
'use strict';

var dbTarget=new URLSearchParams(window.location.search).get('db');
var localHost=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1';
var useLocalDb=dbTarget==='local'||(dbTarget!=='remote'&&localHost);
var SUPABASE_URL=useLocalDb?'http://127.0.0.1:54321':'https://uobagmggryhsqlpxhfob.supabase.co';
var SUPABASE_KEY=useLocalDb?'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH':'sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
var stages=window.QUIZ_STAGES||{};
var classInfo={warrior:{label:'전사',icon:'⚔️'},mage:{label:'마법사',icon:'🔮'},pugilist:{label:'권투사',icon:'🥊'},ranger:{label:'궁수',icon:'🏹'}};
var defaultPlayers=['율이','아빠','손님'],players=defaultPlayers.slice(),player='율이',stage='s1',selectedCharacter=null,characters=[],shopItems=[],inventory=[],redemptions=[];
var charClass='warrior',charAccent='violet';
var deck=[],idx=0,correct=0,locked=false,currentEnglish='',timerId=null,deadline=0,currentAnswer='';
var questionStartedAt=0,elapsedMs=0;

function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function shuffle(a){var x=a.slice();for(var i=x.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=x[i];x[i]=x[j];x[j]=t}return x}
function headers(extra){var h={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY};if(extra)Object.keys(extra).forEach(function(k){h[k]=extra[k]});return h}
function fmtTime(ms){if(ms==null)return '-';return (ms/1000).toFixed(1)+'초'}
function itemById(id){for(var i=0;i<shopItems.length;i++)if(String(shopItems[i].id)===String(id))return shopItems[i];return null}
function classData(c){return classInfo[c]||classInfo.warrior}
function itemArtClass(item){return 'item-'+esc(item&&item.code||'crystal')}
function avatarHtml(c,mini){var ci=classData(c.class),item=itemById(c.equipped_item_id);return '<span class="'+(mini?'mini-avatar':'avatar')+' '+esc(c.accent||'violet')+'">'+ci.icon+(item?'<span class="gear '+itemArtClass(item)+'" aria-label="'+esc(item.name)+'"></span>':'')+'</span>'}
function comboBonus(n){return Math.floor(n/5)}
function earnedCoins(n,clear){return n+comboBonus(n)+(clear?10:0)}
function liveScoreText(){return correct+'/'+deck.length+' · ◆ +'+earnedCoins(correct,false)}

function readCustomPlayers(){
  try{var list=JSON.parse(localStorage.getItem('fantasyQuizPlayers')||'[]');return Array.isArray(list)?list.filter(function(x){return typeof x==='string'&&x.trim()}):[]}
  catch(e){return[]}
}
function uniquePlayers(list){
  var seen={};return list.map(function(x){return String(x).trim()}).filter(function(x){var k=x.toLocaleLowerCase();if(!x||seen[k])return false;seen[k]=true;return true})
}
function saveCustomPlayers(){
  var defaults={};defaultPlayers.forEach(function(x){defaults[x.toLocaleLowerCase()]=true});
  localStorage.setItem('fantasyQuizPlayers',JSON.stringify(players.filter(function(x){return !defaults[x.toLocaleLowerCase()]})))
}
function renderPlayerButtons(){
  var box=el('playerList');box.innerHTML='';
  players.forEach(function(name){var b=document.createElement('button');b.type='button';b.className='pick'+(name===player?' active':'');b.setAttribute('data-player',name);b.textContent=name;b.onclick=function(){switchPlayer(name)};box.appendChild(b)});
  var add=document.createElement('button');add.type='button';add.className='pick add-player';add.id='addPlayerBtn';add.textContent='＋ 유저 추가';add.onclick=function(){el('playerNameInput').value='';openModal('playerModal');setTimeout(function(){el('playerNameInput').focus()},0)};box.appendChild(add)
}
async function loadPlayerList(){
  var known=defaultPlayers.concat(readCustomPlayers());
  try{var chars=await getAllCharacters();chars.forEach(function(c){if(c.player)known.push(c.player)})}catch(e){console.error(e)}
  players=uniquePlayers(known);var saved=localStorage.getItem('fantasyQuizPlayer');if(saved&&players.indexOf(saved)>=0)player=saved;renderPlayerButtons()
}
async function switchPlayer(name){
  if(name===player)return;player=name;localStorage.setItem('fantasyQuizPlayer',player);selectedCharacter=null;renderPlayerButtons();await loadCharacters();await Promise.all([renderHistory(),renderDashboard()])
}

async function apiGet(path){var r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:headers()});if(!r.ok)throw new Error(await r.text());return r.json()}
async function apiPost(path,body,prefer){var r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':prefer||'return=representation'}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());var txt=await r.text();return txt?JSON.parse(txt):null}
async function rpc(name,body){return apiPost('rpc/'+name,body,'return=representation')}

function renderStageButtons(){
  var keys=Object.keys(stages),box=el('stageButtons');
  el('stageTop').textContent=keys.map(function(k){return stages[k].name.replace('Stage ','S')}).join(' · ');
  box.innerHTML='';
  keys.forEach(function(k){
    var b=document.createElement('button');b.type='button';b.className='pick'+(k===stage?' active':'');b.setAttribute('data-stage',k);
    b.innerHTML=esc(stages[k].name)+'<br><span class="tiny">'+esc(stages[k].desc||stages[k].words.length+'문제')+'</span>';
    b.onclick=function(){stage=k;selectButtons('data-stage',stage);renderDashboard()};
    box.appendChild(b);
  });
}

async function loadShopItems(){
  try{shopItems=await apiGet('shop_items?select=id,code,name,category,price,icon,description,repeatable&active=eq.true&order=price.asc')}catch(e){console.error(e);shopItems=[]}
}
async function loadCharacters(){
  try{
    characters=await apiGet('game_characters?select=id,player,name,class,accent,coins,equipped_item_id,created_at&player=eq.'+encodeURIComponent(player)+'&order=created_at.asc');
    var saved=localStorage.getItem('fantasyQuizCharacter:'+player),found=null;
    if(saved)found=characters.find(function(c){return c.id===saved})||null;
    if(!found&&selectedCharacter&&selectedCharacter.player===player)found=characters.find(function(c){return c.id===selectedCharacter.id})||null;
    selectedCharacter=found||(characters.length?characters[0]:null);
    if(selectedCharacter)localStorage.setItem('fantasyQuizCharacter:'+player,selectedCharacter.id);
    renderCharacters();
  }catch(e){console.error(e);characters=[];selectedCharacter=null;renderCharacters()}
}
function renderCharacters(){
  var box=el('characterList');box.innerHTML='';
  if(!characters.length){box.innerHTML='<div class="empty-box">아직 캐릭터가 없습니다.<br><b>＋ 캐릭터 만들기</b>로 첫 모험가를 생성하세요.</div>';el('startBtn').disabled=true;el('startBtn').textContent='캐릭터를 선택해 주세요';return}
  characters.forEach(function(c){
    var d=document.createElement('div');d.className='char-card'+(selectedCharacter&&c.id===selectedCharacter.id?' active':'');
    d.innerHTML=avatarHtml(c,false)+'<div><div class="char-name">'+esc(c.name)+'</div><div class="char-meta">'+classData(c.class).label+' · '+esc(c.player)+'</div></div><div class="coin">'+c.coins+'</div>';
    d.onclick=function(){selectedCharacter=c;localStorage.setItem('fantasyQuizCharacter:'+player,c.id);renderCharacters()};box.appendChild(d);
  });
  el('startBtn').disabled=!selectedCharacter;el('startBtn').textContent=selectedCharacter?selectedCharacter.name+'의 퀘스트 시작':'캐릭터를 선택해 주세요';
}

function openModal(id){el(id).classList.add('show')}
function closeModal(id){el(id).classList.remove('show')}
Array.prototype.forEach.call(document.querySelectorAll('[data-close]'),function(b){b.onclick=function(){closeModal(this.getAttribute('data-close'))}});
Array.prototype.forEach.call(document.querySelectorAll('.modal-backdrop'),function(m){m.onclick=function(e){if(e.target===m)closeModal(m.id)}});

el('newCharBtn').onclick=function(){el('charNameInput').value='';charClass='warrior';charAccent='violet';selectButtons('data-class',charClass);selectButtons('data-accent',charAccent);openModal('characterModal')};
Array.prototype.forEach.call(document.querySelectorAll('[data-class]'),function(b){b.onclick=function(){charClass=this.getAttribute('data-class');selectButtons('data-class',charClass)}});
Array.prototype.forEach.call(document.querySelectorAll('[data-accent]'),function(b){b.onclick=function(){charAccent=this.getAttribute('data-accent');selectButtons('data-accent',charAccent)}});
el('createPlayerBtn').onclick=async function(){
  var name=el('playerNameInput').value.trim().replace(/\s+/g,' ');
  if(!name){alert('유저 이름을 입력해 주세요.');return}
  if(!/^[가-힣A-Za-z0-9 _-]+$/.test(name)){alert('유저 이름에는 한글, 영문, 숫자, 공백, 밑줄과 하이픈만 사용할 수 있습니다.');return}
  if(players.some(function(x){return x.toLocaleLowerCase()===name.toLocaleLowerCase()})){alert('이미 등록된 유저입니다.');return}
  players.push(name);players=uniquePlayers(players);saveCustomPlayers();closeModal('playerModal');
  player=name;localStorage.setItem('fantasyQuizPlayer',player);selectedCharacter=null;renderPlayerButtons();await loadCharacters();await Promise.all([renderHistory(),renderDashboard()]);el('newCharBtn').click()
};
el('playerNameInput').onkeydown=function(e){if(e.key==='Enter')el('createPlayerBtn').click()};
el('createCharBtn').onclick=async function(){
  var name=el('charNameInput').value.trim();if(!name){alert('캐릭터 이름을 입력해 주세요.');return}
  this.disabled=true;this.textContent='생성 중...';
  try{
    var rows=await apiPost('game_characters',{player:player,name:name,class:charClass,accent:charAccent});
    closeModal('characterModal');
    if(rows&&rows[0])localStorage.setItem('fantasyQuizCharacter:'+player,rows[0].id);
    await loadCharacters();await renderDashboard();
  }catch(e){console.error(e);alert('캐릭터 생성에 실패했습니다. 이름은 1~16자로 입력해 주세요.')}
  this.disabled=false;this.textContent='캐릭터 생성';
};

async function loadCharacterShopData(){
  if(!selectedCharacter)return;
  try{
    var all=await Promise.all([
      apiGet('character_inventory?select=item_id&character_id=eq.'+selectedCharacter.id),
      apiGet('reward_redemptions?select=id,item_id,status,price_paid,created_at&character_id=eq.'+selectedCharacter.id+'&order=created_at.desc&limit=12')
    ]);
    inventory=all[0]||[];redemptions=all[1]||[];
  }catch(e){console.error(e);inventory=[];redemptions=[]}
}
function isOwned(itemId){return inventory.some(function(x){return String(x.item_id)===String(itemId)})}
function redemptionName(r){var it=itemById(r.item_id);return it?it.name:'선물'}
function renderShop(){
  if(!selectedCharacter)return;
  el('shopBalance').textContent=selectedCharacter.name+'의 보유 크리스털: ◆ '+selectedCharacter.coins;
  var box=el('shopList');box.innerHTML='';
  shopItems.forEach(function(it){
    var owned=isOwned(it.id),equipped=String(selectedCharacter.equipped_item_id||'')===String(it.id),d=document.createElement('div');d.className='shop-item';
    d.innerHTML='<div class="shop-icon '+itemArtClass(it)+'" aria-label="'+esc(it.name)+'"></div><div class="shop-name">'+esc(it.name)+'</div><div class="shop-desc">'+esc(it.description)+'</div><div class="shop-price">'+it.price+'</div>';
    var b=document.createElement('button');b.type='button';b.className='shop-btn';
    if(it.category==='avatar'&&owned){b.textContent=equipped?'장착 중':'장착하기';b.disabled=equipped;b.onclick=function(){equipItem(it)}}
    else{b.textContent=it.category==='gift'?'교환 신청':'구매하기';b.disabled=selectedCharacter.coins<it.price;b.onclick=function(){purchaseItem(it)}}
    d.appendChild(b);box.appendChild(d);
  });
  var rbox=el('redemptionList');
  if(!redemptions.length)rbox.innerHTML='아직 현실 선물 교환 신청이 없습니다.';
  else rbox.innerHTML=redemptions.map(function(r){var status={pending:'승인 대기',approved:'승인',fulfilled:'지급 완료',cancelled:'취소'}[r.status]||r.status;return esc(redemptionName(r))+' · '+esc(status)+' · '+new Date(r.created_at).toLocaleString('ko-KR')}).join('<br>');
}
el('shopBtn').onclick=async function(){if(!selectedCharacter){alert('먼저 캐릭터를 만들어 선택해 주세요.');return}await loadCharacterShopData();renderShop();openModal('shopModal')};
async function purchaseItem(it){
  if(it.category==='gift'&&!confirm(it.name+'을(를) ◆ '+it.price+' 크리스털로 교환 신청할까요?\n현실 선물은 보호자 승인 후 지급됩니다.'))return;
  try{
    var rows=await rpc('purchase_shop_item',{p_character_id:selectedCharacter.id,p_item_id:it.id}),res=rows&&rows[0];
    if(res)selectedCharacter.coins=res.new_balance;
    await Promise.all([loadCharacters(),loadCharacterShopData()]);renderShop();renderCharacters();renderDashboard();
    alert(it.category==='gift'?'교환 신청이 등록되었습니다.':'아이템을 구매했습니다!');
  }catch(e){console.error(e);alert(String(e.message).indexOf('not enough coins')>=0?'코인이 부족합니다.':'구매할 수 없습니다.')}
}
async function equipItem(it){
  try{await rpc('equip_avatar_item',{p_character_id:selectedCharacter.id,p_item_id:it.id});selectedCharacter.equipped_item_id=it.id;await loadCharacters();await loadCharacterShopData();renderShop()}catch(e){console.error(e);alert('아이템 장착에 실패했습니다.')}
}

function selectButtons(attr,value){var bs=document.querySelectorAll('['+attr+']');for(var i=0;i<bs.length;i++)bs[i].classList.toggle('active',bs[i].getAttribute(attr)===value)}
async function saveGameResult(clear,duration){
  el('saveState').textContent='기록과 크리스털 저장 중...';
  if(!selectedCharacter){el('saveState').textContent='⚠ 캐릭터 정보 없음';return null}
  try{
    var rows=await rpc('award_game_result',{p_character_id:selectedCharacter.id,p_stage:stages[stage].name,p_correct:correct,p_total:deck.length,p_cleared:clear,p_duration_ms:Math.round(duration)}),res=rows&&rows[0];
    if(res){selectedCharacter.coins=res.balance;el('saveState').textContent='✓ Supabase 저장 완료';return res}
    el('saveState').textContent='✓ Supabase 저장 완료';return null;
  }catch(e){console.error(e);el('saveState').textContent='⚠ 기록 저장 실패';return null}
}
async function getRecords(){var url='game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned&player=eq.'+encodeURIComponent(player)+'&order=created_at.desc&limit=8';return apiGet(url)}
async function getAllRecords(){return apiGet('game_scores?select=player,stage,correct,total,cleared,created_at,character_id,duration_ms,coins_earned&order=created_at.desc&limit=1000')}
async function getAllCharacters(){return apiGet('game_characters?select=id,player,name,class,accent,coins,equipped_item_id,created_at&order=created_at.asc')}
function rate(x){return x.total?x.correct/x.total:0}
function better(a,b){
  if(!b)return true;
  if(!!a.cleared!==!!b.cleared)return !!a.cleared;
  if(a.cleared&&b.cleared&&a.duration_ms!=null&&b.duration_ms!=null&&a.duration_ms!==b.duration_ms)return a.duration_ms<b.duration_ms;
  if(rate(a)!==rate(b))return rate(a)>rate(b);
  if(a.correct!==b.correct)return a.correct>b.correct;
  return new Date(a.created_at)>new Date(b.created_at);
}
function rankRows(list,charMap){
  if(!list.length)return '<div class="empty">아직 기록이 없습니다.</div>';
  return list.map(function(x,i){var c=x.character_id?charMap[x.character_id]:null,name=c?c.name:x.player,meta=x.stage+' · '+(x.cleared?'CLEAR '+fmtTime(x.duration_ms):'GAME OVER');return '<div class="rank-row"><div class="rank-no">'+(i+1)+'</div><div><b>'+esc(name)+'</b><div class="tiny">'+esc(x.player)+' · '+esc(meta)+'</div></div><div class="rank-score">'+x.correct+'/'+x.total+(x.coins_earned?'<div class="tiny">◆ +'+x.coins_earned+'</div>':'')+'</div></div>'}).join('')
}
async function renderDashboard(){
  el('rankStatus').textContent='불러오는 중...';
  try{
    var all=await Promise.all([getAllRecords(),getAllCharacters()]),rows=all[0],chars=all[1],charMap={};chars.forEach(function(c){charMap[c.id]=c});var stageName=stages[stage].name;
    el('stageRankTitle').textContent=stageName+' 최고 기록';
    var stageBest=[],ids={};
    rows.filter(function(x){return x.stage===stageName}).forEach(function(x){var key=x.character_id||x.player;if(!ids[key]||better(x,ids[key]))ids[key]=x});Object.keys(ids).forEach(function(k){stageBest.push(ids[k])});stageBest.sort(function(a,b){return better(a,b)?-1:better(b,a)?1:0});
    el('stageRanking').innerHTML=rankRows(stageBest.slice(0,8),charMap);
    var coinRank=chars.slice().sort(function(a,b){return b.coins-a.coins||new Date(a.created_at)-new Date(b.created_at)});
    el('overallRanking').innerHTML=coinRank.length?coinRank.slice(0,8).map(function(c,i){return '<div class="rank-row"><div class="rank-no">'+(i+1)+'</div><div><b>'+esc(c.name)+'</b><div class="tiny">'+esc(c.player)+' · '+esc(classData(c.class).label)+'</div></div><div class="rank-score">◆ '+c.coins+'</div></div>'}).join(''):'<div class="empty">아직 캐릭터가 없습니다.</div>';
    var out='';players.forEach(function(p){out+='<div class="best-card"><b>'+esc(p)+'</b>';Object.keys(stages).forEach(function(k){var name=stages[k].name,best=null;rows.filter(function(x){return x.player===p&&x.stage===name}).forEach(function(x){if(better(x,best))best=x});out+='<div class="best-line"><span>'+name+'</span><span class="best-val">'+(best?(best.cleared?fmtTime(best.duration_ms):best.correct+'/'+best.total):'-')+'</span></div>'});out+='</div>'});el('bestGrid').innerHTML=out;
    el('rankStatus').textContent='● 연결됨';
  }catch(e){console.error(e);el('rankStatus').textContent='연결 실패';el('stageRanking').innerHTML='<div class="empty">랭킹을 불러오지 못했습니다.</div>';el('overallRanking').innerHTML='';el('bestGrid').innerHTML=''}
}
async function renderHistory(){
  var box=el('historyList');box.innerHTML='<div class="empty">기록 불러오는 중...</div>';el('dbStatus').textContent='';
  try{
    var all=await Promise.all([getRecords(),getAllCharacters()]),rows=all[0],chars=all[1],map={};chars.forEach(function(c){map[c.id]=c});el('dbStatus').textContent='● 연결됨';
    if(!rows.length){box.innerHTML='<div class="empty">아직 저장된 점수가 없습니다.</div>';return}
    box.innerHTML='';rows.forEach(function(x){var d=document.createElement('div'),date=new Date(x.created_at),c=x.character_id?map[x.character_id]:null;d.className='record';d.innerHTML='<div><b>'+esc(c?c.name:x.player)+'</b><br><span class="tiny">'+esc(x.stage)+' · '+date.toLocaleString('ko-KR')+' · '+(x.cleared?'CLEAR '+fmtTime(x.duration_ms):'GAME OVER')+(x.coins_earned?' · ◆ +'+x.coins_earned:'')+'</span></div><div class="score">'+x.correct+'/'+x.total+'</div>';box.appendChild(d)})
  }catch(e){console.error(e);el('dbStatus').textContent='연결 실패';box.innerHTML='<div class="empty">Supabase 기록을 불러오지 못했습니다.</div>'}
}

function posMatch(a,b){return a[1]===b[1]||a[1].indexOf(b[1])>=0||b[1].indexOf(a[1])>=0}
function formScore(a,b){var s=0;if(a[0].charAt(0)===b[0].charAt(0))s+=3;s+=Math.max(0,5-Math.abs(a[0].length-b[0].length));if(a[1]===b[1])s+=6;else if(posMatch(a,b))s+=4;return s+Math.random()*2}
function distractors(q,pool){return pool.filter(function(x){return x[0]!==q[0]}).sort(function(a,b){return formScore(q,b)-formScore(q,a)}).slice(0,8)}
function speakEnglish(text){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;var vs=window.speechSynthesis.getVoices();u.voice=vs.find(function(v){return /^en-US/i.test(v.lang)})||vs.find(function(v){return /^en/i.test(v.lang)})||null;window.speechSynthesis.speak(u)}
el('speakerBtn').onclick=function(){if(currentEnglish)speakEnglish(currentEnglish)};
function clearTimer(){if(timerId){clearInterval(timerId);timerId=null}}
function startTimer(){clearTimer();deadline=performance.now()+5000;questionStartedAt=performance.now();el('timer').textContent='5.0';el('timerBox').classList.remove('danger-time');timerId=setInterval(function(){var left=Math.max(0,deadline-performance.now());el('timer').textContent=(left/1000).toFixed(1);el('timerBox').classList.toggle('danger-time',left<=2000);if(left<=0){clearTimer();timeOut()}},50)}
function addQuestionTime(){if(questionStartedAt){elapsedMs+=Math.max(0,Math.min(5000,performance.now()-questionStartedAt));questionStartedAt=0}}
function start(){
  if(!selectedCharacter){alert('먼저 캐릭터를 만들어 선택해 주세요.');return}
  clearTimer();deck=shuffle(stages[stage].words).map(function(w){return{item:w,mode:Math.random()<.5?'en-ko':'ko-en'}});idx=0;correct=0;locked=false;elapsedMs=0;questionStartedAt=0;
  el('setup').classList.add('hide');el('dashboardCard').classList.add('hide');el('result').style.display='none';el('game').style.display='block';el('historyCard').classList.add('hide');renderQuestion()
}
function renderQuestion(){
  if(idx>=deck.length)return finish(true);
  locked=false;var q=deck[idx],item=q.item,enko=q.mode==='en-ko',pool=stages[stage].words,ds=distractors(item,pool),answer=enko?'['+item[1]+'] '+item[2]:item[0],opts=[answer];currentAnswer=answer;currentEnglish=item[0];shuffle(ds).slice(0,3).forEach(function(x){opts.push(enko?'['+x[1]+'] '+x[2]:x[0])});opts=shuffle(opts);
  var ci=classData(selectedCharacter.class);el('gameAvatar').className='mini-avatar '+selectedCharacter.accent;el('gameAvatar').textContent=ci.icon;el('who').textContent=player;el('charName').textContent=selectedCharacter.name;el('stageName').textContent=stages[stage].name;el('liveScore').textContent=liveScoreText();el('progress').style.width=(idx/deck.length*100)+'%';el('direction').textContent=enko?'영어 → 뜻':'뜻 → 영어';el('question').textContent=enko?item[0]:'['+item[1]+'] '+item[2];el('speakerBtn').classList.toggle('show',enko);el('hint').textContent=enko?'🔊 버튼으로 발음을 듣고 5초 안에 답하세요. 정답을 맞히면 발음이 다시 재생됩니다.':'정답 영어를 누르면 발음이 재생됩니다. 5초 안에 답하세요.';el('feedback').textContent='';var box=el('choices');box.innerHTML='';opts.forEach(function(o){var b=document.createElement('button');b.type='button';b.className='choice';b.textContent=o;b.onclick=function(){choose(b,o,answer)};box.appendChild(b)});startTimer()
}
function markCorrect(answer){var bs=el('choices').querySelectorAll('button');for(var i=0;i<bs.length;i++){bs[i].disabled=true;if(bs[i].textContent===answer)bs[i].classList.add('correct')}}
function choose(button,chosen,answer){
  if(locked)return;locked=true;clearTimer();addQuestionTime();var ok=chosen===answer;markCorrect(answer);
  if(ok){
    correct++;
    var bonus=(correct%5===0)?1:0;
    el('liveScore').textContent=liveScoreText();
    el('feedback').textContent=bonus?'정답! ◆ +1 · '+correct+' COMBO! 보너스 ◆ +1':'정답! ◆ +1';
    speakEnglish(currentEnglish);
    setTimeout(function(){idx++;renderQuestion()},900)
  }else{
    button.classList.add('wrong');el('feedback').textContent='오답! GAME OVER';setTimeout(function(){finish(false,answer,'wrong')},900)
  }
}
function timeOut(){if(locked)return;locked=true;elapsedMs+=5000;questionStartedAt=0;markCorrect(currentAnswer);el('feedback').textContent='시간 초과! GAME OVER';setTimeout(function(){finish(false,currentAnswer,'timeout')},850)}
async function finish(clear,answer,reason){
  clearTimer();if(window.speechSynthesis)window.speechSynthesis.cancel();el('game').style.display='none';el('result').style.display='block';el('historyCard').classList.remove('hide');el('dashboardCard').classList.remove('hide');el('finalScore').textContent=correct+'/'+deck.length;el('finalScore').classList.toggle('gameover',!clear);el('resultTag').textContent=clear?'STAGE CLEAR':'GAME OVER';el('resultTitle').textContent=clear?'퀘스트 클리어!':reason==='timeout'?'5초 시간 초과!':'한 문제 틀려서 종료!';el('resultText').textContent=clear?(selectedCharacter.name+' · '+stages[stage].name+' · 클리어 타임 '+fmtTime(elapsedMs)):(selectedCharacter.name+' · '+stages[stage].name+' · '+(idx+1)+'번째 문제에서 종료'+(answer?' · 정답: '+answer:''));el('rewardBox').classList.add('hide');el('rewardBox').innerHTML='';
  var res=await saveGameResult(clear,elapsedMs);
  if(res){
    var combo=comboBonus(correct),bits=['정답 '+correct+'문제 +'+correct];
    if(combo>0)bits.push('5연속 콤보 보너스 '+combo+'회 +'+combo);
    if(clear)bits.push('스테이지 클리어 +10');
    el('rewardBox').innerHTML='◆ <b>+'+res.coins_earned+' 크리스털 획득</b><br><span class="tiny">'+bits.join(' · ')+'</span><br>현재 보유: ◆ '+res.balance;
    el('rewardBox').classList.remove('hide')
  }
  await Promise.all([loadCharacters(),renderHistory(),renderDashboard()])
}

el('startBtn').onclick=start;el('againBtn').onclick=start;el('homeBtn').onclick=function(){clearTimer();el('result').style.display='none';el('setup').classList.remove('hide');el('dashboardCard').classList.remove('hide');el('historyCard').classList.remove('hide');renderCharacters();renderHistory();renderDashboard()};

async function init(){
  var q=document.querySelector('.quest-head span');if(q)q.textContent='정답 1개마다 크리스털 1개 · 5연속 콤보마다 +1개 · 스테이지 클리어 +10개';
  renderStageButtons();await loadPlayerList();await loadShopItems();await loadCharacters();await Promise.all([renderHistory(),renderDashboard()])
}
init();
})();
