// @ts-nocheck
// Ported from robot-hipthrust-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "0 0 300 290";

export function createRobot({ reducedMotion = false, load }: { reducedMotion?: boolean; load?: number } = {}) {
const sp = reducedMotion ? 0.02 : 1;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
/* ---------- kernel ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6), OX = 177, OY = 167;
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
  const {u,b}=axes(th), V=[1,1,1];
  const Q=add(add(add(base,mul(u,l0)),mul(EX,-w/2)),mul(b,-T/2));
  const ax=[{n:EX,s:w,c:'face side'},{n:u,s:L,c:'face'},{n:b,s:T,c:'face'}];
  let o='';
  [0,1,2].forEach(i=>{
    const sg=dot(ax[i].n,V)>=0?1:-1, nrm=mul(ax[i].n,sg);
    const [j,k]=[0,1,2].filter(x=>x!==i);
    const origin=add(Q,sg>0?mul(ax[i].n,ax[i].s):[0,0,0]);
    const cls=nrm[2]>.55?'face top':ax[i].c;
    const pl=i===2?plane(origin,EX,u):plane(origin,ax[j].n,ax[k].n);
    o+=i===2?rect(pl,w,L,r,cls)+(sg>0&&fd?`<g transform="${pl}">${fd}</g>`:'')
            :rect(pl,ax[j].s,ax[k].s,r,cls);
  });
  return o;
}

/* ---------- constants ---------- */
const MINKG=20, MAXKG=220, ROBOT_MAX=180;     // bar 20 kg, 20 kg plates, one per side per step
const SHOULDER=[0,-38,61];                    // upper back on the bench edge: the fixed pivot of the torso
const ANKLE_Y=78, ANKLE_Z=14;                 // feet flat on the floor

/* ---------- static scene: bench and plate pads ---------- */
const S_BENCH =
  `<g class="steel">`+box(-40,-58,0,8,8,32,1)+box(-40,-26,0,8,8,32,1)+box(32,-58,0,8,8,32,1)+box(32,-26,0,8,8,32,1)+`</g>`+
  `<g class="cushion">`+box(-45,-62,32,90,44,12,6)+`</g>`;

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:100, reps:0, lifted:0, h:0, hs:0, phase:'idle', t0:0, fail:false };   // h: 0 hips down, 1 hips locked out
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,st.load/ROBOT_MAX) : 0;

function stack(s,yb,zb,n){
  let o=''; const idx=[...Array(n).keys()], cx=-yb, cy=-zb;
  (s<0?idx.slice().reverse():idx).forEach(i=>{
    const xf = s<0 ? -(60+4*i) : (64+4*i);
    o+=`<g transform="${SIDE(xf-4,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="24"/></g>`;
    o+=`<g transform="${SIDE(xf,0,0)}"><circle class="face plate" cx="${cx}" cy="${cy}" r="24"/>
        <circle class="detail" cx="${cx}" cy="${cy}" r="17"/><circle class="detail" cx="${cx}" cy="${cy}" r="4.5"/></g>`;
  });
  return o;
}
function faceTop(x0,y0,z0,e){              // lying back: the face looks up from the head's top face, forehead toward the bench
  const eh=7-4.4*e;
  let o=`<g transform="${TOP(x0,y0,z0)}">`;
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${5+(7-eh)/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 2.5 L11.5 2.5 M16.5 2.5 L23 2.5 M14 12 L14 16"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${19+2.6*i} L18.5 ${19+2.6*i}"/>`;
  return o+`</g>`;
}

function scene(){
  const h=st.h, e=effort(), n=(st.load-MINKG)/40;
  const phi=.47*(1-h), th=phi-Math.PI/2, {u,b}=axes(th);          // torso swings from the shoulders: flat at lockout
  const S=SHOULDER, H=sub(S,mul(u,62)), at=l=>add(H,mul(u,l));
  const bar=add(H,mul(b,19)), yb=bar[1], zb=bar[2];                 // bar sits in the crease of the hips
  const hb=at(80);                                                  // head centre, resting on the bench

  const arm=s=>{ const sh=[31*s,S[1],S[2]], hand=[52*s,yb,zb], el=ik(sh,hand,34,32,[.6*s,0,-1]);
    return cap(sh,el,14)+cap(el,hand,11)+ball(el,6)+ball(sh,9); };
  const fist=s=>`<g class="fist">${box(52*s-6,yb-7,zb-6,12,14,12,4)}</g>`;
  const leg=s=>{ const hip=[14*s,H[1],H[2]], ank=[14*s,ANKLE_Y,ANKLE_Z], knee=ik(hip,ank,54,52,[0,.15,1]);
    return `<g class="shoe">${box(14*s-9,ank[1]-9,0,18,40,8,4)}</g>`+cap(knee,ank,16)+cap(hip,knee,21)+ball(knee,8)+ball(hip,9)+ball(ank,5.5); };
  const bars=(a,c)=>`<g class="bar">${cap([a,yb,zb],[c,yb,zb],6)}</g>`;

  let o=S_BENCH+'';
  o+=act(bars(-110,-54)+stack(-1,yb,zb,n));
  o+=act(arm(-1));
  o+=act(cap(at(66),[0,hb[1],hb[2]],12));
  o+=`<g class="cover">${box(-12.6,hb[1]-11.6,hb[2]-13.8,25.2,23.2,27.6,4)}</g>`;
  o+=act(box(-17,hb[1]-3,hb[2]-6,3,8,12,1.5)+box(-14,hb[1]-13,hb[2]-15,28,26,30,9)+box(14,hb[1]-3,hb[2]-6,3,8,12,1.5)
        +faceTop(-14,hb[1]-13,hb[2]+15,e),'robot head');
  o+=act(tbox(H,th,38,32,58,34,8,`<rect class="detail" x="4" y="9" width="22" height="18" rx="7"/><rect class="detail" x="32" y="9" width="22" height="18" rx="7"/><path class="detail" d="M29 6 L29 30"/>`)
        +tbox(H,th,14,26,36,28,6,`<path class="detail" d="M5 9 L31 9 M5 17 L31 17"/>`)
        +tbox(H,th,-10,24,46,32,7));
  o+=act(arm(1));
  o+=act(leg(-1)+leg(1));                                   // legs sit in front of the torso
  o+=act(bars(-62,62)+`<g class="padbar">${cap([-13,yb,zb],[13,yb,zb],15)}</g>`+fist(-1)+fist(1)+stack(1,yb,zb,n)+bars(64+4*n,110));   // the bar is drawn last: it sits in front of everything
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
      const failing=st.load>ROBOT_MAX, top=failing?.32:1;
      const p=Math.min(1,t/((failing?1600:650+st.load*4)*sp));
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
