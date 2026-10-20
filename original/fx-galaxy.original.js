/* VERBATIM COPY from _tsPro/static/fx.js - line 8 and lines 19-55 (read-only reference, not used by the playground) */
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------- galaxy */
const PAL=["#8ab4f8","#4285f4","#1a73e8","#00c2ff","#a5d8ff","#7c9cff","#c3e6ff","#5e97f6"];
window.fxGalaxy=function(cv,o={}){
 const N=o.n||380,P=[],ctx=cv.getContext("2d"),ARMS=3;
 for(let i=0;i<N;i++){const gr=Math.pow(Math.random(),.65);
  P.push({orR:Math.sqrt((i+.5)/N),orA:i*2.39996,gr,ga:(i%ARMS)*2*Math.PI/ARMS+gr*4.4+(Math.random()-.5)*(.9-.5*gr),
   sz:.5+Math.random()*1.5,c:PAL[i%PAL.length],tw:Math.random()*6.28,x:NaN,y:NaN})}
 let mix=0,hover=0,rot=0,spd=1,mx=-1e4,my=-1e4,last=performance.now(),vis=true,w=0,h=0;
 const pos=e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top};
 const host=o.host||cv;
 host.addEventListener("pointerenter",e=>{hover=1;pos(e)});host.addEventListener("pointermove",pos);
 host.addEventListener("pointerleave",()=>{hover=0;mx=my=-1e4});
 if("IntersectionObserver" in window)new IntersectionObserver(es=>vis=es[0].isIntersecting).observe(cv);
 function frame(now){if(!cv.isConnected)return;requestAnimationFrame(frame);
  const dt=Math.min(50,now-last)/16.67;last=now;if(!vis||document.hidden)return;
  const dpr=Math.min(2,devicePixelRatio||1),cw=cv.clientWidth,ch=cv.clientHeight;
  if(cw!=w||ch!=h){w=cw;h=ch;cv.width=w*dpr;cv.height=h*dpr}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const ai=document.body.classList.contains("fx-ai"),want=Math.max(hover,ai?1:0);
  mix+=(want-mix)*.045*dt;spd+=((ai?3.2:1+mix*2.6)-spd)*.04*dt;rot+=.0035*spd*dt*(reduce?.25:1);
  const cx=w/2,cy=h/2,R=Math.min(w,h)*.44,tilt=-.38,ct=Math.cos(tilt),st=Math.sin(tilt);
  ctx.globalCompositeOperation="lighter";
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R*(.55+.25*mix));
  g.addColorStop(0,`rgba(138,180,248,${.30+.35*mix})`);g.addColorStop(.4,`rgba(66,133,244,${.10+.18*mix})`);g.addColorStop(1,"rgba(26,115,232,0)");
  ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(const p of P){
   const oa=p.orA+rot,ox=Math.cos(oa)*p.orR,oy=Math.sin(oa)*p.orR;
   const ga=p.ga+rot*(1.5/(p.gr+.3)),gx0=Math.cos(ga)*p.gr,gy0=Math.sin(ga)*p.gr*.58,gx=gx0*ct-gy0*st,gy=gx0*st+gy0*ct;
   let m=Math.min(1,Math.max(0,mix*1.7-p.gr*.7));m=m*m*(3-2*m);   // the morph runs from the centre outwards
   let x=cx+R*(ox+(gx-ox)*m),y=cy+R*(oy+(gy-oy)*m);
   const dx=x-mx,dy=y-my,d2=dx*dx+dy*dy;
   if(d2<3600){const d=Math.sqrt(d2)||1,f=(3600-d2)/3600*14;x+=dx/d*f;y+=dy/d*f}
   if(isNaN(p.x)){p.x=x;p.y=y}else{p.x+=(x-p.x)*Math.min(1,.22*dt);p.y+=(y-p.y)*Math.min(1,.22*dt)}
   ctx.globalAlpha=.45+.45*Math.sin(now/650+p.tw);ctx.fillStyle=p.c;
   ctx.beginPath();ctx.arc(p.x,p.y,p.sz*(.85+.35*m),0,6.2832);ctx.fill()}
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1}
 requestAnimationFrame(frame)};
