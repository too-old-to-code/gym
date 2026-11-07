// @ts-nocheck
// Ported from robot-deadlift-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "-118 -250 210 322";

export function createRobot({ reducedMotion = false, load }: { reducedMotion?: boolean; load?: number } = {}) {
const sp = reducedMotion ? 0.02 : 1;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
/* ---------- kernel ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 0, OY = 0;
const P = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];
const D = (x,y,z) => [(x-y)*C, (x+y)*S - z];
const plane = (O,U,V) => { const o=P(...O), u=D(...U), v=D(...V);
  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`; };
const TOP   = (x,y,z) => plane([x,y,z],[1,0,0],[0,1,0]);
const SIDE  = (x,y,z) => plane([x,y,z],[0,-1,0],[0,0,-1]);
const rect = (t,w,h,r=0,cls='face') =>
  `<g transform="${t}"><rect class="${cls}" width="${w}" height="${h}" rx="${r}"/></g>`;
const wbox = (x,y,z,w,d,h,r=0) =>                      // axis-aligned world box (the floor pads)
  rect(SIDE(x+w,y+d,z+h), d,h,Math.min(r,h/4),'face side') +
  rect(plane([x,y+d,z+h],[1,0,0],[0,0,-1]), w,h,Math.min(r,h/4)) +
  rect(TOP(x,y,z+h), w,d,r,'face top');

/* ---------- local frame ----------
   The robot, plank and everything on them are modelled in a local frame: y runs along his spine (feet -> head),
   x runs across his body, z is up. R turns that frame about the vertical so he is seen side-on: head to the right,
   feet to the left, and the plank's slope faces the camera. */
const V=[1,1,1];
const R=(x,y,z)=>[x,y,z];   // no yaw: he is seen from the front-left, bar across the screen
const LP=(O,U,W)=>plane(R(...O),R(...U),R(...W));              // a plane given in local coordinates
const PL=a=>P(...R(...a));                                     // a local point on screen

/* ---------- vectors, limbs, oriented boxes ---------- */
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
const cap=(a,b,w)=>{ const p=PL(a), q=PL(b);
  const l=(c,sw)=>`<line class="${c}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke-width="${sw}"/>`;
  return l('lo',w+2.4)+l('lf',w); };
const ball=(c,r)=>{ const p=PL(c);
  return `<circle class="face joint" cx="${p[0]}" cy="${p[1]}" r="${r}"/><circle class="detail" cx="${p[0]}" cy="${p[1]}" r="${r*.4}"/>`; };
const act=(s,c='robot')=>`<g class="act ${c}" data-act="rep">${s}</g>`;

const EX=[1,0,0];
const axes=th=>({ u:[0,Math.sin(th),Math.cos(th)], b:[0,Math.cos(th),-Math.sin(th)] });
/* A box with any orientation: O is its minimum corner, ax the three local axes, sz the sizes along them.
   Only faces that point toward the camera are drawn; `det` puts line detail on the faces of axis det.i. */
function obox(O,ax,sz,r=0,det=null){
  let o='';
  for(let i=0;i<3;i++){
    const wn=R(...ax[i]), d=dot(wn,V);
    if(Math.abs(d)<.02) continue;                                     // edge-on: invisible, and would collapse to a stray line
    const sg=d>0?1:-1, nrm=mul(wn,sg), [j,k]=[0,1,2].filter(x=>x!==i);
    const origin=add(O,sg>0?mul(ax[i],sz[i]):[0,0,0]), pl=LP(origin,ax[j],ax[k]);
    const cls=nrm[2]>.55?'face top':(nrm[0]>nrm[1]?'face side':'face');
    o+=rect(pl,sz[j],sz[k],Math.min(r,sz[j]/3,sz[k]/3),cls);
    (det||[]).filter(q=>q.i===i).forEach(q=>{ const dd=sg>0?q.fd:q.bd; if(dd) o+=`<g transform="${pl}">${dd}</g>`; });
  }
  return o;
}
const AXW=[[1,0,0],[0,1,0],[0,0,1]];
const box=(x,y,z,w,d,h,r=0)=>obox([x,y,z],AXW,[w,d,h],r);
function tbox(base,th,l0,L,w,T,r,fd='',bd='',sd=''){                    // box tilted about the x axis (spine at angle th)
  const {u,b}=axes(th);
  const Q=add(add(add(base,mul(u,l0)),mul(EX,-w/2)),mul(b,-T/2));
  return obox(Q,[EX,u,b],[w,L,T],r,[{i:2,fd,bd},{i:0,fd:sd,bd:''}]);
}

/* ---------- constants ---------- */
const MINKG=20, MAXKG=220, ROBOT_MAX=180;     // bar 20 kg, plates 20 kg each, one per side per step
const BAR_Y=15;                               // the bar travels straight up his shins and thighs
const LEAN_BOTTOM=.8, LEAN_TOP=.06;           // spine angle from vertical: hinged over the bar / standing tall
const ARM=88, R_PLATE=32, GRIP=44;           // GRIP: hands almost at the plates                     // straight arms, long enough to reach the bar from an upright-ish start

/* ---------- static scene: the plate pads ---------- */

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:100, reps:0, lifted:0, h:0, hs:0, phase:'idle', t0:0, fail:false };   // h: 0 bar on the floor, 1 lockout
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,st.load/ROBOT_MAX) : 0;

