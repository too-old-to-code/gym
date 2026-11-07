// @ts-nocheck
// Ported from robot-bench-press-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "0 0 540 460";

export function createRobot({ reducedMotion = false, load }: { reducedMotion?: boolean; load?: number } = {}) {
const sp = reducedMotion ? 0.02 : 1;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
/* ---------- kernel ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 375, OY = 242;
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

/* The robot, bench and rack are modelled in a local frame: x runs head -> feet, y runs across the body.
   They are placed into the world with local x -> world Y and local y -> world X, so the head end points
   away from the viewer and the barbell plates sit to the left and right of the body. */
const bx=(x,y,z,w,d,h,r=0)=>box(y,x,z,d,w,h,r);              // local box -> world box
const TL=z=>plane([0,0,z],[0,1,0],[1,0,0]);                    // local top plane (line detail only, no text)
const PL=a=>P(a[1],a[0],a[2]);                                 // local point -> screen

/* ---------- limb helpers (capsules between two 3D points) ---------- */
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len=a=>Math.hypot(a[0],a[1],a[2]), norm=a=>mul(a,1/len(a));
function ik(sh,hand,L1,L2,pole){               // two-bone solve; the elbow bends toward `pole`
  let d=sub(hand,sh), dist=len(d); const m=L1+L2-0.01;
  if(dist>m){ d=mul(d,m/dist); dist=m; }
  const dh=mul(d,1/dist), a=(L1*L1-L2*L2+dist*dist)/(2*dist), h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const n=norm(sub(pole,mul(dh,dot(pole,dh))));
  return add(add(sh,mul(dh,a)),mul(n,h));
}
const cap=(a,b,w)=>{ const p=PL(a), q=PL(b);
  const l=(c,sw)=>`<line class="${c}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke-width="${sw}"/>`;
  return l('lo',w+2.4)+l('lf',w); };
const ball=(c,r)=>{ const p=PL(c);
  return `<circle class="face joint" cx="${p[0]}" cy="${p[1]}" r="${r}"/><circle class="detail" cx="${p[0]}" cy="${p[1]}" r="${r*.4}"/>`; };
const act=(s,c='robot')=>`<g class="act ${c}" data-act="rep">${s}</g>`;

/* ---------- constants ---------- */
const BX=66;                       // bar position along the body (local x = world Y)
const ZLO=86, ZHI=152;             // bar height: on chest / locked out
const MINKG=20, MAXKG=120, ROBOT_MAX=100;

/* ---------- static scene ---------- */
const S_BENCH =
  `<g class="steel">`+bx(6,-30,0,8,8,36,1)+bx(6,22,0,8,8,36,1)+bx(166,-30,0,8,8,36,1)+bx(166,22,0,8,8,36,1)+`</g>`+
  `<g class="cushion">`+bx(0,-34,36,180,68,12,6)+
  `<g transform="${TL(48)}"><rect class="detail" x="5" y="-29" width="170" height="58" rx="4"/></g></g>`;

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:60, reps:0, lifted:0, h:1, h0:0, hs:0, phase:'idle', t0:0, fail:false };
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,st.load/ROBOT_MAX) : 0;

