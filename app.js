(function(){
'use strict';

var SUPABASE_URL='https://uobagmggryhsqlpxhfob.supabase.co';
var SUPABASE_KEY='sb_publishable_NnzXTAh_47i7g5ndSzkxEQ_gy7X-lAz';
var stages=window.QUIZ_STAGES||{};
var player='율이',stage='s1',deck=[],idx=0,correct=0,locked=false,currentEnglish='',timerId=null,deadline=0,currentAnswer='';

function el(id){return document.getElementById(id)}
function shuffle(a){var x=a.slice();for(var i=x.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=x[i];x[i]=x[j];x[j]=t}return x}
function headers(extra){var h={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY};if(extra)Object.keys(extra).forEach(function(k){h[k]=extra[k]});return h}

async function saveToDb(clear){
  el('saveState').textContent='기록 저장 중...';
  try{
    var r=await fetch(SUPABASE_URL+'/rest/v1/game_scores',{
      method:'POST',
      headers:headers({'Content-Type':'application/json','Prefer':'return=minimal'}),
      body:JSON.stringify({player:player,stage:stages[stage].name,correct:correct,total:deck.length,cleared:clear})
    });
    if(!r.ok)throw new Error(await r.text());
    el('saveState').textContent='✓ Supabase에 기록 저장 완료';
    return true;
  }catch(e){
    console.error(e);
    el('saveState').textContent='⚠ 기록 저장 실패';
    return false;
  }
}

async function getRecords(){
  var url=SUPABASE_URL+'/rest/v1/game_scores?select=player,stage,correct,total,cleared,created_at&player=eq.'+encodeURIComponent(player)+'&order=created_at.desc&limit=8';
  var r=await fetch(url,{headers:headers()});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
async function getAllRecords(){
  var url=SUPABASE_URL+'/rest/v1/game_scores?select=player,stage,correct,total,cleared,created_at&order=created_at.desc&limit=1000';
  var r=await fetch(url,{headers:headers()});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}

function rate(x){return x.total?x.correct/x.total:0}
function better(a,b){
  if(!b)return true;
  if(rate(a)!==rate(b))return rate(a)>rate(b);
  if(!!a.cleared!==!!b.cleared)return !!a.cleared;
  if(a.correct!==b.correct)return a.correct>b.correct;
  return new Date(a.created_at)>new Date(b.created_at);
}
function rankRows(list){
  if(!list.length)return '<div class="empty">아직 기록이 없습니다.</div>';
  return list.map(function(x,i){
    return '<div class="rank-row"><div class="rank-no">'+(i+1)+'</div><div><b>'+x.player+'</b><div class="tiny">'+x.stage+' · '+(x.cleared?'CLEAR':'GAME OVER')+'</div></div><div class="rank-score">'+x.correct+'/'+x.total+'<div class="tiny">'+Math.round(rate(x)*100)+'%</div></div></div>';
  }).join('');
}
async function renderDashboard(){
  el('rankStatus').textContent='불러오는 중...';
  try{
    var rows=await getAllRecords(),players=['율이','아빠','손님'],stageName=stages[stage].name;
    el('stageRankTitle').textContent=stageName+' 랭킹';

    var stageBest=[];
    players.forEach(function(p){
      var best=null;
      rows.filter(function(x){return x.player===p&&x.stage===stageName}).forEach(function(x){if(better(x,best))best=x});
      if(best)stageBest.push(best);
    });
    stageBest.sort(function(a,b){return better(a,b)?-1:better(b,a)?1:0});
    el('stageRanking').innerHTML=rankRows(stageBest);

    var overall=[];
    players.forEach(function(p){
      var best=null;
      rows.filter(function(x){return x.player===p}).forEach(function(x){if(better(x,best))best=x});
      if(best)overall.push(best);
    });
    overall.sort(function(a,b){return better(a,b)?-1:better(b,a)?1:0});
    el('overallRanking').innerHTML=rankRows(overall);

    var out='';
    players.forEach(function(p){
      out+='<div class="best-card"><b>'+p+'</b>';
      Object.keys(stages).forEach(function(k){
        var name=stages[k].name,best=null;
        rows.filter(function(x){return x.player===p&&x.stage===name}).forEach(function(x){if(better(x,best))best=x});
        out+='<div class="best-line"><span>'+name+'</span><span class="best-val">'+(best?best.correct+'/'+best.total:'-')+'</span></div>';
      });
      out+='</div>';
    });
    el('bestGrid').innerHTML=out;
    el('rankStatus').textContent='● 연결됨';
  }catch(e){
    console.error(e);
    el('rankStatus').textContent='연결 실패';
    el('stageRanking').innerHTML='<div class="empty">랭킹을 불러오지 못했습니다.</div>';
    el('overallRanking').innerHTML='';
    el('bestGrid').innerHTML='';
  }
}
async function renderHistory(){
  var box=el('historyList');
  box.innerHTML='<div class="empty">기록 불러오는 중...</div>';
  el('dbStatus').textContent='';
  try{
    var rows=await getRecords();
    el('dbStatus').textContent='● 연결됨';
    if(!rows.length){box.innerHTML='<div class="empty">아직 저장된 점수가 없습니다.</div>';return}
    box.innerHTML='';
    rows.forEach(function(x){
      var d=document.createElement('div'),date=new Date(x.created_at);
      d.className='record';
      d.innerHTML='<div><b>'+x.player+'</b><br><span class="tiny">'+x.stage+' · '+date.toLocaleString('ko-KR')+' · '+(x.cleared?'CLEAR':'GAME OVER')+'</span></div><div class="score">'+x.correct+'/'+x.total+'</div>';
      box.appendChild(d);
    });
  }catch(e){
    console.error(e);
    el('dbStatus').textContent='연결 실패';
    box.innerHTML='<div class="empty">Supabase 기록을 불러오지 못했습니다.</div>';
  }
}

function selectButtons(attr,value){
  var bs=document.querySelectorAll('['+attr+']');
  for(var i=0;i<bs.length;i++)bs[i].classList.toggle('active',bs[i].getAttribute(attr)===value);
}
Array.prototype.forEach.call(document.querySelectorAll('[data-player]'),function(b){
  b.onclick=function(){player=this.getAttribute('data-player');selectButtons('data-player',player);renderHistory()};
});
Array.prototype.forEach.call(document.querySelectorAll('[data-stage]'),function(b){
  b.onclick=function(){stage=this.getAttribute('data-stage');selectButtons('data-stage',stage);renderDashboard()};
});

function posMatch(a,b){return a[1]===b[1]||a[1].indexOf(b[1])>=0||b[1].indexOf(a[1])>=0}
function formScore(a,b){
  var s=0;
  if(a[0].charAt(0)===b[0].charAt(0))s+=3;
  s+=Math.max(0,5-Math.abs(a[0].length-b[0].length));
  if(a[1]===b[1])s+=6;else if(posMatch(a,b))s+=4;
  return s+Math.random()*2;
}
function distractors(q,pool){
  return pool.filter(function(x){return x[0]!==q[0]}).sort(function(a,b){return formScore(q,b)-formScore(q,a)}).slice(0,8);
}
function speakEnglish(text){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(text);
  u.lang='en-US';u.rate=.82;
  var vs=window.speechSynthesis.getVoices();
  u.voice=vs.find(function(v){return /^en-US/i.test(v.lang)})||vs.find(function(v){return /^en/i.test(v.lang)})||null;
  window.speechSynthesis.speak(u);
}
el('speakerBtn').onclick=function(){if(currentEnglish)speakEnglish(currentEnglish)};

function clearTimer(){if(timerId){clearInterval(timerId);timerId=null}}
function startTimer(){
  clearTimer();
  deadline=performance.now()+5000;
  el('timer').textContent='5.0';
  el('timerBox').classList.remove('danger-time');
  timerId=setInterval(function(){
    var left=Math.max(0,deadline-performance.now());
    el('timer').textContent=(left/1000).toFixed(1);
    el('timerBox').classList.toggle('danger-time',left<=2000);
    if(left<=0){clearTimer();timeOut()}
  },50);
}
function start(){
  clearTimer();
  deck=shuffle(stages[stage].words).map(function(w){return{item:w,mode:Math.random()<.5?'en-ko':'ko-en'}});
  idx=0;correct=0;locked=false;
  el('setup').classList.add('hide');
  el('dashboardCard').classList.add('hide');
  el('result').style.display='none';
  el('game').style.display='block';
  el('historyCard').classList.add('hide');
  renderQuestion();
}
function renderQuestion(){
  if(idx>=deck.length)return finish(true);
  locked=false;
  var q=deck[idx],item=q.item,enko=q.mode==='en-ko',pool=stages[stage].words,ds=distractors(item,pool);
  var answer=enko?'['+item[1]+'] '+item[2]:item[0],opts=[answer];
  currentAnswer=answer;
  currentEnglish=item[0];

  shuffle(ds).slice(0,3).forEach(function(x){opts.push(enko?'['+x[1]+'] '+x[2]:x[0])});
  opts=shuffle(opts);

  el('who').textContent=player;
  el('stageName').textContent=stages[stage].name;
  el('liveScore').textContent=correct+'/'+deck.length;
  el('progress').style.width=(idx/deck.length*100)+'%';
  el('direction').textContent=enko?'영어 → 뜻':'뜻 → 영어';
  el('question').textContent=enko?item[0]:'['+item[1]+'] '+item[2];
  el('speakerBtn').classList.toggle('show',enko);
  el('hint').textContent=enko?'🔊 버튼으로 발음을 듣고 5초 안에 답하세요. 정답을 맞히면 발음이 다시 재생됩니다.':'정답 영어를 누르면 발음이 재생됩니다. 5초 안에 답하세요.';
  el('feedback').textContent='';

  var box=el('choices');
  box.innerHTML='';
  opts.forEach(function(o){
    var b=document.createElement('button');
    b.type='button';b.className='choice';b.textContent=o;
    b.onclick=function(){choose(b,o,answer)};
    box.appendChild(b);
  });
  startTimer();
}
function markCorrect(answer){
  var bs=el('choices').querySelectorAll('button');
  for(var i=0;i<bs.length;i++){
    bs[i].disabled=true;
    if(bs[i].textContent===answer)bs[i].classList.add('correct');
  }
}
function choose(button,chosen,answer){
  if(locked)return;
  locked=true;clearTimer();
  var ok=chosen===answer;
  markCorrect(answer);
  if(ok){
    correct++;
    el('liveScore').textContent=correct+'/'+deck.length;
    el('feedback').textContent='정답!';
    speakEnglish(currentEnglish);
    setTimeout(function(){idx++;renderQuestion()},900);
  }else{
    button.classList.add('wrong');
    el('feedback').textContent='오답! GAME OVER';
    setTimeout(function(){finish(false,answer,'wrong')},900);
  }
}
function timeOut(){
  if(locked)return;
  locked=true;
  markCorrect(currentAnswer);
  el('feedback').textContent='시간 초과! GAME OVER';
  setTimeout(function(){finish(false,currentAnswer,'timeout')},850);
}
async function finish(clear,answer,reason){
  clearTimer();
  if(window.speechSynthesis)window.speechSynthesis.cancel();
  el('game').style.display='none';
  el('result').style.display='block';
  el('historyCard').classList.remove('hide');
  el('dashboardCard').classList.remove('hide');
  el('finalScore').textContent=correct+'/'+deck.length;
  el('finalScore').classList.toggle('gameover',!clear);
  el('resultTag').textContent=clear?'STAGE CLEAR':'GAME OVER';
  el('resultTitle').textContent=clear?'완벽 클리어!':reason==='timeout'?'5초 시간 초과!':'한 문제 틀려서 종료!';
  el('resultText').textContent=clear?(player+' · '+stages[stage].name+' 전 문제 정답'):(player+' · '+stages[stage].name+' · '+(idx+1)+'번째 문제에서 종료'+(answer?' · 정답: '+answer:''));
  await saveToDb(clear);
  await Promise.all([renderHistory(),renderDashboard()]);
}

el('startBtn').onclick=start;
el('againBtn').onclick=start;
el('homeBtn').onclick=function(){
  clearTimer();
  el('result').style.display='none';
  el('setup').classList.remove('hide');
  el('dashboardCard').classList.remove('hide');
  el('historyCard').classList.remove('hide');
  renderHistory();renderDashboard();
};

renderHistory();
renderDashboard();
})();