function stack(s,yb,zb,n){                     // plates in x=const planes (SIDE), outermost drawn first on the far side
  let o=''; const idx=[...Array(n).keys()], cx=-yb, cy=-zb;
  (s<0?idx.slice().reverse():idx).forEach(i=>{
    const xf = s<0 ? -(52+4*i) : (56+4*i);
    o+=`<g transform="${SIDE(xf-4,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="${R_PLATE}"/></g>`;
    o+=`<g transform="${SIDE(xf,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="${R_PLATE}"/>
        <circle class="detail" cx="${cx}" cy="${cy}" r="${R_PLATE*.7}"/><circle class="detail" cx="${cx}" cy="${cy}" r="5"/></g>`;
  });
  return o;
}
/* The head stays in line with his spine. Face on the chest-facing side; one eye also shows on the near side. */
function faceBack(e){ const eh=7-4.4*e; let o='';
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${19-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 24 L11.5 24 M16.5 24 L23 24 M14 14 L14 10"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${6-2.6*i} L18.5 ${6-2.6*i}"/>`;
  return o; }
function faceSide(e){ const eh=7-4.4*e;
  return `<rect class="eye" x="22" y="${17+(7-eh)/2}" width="5" height="${eh}" rx="1.6"/>`; }

function scene(){
  const h=st.h, e=effort(), n=(st.load-MINKG)/40;
  const th=LEAN_BOTTOM*(1-h)+LEAN_TOP*h, {u,b}=axes(th);                    // th: lean from vertical
  const H=[0,-29.5+27.5*h,76.8+41.2*h], at=l=>add(H,mul(u,l)), Sh=at(62);  // hips start back and moderately low, then drive forward and up
  const yb=BAR_Y, zb=Sh[2]-Math.sqrt(ARM*ARM-(yb-Sh[1])**2-(GRIP-31)**2);               // his arms stay straight: the bar sits one arm-length below the shoulders

  const arm=s=>{ const sh=[31*s,Sh[1],Sh[2]], hand=[GRIP*s,yb,zb], el=add(mul(add(sh,hand),.5),[0,0,0]);
    return cap(sh,hand,13)+ball(el,6)+ball(sh,9); };
  const fist=s=>`<g class="fist">${box(GRIP*s-6,yb-7,zb-6,12,14,12,4)}</g>`;
  const leg=s=>{ const hip=[14*s,H[1],H[2]], ank=[14*s,0,14], knee=ik(hip,ank,54,52,[0,1,.1]);
    return `<g class="shoe">${box(14*s-9,-9,0,18,40,8,4)}</g>`+cap(knee,ank,16)+cap(hip,knee,21)+ball(knee,8)+ball(hip,9)+ball(ank,5.5); };
  const hc=add(at(88),[0,0,0]);                                             // he looks straight ahead: the head stays upright while the spine tilts
  const bars=(a,c)=>`<g class="bar">${cap([a,yb,zb],[c,yb,zb],6)}</g>`;

  const parts=[
    act(tbox(H,th,-10,24,46,32,7)),
    act(tbox(H,th,14,26,36,28,6)),
    act(tbox(H,th,38,32,58,34,8)),
    act(cap(at(66),[0,hc[1],hc[2]-12],12)
        +box(-17,hc[1]-3,hc[2]-6,3,8,12,1.5)
        +`<g class="cover">${box(-12.6,hc[1]-11.6,hc[2]-13.8,25.2,23.2,27.6,4)}</g>`
        +obox([-14,hc[1]-13,hc[2]-15],AXW,[28,26,30],9,[{i:1,fd:faceBack(e),bd:''}])
        +box(14,hc[1]-3,hc[2]-6,3,8,12,1.5),'robot head')
  ];
  if(dot(R(...u),V)<0) parts.reverse();

  let o='';
  o+=act(bars(-100,-50)+stack(-1,yb,zb,n));
  o+=act(arm(-1));                                                        // his right arm is behind his right knee
  o+=act(leg(-1)+leg(1));
  o+=parts.join('');
  o+=act(arm(1));
  o+=act(bars(-52,52)+fist(-1)+fist(1)+stack(1,yb,zb,n)+bars(56+4*n,100));   // the bar is in front of his shins and thighs
  return o;
}

function rep(){
  if(st.phase!=='idle') return;
  st.fail=false; st.t0=performance.now(); st.phase='up'; 
}
function step(now){
  const t=now-st.t0;
  switch(st.phase){
    case 'up': {
      const failing=st.load>ROBOT_MAX, top=failing?.25:1;
      const p=Math.min(1,t/((failing?1700:700+st.load*6)*sp));
      st.h=top*(failing?1-Math.pow(1-p,2.2):ease(p));
      if(p>=1){ if(failing){ st.phase='stall'; st.hs=st.h; st.t0=now; } else { st.phase='pause'; st.t0=now; } }
      break; }
    case 'pause': if(t>=350*sp){ st.phase='down'; st.t0=now; } break;
    case 'down': { const p=Math.min(1,t/(1000*sp)); st.h=1-ease(p); if(p>=1){ st.h=0; st.reps++; st.lifted+=st.load; st.phase='idle'; } break; }
    case 'stall': if(t>=300*sp){ st.phase='sink'; st.t0=now; } break;
    case 'sink': { const p=Math.min(1,t/(800*sp)); st.h=st.hs*(1-ease(p)); if(p>=1){ st.h=0; st.fail=true; st.phase='idle'; } break; }
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