function stack(s,zb,n){
  let o=''; const idx=[...Array(n).keys()], cx=-BX, cy=-zb;          // SIDE plane: local u = -worldY, v = -z
  (s<0?idx.slice().reverse():idx).forEach((i,k)=>{
    const xf = s<0 ? -(86+4*i) : (90+4*i);
    o+=`<g transform="${SIDE(xf-4,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="28"/></g>`;
    o+=`<g transform="${SIDE(xf,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="28"/>
        <circle class="detail" cx="${cx}" cy="${cy}" r="20"/><circle class="detail" cx="${cx}" cy="${cy}" r="5"/></g>`;
  });
  return o;
}
function face(e){
  const eh=7-4.4*e, cy=6.5;
  let o=`<g transform="${TL(78)}">`;
  [-cy,cy].forEach(c=>{ o+=`<rect class="eye" x="19" y="${c-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M15.5 -12 L15.5 -2.5 M15.5 2.5 L15.5 12"/>`;
  o+=`<path class="detail" d="M27.5 -1.8 L31 0 L27.5 1.8"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M${34.5+2.6*i} -5.5 L${34.5+2.6*i} 5.5"/>`;
  return o+`</g>`;
}
const legGeo=s=>({hip:[156,15*s,62], knee:[216,17*s,76], ank:[212,18*s,17], y0:s>0?10:-26});
const shin=s=>{ const g=legGeo(s);
  return `<g class="shoe">`+bx(204,g.y0,0,36,16,11,4)+`</g>`
    +`<g transform="${TL(11)}"><path class="detail" d="M231 ${g.y0+2} L231 ${g.y0+14}"/></g>`
    +cap(g.knee,g.ank,16)+ball(g.knee,8)+ball(g.ank,5.5); };
const thigh=s=>{ const g=legGeo(s); return cap(g.hip,g.knee,21); };

function scene(){
  const e=effort(), zb=ZLO+(ZHI-ZLO)*st.h, n=(st.load-MINKG)/20, reps=String(st.reps).padStart(2,'0');
  const arm=s=>{ const sh=[66,36*s,74], hand=[BX,62*s,zb], el=ik(sh,hand,44,40,[0,.7*s,-.7]);
    return cap(sh,el,15)+cap(el,hand,12)+ball(el,6.5)+ball(sh,9.5); };
  const fist=s=>{ const y0=62*s-7; let o=`<g class="fist">${bx(BX-6,y0,zb-6,12,14,12,4)}</g>`;
    o+=`<g transform="${TL(zb+6)}">`;
    for(let i=0;i<4;i++){ const y=y0+2.6+i*3.2; o+=`<path class="detail" d="M${BX-6} ${y} L${BX+6} ${y}"/>`; }
    return o+`</g>`; };
  const barY=[BX,0,zb];
  const sleeve=(s)=>`<g class="bar">${cap([BX,s*128,zb],[BX,s*(s<0?60:86+4*n),zb],6)}</g>`;

  let o=S_BENCH+'';
  o+=act(sleeve(-1)+stack(-1,zb,n));
  o+=act(bx(24,-17,56,8,3,12,1.5)+bx(10,-14,48,32,28,30,9)+bx(24,14,56,8,3,12,1.5)+face(e),'robot head');
  o+=act(bx(42,-7,52,10,14,18,3));
  o+=act(arm(-1));
  o+=act(bx(52,-30,48,56,60,32,8)+
    `<g transform="${TL(80)}"><rect class="detail" x="60" y="-27" width="36" height="25" rx="9"/>
      <rect class="detail" x="60" y="2" width="36" height="25" rx="9"/><path class="detail" d="M56 0 L104 0"/>
      <path class="detail" d="M99 -22 L99 22"/></g>`);
  o+=act(arm(1));
  o+=act(bx(108,-23,48,26,46,24,4));
  o+=act(bx(134,-27,48,28,54,28,6)+`<g transform="${TL(76)}"><rect class="detail" x="137" y="-23" width="22" height="46" rx="5"/></g>`);
  o+=act(thigh(-1)+thigh(1)+shin(-1)+shin(1));
  o+=act(`<g class="bar">${cap([BX,-80,zb],[BX,80,zb],6)}</g>`+fist(-1)+fist(1)+stack(1,zb,n));
  o+=act(sleeve(1));
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
    case 'down': { const p=Math.min(1,t/(700*sp)); st.h=1-ease(p); if(p>=1){ st.phase='pause'; st.t0=now; } break; }
    case 'pause': if(t>=160*sp){ st.phase='up'; st.t0=now; st.h0=0; } break;
    case 'up': {
      const failing=st.load>ROBOT_MAX, top=failing?.38:1;
      const p=Math.min(1,t/((failing?1500:450+st.load*7)*sp));
      st.h=st.h0+(top-st.h0)*(failing?1-Math.pow(1-p,2.2):ease(p));
      if(p>=1){
        if(failing){ st.phase='stall'; st.hs=st.h; st.t0=now; }
        else { st.h=1; st.reps++; st.lifted+=st.load; st.phase='idle'; }
      } break; }
    case 'stall': if(t>=300*sp){ st.phase='sink'; st.t0=now; } break;
    case 'sink': { const p=Math.min(1,t/(600*sp)); st.h=st.hs*(1-ease(p)); if(p>=1){ st.h=0; st.fail=true; st.phase='idle'; } break; }
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
