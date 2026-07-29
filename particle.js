// particles.js - simple weather particles
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
let drops = [];
let fxMode = 'none';

function resizeFx(){ fx.width = innerWidth; fx.height = innerHeight; }
addEventListener('resize', resizeFx); resizeFx();

function makeParticles(type){
  drops = [];
  fxMode = type;
  const base = Math.min(220, Math.floor(innerWidth/6));
  for(let i=0;i<base;i++){
    drops.push({
      x: Math.random()*fx.width,
      y: Math.random()*fx.height,
      s: Math.random()*2 + 0.5,
      v: Math.random()*1.4 + 0.4,
      r: Math.random()*360
    });
  }
}

function tick(){
  ctx.clearRect(0,0,fx.width,fx.height);

  if(fxMode === 'none'){
    requestAnimationFrame(tick);
    return;
  }

  drops.forEach(p=>{
    if(fxMode === 'rain'){
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x+2, p.y+10);
      ctx.stroke();
      p.y += p.v * 6;
      p.x += 0.6;
    } else if(fxMode === 'snow'){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s*2, 0, Math.PI*2);
      ctx.fill();
      p.y += p.v*1.2;
      p.x += Math.sin(p.y/30)*0.4;
    } else if(fxMode === 'mist'){
      ctx.fillStyle = 'rgba(200,220,255,0.06)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s*10, 0, Math.PI*2);
      ctx.fill();
      p.y += p.v*0.3;
      p.x += 0.1;
    } else if(fxMode === 'sun'){
      // subtle sparkle
      ctx.fillStyle = 'rgba(255,255,215,0.08)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s*3, 0, Math.PI*2);
      ctx.fill();
      p.y += Math.sin(p.x/50)*0.1;
      p.x += Math.cos(p.y/40)*0.1;
    }

    if(p.y > fx.height + 20) { p.y = -10; p.x = Math.random()*fx.width; }
    if(p.x > fx.width + 20) { p.x = -10; }
  });

  requestAnimationFrame(tick);
}
tick();

function setFxMode(main) {
  if(!main){ fxMode = 'none'; drops = []; return; }
  if(['Rain','Drizzle','Thunderstorm'].includes(main)) makeParticles('rain');
  else if(main === 'Snow') makeParticles('snow');
  else if(['Mist','Haze','Fog','Smoke','Dust','Ash','Sand'].includes(main)) makeParticles('mist');
  else if(main === 'Clear') makeParticles('sun');
  else { fxMode='none'; drops=[]; }
}

// expose
window.setFxMode = setFxMode;
