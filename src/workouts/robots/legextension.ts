// @ts-nocheck
// Ported from robot-legextension-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "-72 -200 236 318";

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
const R=(x,y,z)=>[.43*x+.9*y, .9*x-.43*y, z];
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
const MINKG=0, MAXKG=80, ROBOT_MAX=60;         // plate-loaded: one stack of 10 kg plates on a holder
const SEAT_Z=44, HIP_Z=60, KNEE_Y=54;          // seat top, hip height, how far the knee is in front of the hip
const PSI_FLEX=-.1, PSI_EXT=1.45;              // shin angle from hanging straight down: knees bent 90° / legs almost straight out
const LEAN=-.1;                                // he sits leaning slightly back into the pad

/* ---------- static scene: the machine frame, seat, back pad, weight stack and the load pads ---------- */
const FRAME =                                                               // a clean base: four legs up to the seat, left tied to right
  `<g class="steel">`+
    box(-34,-34,0,68,8,6,2)+box(-34,26,0,68,8,6,2)+                          // rear and front connectors across the floor
    box(-4,-34,0,8,68,6,2)+                                                  // one rail down the middle, rear connector to front connector
    box(-34,26,0,8,36,6,2)+box(26,26,0,8,36,6,2)+                            // two short outriggers carry the lever's pivot posts
    box(-30,-32,6,8,8,30,2)+box(22,-32,6,8,8,30,2)+box(-30,28,6,8,8,30,2)+box(22,28,6,8,8,30,2)+   // four legs up to the seat
    box(-30,-32,30,60,8,6,2)+box(-30,28,30,60,8,6,2)+                        // left legs tied to right legs, just under the seat
  `</g>`;
const SEAT=`<g class="cushion">${box(-24,-34,SEAT_Z-8,48,72,8,4)}</g>`;
const POST=x=>`<g class="steel">${box(x,KNEE_Y-5,6,8,10,56,1)}</g>`;         // pivot posts for the lever arms

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:40, reps:0, lifted:0, h:0, hs:0, phase:'idle', t0:0, fail:false };   // h: 0 knees bent, 1 legs extended
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,st.load/ROBOT_MAX) : 0;

function faceBack(e){ const eh=7-4.4*e; let o='';
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${19-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 24 L11.5 24 M16.5 24 L23 24 M14 14 L14 10"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${6-2.6*i} L18.5 ${6-2.6*i}"/>`;
  return o; }
function faceSide(e){ const eh=7-4.4*e;
  return `<rect class="eye" x="22" y="${17+(7-eh)/2}" width="5" height="${eh}" rx="1.6"/>`; }

function scene(){
  const h=st.h, e=effort(), n=st.load/10, th=LEAN, {u,b}=axes(th);
  const H=[0,0,HIP_Z], at=l=>add(H,mul(u,l)), Sh=at(62);
  const psi=PSI_FLEX+(PSI_EXT-PSI_FLEX)*h;                                    // shin angle: swings from hanging to straight out
  const dir=[0,Math.sin(psi),-Math.cos(psi)], fw=[0,Math.cos(psi),Math.sin(psi)], nn=[0,-Math.sin(psi),Math.cos(psi)];
  const K=[0,KNEE_Y,HIP_Z-2], A=add(K,mul(dir,52)), padC=add(add(K,mul(dir,38)),mul(fw,16));   // knee, ankle, centre of the shin pad

  const leg=s=>{ const hip=[12*s,0,HIP_Z], kn=[12*s,KNEE_Y,HIP_Z-2], an=add(kn,mul(dir,52));
    const foot=obox(add(add(add(an,[-9,0,0]),mul(fw,-8)),mul(nn,-8)),[EX,fw,nn],[18,36,8],4);
    return `<g class="shoe">${foot}</g>`+cap(kn,an,16)+cap(hip,kn,21)+ball(kn,8)+ball(hip,9)+ball(an,5.5); };
  const arm=s=>{ const sh=[31*s,Sh[1],Sh[2]], hand=[22*s,30,72], el=ik(sh,hand,36,34,[.4*s,-1,-.2]);   // hands rest on his thighs
    return `<g class="fist">${box(hand[0]-6,hand[1]-7,hand[2]-6,12,14,12,4)}</g>`+cap(el,hand,11)+cap(sh,el,14)+ball(el,6)+ball(sh,9); };
  const lever=s=>{ const P=[26*s,KNEE_Y,HIP_Z-2];
    return `<g class="steel">${cap(P,[26*s,padC[1],padC[2]],5)}</g>`+ball(P,5); };
  const shinPad=`<g class="padbar">${cap([-26,padC[1],padC[2]],[26,padC[1],padC[2]],16)}</g>`;

  const parts=[
    act(tbox(H,th,-10,24,46,32,7)),
    act(tbox(H,th,14,26,36,28,6)),
    act(tbox(H,th,38,32,58,34,8)),
    act(cap(at(66),at(76),12)+tbox(add(H,[-15.5,0,0]),th,80,12,3,8,1.5)
        +`<g class="cover">${tbox(H,th,73.2,27.6,25.2,23.6,4)}</g>`
        +tbox(H,th,72,30,28,26,9,faceBack(e),'',dot(R(...b),V)>.12?'':faceSide(e))
        +tbox(add(H,[15.5,0,0]),th,80,12,3,8,1.5),'robot head')
  ];
  if(dot(R(...u),V)<0) parts.reverse();

  const Hp=padC;                                                                // one holder sticks out sideways from the pad lever, right where the shins push
  const holder=`<g class="steel">${cap([26,Hp[1],Hp[2]],[32+4*n,Hp[1],Hp[2]],5)}</g>`;
  const plates=()=>{ let o=''; const c=x=>LP([x,0,0],[0,1,0],[0,0,1]);          // a single stack of plates, loaded on the holder
    for(let i=0;i<n;i++){ const xf=36+4*i;
      o+=`<g transform="${c(xf-4)}"><circle class="face plate" cx="${Hp[1]}" cy="${Hp[2]}" r="18"/></g>`;
      o+=`<g transform="${c(xf)}"><circle class="face plate" cx="${Hp[1]}" cy="${Hp[2]}" r="18"/><circle class="detail" cx="${Hp[1]}" cy="${Hp[2]}" r="12.5"/><circle class="detail" cx="${Hp[1]}" cy="${Hp[2]}" r="3.5"/></g>`; }
    return o; };

  let o=''+FRAME+SEAT+tbox(add(H,mul(b,-21)),th,-14,118,40,10,4).replace(/^/,'<g class="cushion">')+'</g>';
  o+=POST(-34)+act(lever(-1));
  o+=act(leg(-1)+leg(1));
  o+=act(arm(-1));
  o+=parts.join('');
  o+=POST(26)+shinPad+act(lever(1)+holder);
  o+=act(arm(1));
  o+=act(plates());
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
      const failing=st.load>ROBOT_MAX, top=failing?.35:1;
      const p=Math.min(1,t/((failing?1500:700+st.load*8)*sp));
      st.h=top*(failing?1-Math.pow(1-p,2.2):ease(p));
      if(p>=1){ if(failing){ st.phase='stall'; st.hs=st.h; st.t0=now; } else { st.phase='pause'; st.t0=now; } }
      break; }
    case 'pause': if(t>=350*sp){ st.phase='down'; st.t0=now; } break;
    case 'down': { const p=Math.min(1,t/(1100*sp)); st.h=1-ease(p); if(p>=1){ st.h=0; st.reps++; st.lifted+=st.load; st.phase='idle'; } break; }
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
