// @ts-nocheck
// Ported from robot-squat-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "0 0 330 390";

export function createRobot({ reducedMotion = false, load }: { reducedMotion?: boolean; load?: number } = {}) {
const sp = reducedMotion ? 0.02 : 1;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
/* ---------- kernel ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 160, OY = 303;
const P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];
const D = (x,y,z) => [(x-y)*C, (x+y)*S - z];
const plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);
  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };
const TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);
const FRONT = (x,y,z) => plane([x,y,z],[1,0,0],[0,0,-1]);
const SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);
const rect = (t,w,h,r=0,cls='face') =>
  `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;
const box = (x,y,z,w,d,h,r=0) =>
  rect(SIDE(x+w,y+d,z+h), d,h,Math.min(r,h/4),'face side') +
  rect(FRONT(x,y+d,z+h), w,h,Math.min(r,h/4)) +
  rect(TOP(x,y,z+h), w,d,r,'face top');

/* ---------- vector + limb helpers ---------- */
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.hypot(a[0],a[1],a[2]), norm=a=>mul(a,1/len(a));
function ik(root,end,L1,L2,pole){               // two-bone solve; the middle joint bends toward `pole`
  let d=sub(end,root), dist=len(d); const m=L1+L2-0.01;
  if(dist>m){ d=mul(d,m/dist); dist=m; }
  const dh=mul(d,1/dist), a=(L1*L1-L2*L2+dist*dist)/(2*dist), h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const n=norm(sub(pole,mul(dh,dot(pole,dh))));
  return add(add(root,mul(dh,a)),mul(n,h));
}
const cap=(a,b,w)=>{ const p=P(...a), q=P(...b);
  const l=(c,sw)=>`<line class="${c}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke-width="${sw}"/>`;
  return l('lo',w+2.4)+l('lf',w); };
const ball=(c,r)=>{ const p=P(...c);
  return `<circle class="face joint" cx="${p[0]}" cy="${p[1]}" r="${r}"/><circle class="detail" cx="${p[0]}" cy="${p[1]}" r="${r*.4}"/>`; };
const act=(s,c='robot')=>`<g class="act ${c}" data-act="rep">${s}</g>`;

/* A box tilted about the x axis (the torso leans forward). `base` is the hip, l0..l0+L runs up the spine,
   w is the width across, T the front-to-back thickness. Faces are flat shapes on arbitrary planes. */
const EX=[1,0,0];
const axes=th=>({ u:[0,Math.sin(th),Math.cos(th)], b:[0,Math.cos(th),-Math.sin(th)] });
function tbox(base,th,l0,L,w,T,r,fd=''){
  const {u,b}=axes(th);
  const Q=add(add(add(base,mul(u,l0)),mul(EX,-w/2)),mul(b,-T/2));
  const front=plane(add(Q,mul(b,T)),EX,u);
  return rect(plane(add(Q,mul(EX,w)),b,u),T,L,r,'face side')
       + rect(front,w,L,r,'face')+(fd?`<g transform="${front}">${fd}</g>`:'')
       + rect(plane(add(Q,mul(u,L)),EX,b),w,T,r,'face top');
}

/* ---------- constants ---------- */
const MINKG=20, MAXKG=220, ROBOT_MAX=140;     // bar 20 kg, plates 20 kg each, two per step (one a side)
const ANK=14, L_TH=54, L_SH=52;

/* ---------- static scene: the plate pads ---------- */

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:100, reps:0, lifted:0, h:1, h0:0, hs:0, phase:'idle', t0:0, fail:false };   // h: 1 standing, 0 at depth
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,st.load/ROBOT_MAX) : 0;

