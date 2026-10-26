
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const notice=document.querySelector('.notice');
const specs={
  idle:{file:'char_dark_triton_idle_strip.png',durations:[600,600]},
  stormsurge:{file:'char_dark_triton_stormsurge_strip.png',durations:[180,180,240],projectile:'wave'},
  'trident-throw':{file:'char_dark_triton_trident_throw_strip.png',durations:[180,180,240],projectile:'trident'},
  hit:{file:'char_dark_triton_hit_strip.png',durations:[120,140,600]},
  wave:{file:'fx_dark_triton_wave_strip.png',durations:[110,140,180]},
  trident:{file:'fx_dark_triton_trident_strip.png',durations:[110,140,180]}
};
for(const spec of Object.values(specs)){spec.image=new Image();spec.image.src=spec.file;}
let action='idle',elapsed=0,last=0,paused=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelector('#motion').setAttribute('aria-pressed',String(reduced));
function frameAt(durations,time,loop=false){const total=durations.reduce((a,b)=>a+b,0);if(loop)time%=total;for(let i=0;i<durations.length;i++){if(time<durations[i])return i;time-=durations[i];}return durations.length-1;}
function drawFrame(spec,frame,x,y,w=480,h=320){if(spec.image.complete&&spec.image.naturalWidth)ctx.drawImage(spec.image,frame*480,0,480,320,x,y,w,h);}
function select(next){action=next;elapsed=0;for(const button of document.querySelectorAll('[data-action]'))button.setAttribute('aria-pressed',String(button.dataset.action===next));}
document.querySelector('#actions').onclick=e=>{if(e.target.dataset.action)select(e.target.dataset.action);};
document.querySelector('#theme').onclick=()=>document.body.classList.toggle('violet');
document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'재생':'일시정지';};
document.querySelector('#motion').onclick=e=>{reduced=!reduced;e.target.setAttribute('aria-pressed',String(reduced));select(action);};
function tick(now){if(last&&!paused)elapsed+=Math.min(now-last,100);last=now;ctx.clearRect(0,0,960,360);
  const speed=reduced?.4:1,time=elapsed/speed,spec=specs[action];
  ctx.strokeStyle='#60d9cf';ctx.lineWidth=4;ctx.beginPath();ctx.arc(140,210,44,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=document.body.classList.contains('violet')?'white':'#24214c';ctx.font='20px system-ui';ctx.fillText('접촉 목표',98,295);
  const end=spec.durations.reduce((a,b)=>a+b,0);
  const drawing=spec.projectile&&time>end+600?specs.idle:spec;
  drawFrame(drawing,frameAt(drawing.durations,drawing===spec?time:time-end-600,drawing===specs.idle),430,30);
  let message=action==='idle'?'대기':action==='hit'?(time>=260?'쓰러짐 · 마지막 프레임 유지':'피격 반응'):'준비 → 발사';
  if(spec.projectile){const flight=time-360,fx=specs[spec.projectile];
    if(flight>=0&&flight<430){const progress=Math.min(1,flight/250);const origin=action==='stormsurge'?465:530;drawFrame(fx,frameAt(fx.durations,flight),origin-120-progress*(origin-140),95+progress*35,240,160);}
    if(flight>=250)message=action==='stormsurge'?'접촉 · 카드 무작위 섞기':'접촉 · 플레이어 HP −1';
  }
  notice.textContent=message;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