function stack(s,yb,zb,n){
  let o=''; const idx=[...Array(n).keys()], cx=-yb, cy=-zb;          // SIDE plane: local u = -worldY, v = -z
  (s<0?idx.slice().reverse():idx).forEach(i=>{
    const xf = s<0 ? -(78+4*i) : (82+4*i);
    o+=`<g transform="${SIDE(xf-4,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="28"/></g>`;
    o+=`<g transform="${SIDE(xf,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="28"/>
        <circle class="detail" cx="${cx}" cy="${cy}" r="20"/><circle class="detail" cx="${cx}" cy="${cy}" r="5"/></g>`;
  });
  return o;
}
function faceFront(x0,y0,z0,e){            // eyes and grille on the head's front (+y) face
  const eh=7-4.4*e;
  let o=`<g transform="${FRONT(x0,y0,z0)}">`;
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${11-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 6 L11.5 6 M16.5 6 L23 6 M14 15 L14 19"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${23+2.6*i} L18.5 ${23+2.6*i}"/>`;
  return o+`</g>`;
}

function scene(){
  const t=1-st.h, th=.07+.63*t, {u,b}=axes(th), e=effort(), n=(st.load-MINKG)/40;
  const H=[0,-2-36*t,118-56*t], at=l=>add(H,mul(u,l));
  const Sh=at(62), Cb=add(add(Sh,mul(u,6)),mul(b,-19)), yb=Cb[1], zb=Cb[2];   // bar sits on the upper back
  const hb=at(80);                                                              // underside of the head

  const arm=s=>{ const sh=[31*s,Sh[1],Sh[2]], hand=[46*s,yb,zb], el=ik(sh,hand,34,32,[0,-.35,-1]);
    return cap(sh,el,14)+cap(el,hand,11)+ball(el,6)+ball(sh,9); };
  const fist=s=>`<g class="fist">${box(46*s-6,yb-7,zb-6,12,14,12,4)}</g>`;
  const leg=s=>{ const hip=[14*s,H[1],H[2]], ank=[14*s,0,ANK], knee=ik(hip,ank,L_TH,L_SH,[0,1,.1]);
    return `<g class="shoe">${box(14*s-9,-9,0,18,40,8,4)}</g>`+cap(knee,ank,16)+cap(hip,knee,21)+ball(knee,8)+ball(hip,9)+ball(ank,5.5); };
  const bar=(a,c)=>`<g class="bar">${cap([a,yb,zb],[c,yb,zb],6)}</g>`;

  let o='';
  o+=act(bar(-120,-60)+stack(-1,yb,zb,n));
  o+=act(bar(-80,82));
  o+=`<g class="cover">${box(-12.6,hb[1]-11.6,hb[2]+1.2,25.2,23.2,27.6,4)}</g>`;
  o+=act(arm(-1)+fist(-1));
  o+=act(leg(-1)+leg(1));
  o+=act(tbox(H,th,-10,24,46,32,7)
        +tbox(H,th,14,26,36,28,6,`<path class="detail" d="M5 9 L31 9 M5 17 L31 17"/>`)
        +tbox(H,th,38,32,58,34,8,`<rect class="detail" x="4" y="9" width="22" height="18" rx="7"/><rect class="detail" x="32" y="9" width="22" height="18" rx="7"/><path class="detail" d="M29 6 L29 30"/>`)
        +cap(at(66),[0,hb[1],hb[2]],12));
  o+=act(box(-17,hb[1]-3,hb[2]+9,3,8,12,1.5)+box(-14,hb[1]-13,hb[2],28,26,30,9)+box(14,hb[1]-3,hb[2]+9,3,8,12,1.5)
        +faceFront(-14,hb[1]+13,hb[2]+30,e),'robot head');
  o+=act(arm(1)+fist(1));
  o+=act(stack(1,yb,zb,n)+bar(82+4*n,120)); // near plates last; the bar behind them is part of the mid bar, only the tip through the hub is on top
  return o;
}

function rep(){
  if(st.phase!=='idle') return;
  st.fail=false; st.t0=performance.now();
  if(st.h>.5) st.phase='down'; else { st.phase='up'; st.h0=st.h; }
  
}
function step(now){
  const t=now-st.t0;
  switch(st.phase){
    case 'down': { const p=Math.min(1,t/(1000*sp)); st.h=1-ease(p); if(p>=1){ st.phase='pause'; st.t0=now; } break; }
    case 'pause': if(t>=200*sp){ st.phase='up'; st.t0=now; st.h0=0; } break;
    case 'up': {
      const failing=st.load>ROBOT_MAX, top=failing?.34:1;
      const p=Math.min(1,t/((failing?1700:600+st.load*5)*sp));
      st.h=st.h0+(top-st.h0)*(failing?1-Math.pow(1-p,2.2):ease(p));
      if(p>=1){
        if(failing){ st.phase='stall'; st.hs=st.h; st.t0=now; }
        else { st.h=1; st.reps++; st.lifted+=st.load; st.phase='idle'; }
      } break; }
    case 'stall': if(t>=300*sp){ st.phase='sink'; st.t0=now; } break;
    case 'sink': { const p=Math.min(1,t/(700*sp)); st.h=st.hs*(1-ease(p)); if(p>=1){ st.h=0; st.fail=true; st.phase='idle'; } break; }
  }
}
if (load !== undefined && 'load' in st) st.load = load;
return {
  scene,
  rep,
  step,
  busy: () => st.phase !== 'idle',
};
}
