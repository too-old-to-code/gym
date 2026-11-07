// @ts-nocheck
// Ported from robot-backext-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "-125 -205 270 295";

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
const MINKG=0, MAXKG=50, ROBOT_MAX=30;       // a plate held on the upper back, 10 kg each
const HIP=[0,0,89];                           // the hinge: the top edge of the plank
const PSI_FLEX=.75, PSI_EXT=-.74;             // torso angle below horizontal: bent right over / body in line with the 45° bench
const INCL=Math.PI/4, PAD_N=[0,Math.cos(INCL),-Math.sin(INCL)];   // the bench slopes up toward +y at 45°

/* ---------- static scene: the chair frame and the plate pads ---------- */
const ROD_TOP=add(add(HIP,mul(PAD_N,24)),mul([0,Math.sin(INCL),Math.cos(INCL)],-4));   // under the plank, near the hips
const ROD_FLOOR=add(ROD_TOP,mul([0,Math.sin(INCL),Math.cos(INCL)],-ROD_TOP[2]/Math.cos(INCL)));   // follow the 45° line down to the floor, between his feet
const S_ROD = `<g class="rod">`+cap(ROD_TOP,ROD_FLOOR,6)+`</g>`;                  // a thin steel rod, 45° under the middle of the plank, down to the floor
const S_PLANK = `<g class="cushion">`+tbox(add(HIP,mul(PAD_N,16)),INCL,-52,58,64,10,3)+`</g>`;   // a plank at 45° to hip height

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ load:0, reps:0, lifted:0, h:0, hs:0, phase:'idle', t0:0, fail:false };   // h: 0 bent over, 1 body straight
const effort=()=> st.fail ? 1 : (st.phase==='up'||st.phase==='stall'||st.phase==='sink') ? Math.min(1,.3+st.load/ROBOT_MAX*.7) : 0;

/* The head stays in line with his spine. Its face is on the front (chest side); one eye also shows on the near side. */
function faceBack(e){ const eh=7-4.4*e; let o='';           // drawn on the face of the head that points the way his chest does (coordinates: across, up the spine)
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${19-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 24 L11.5 24 M16.5 24 L23 24 M14 14 L14 10"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${6-2.6*i} L18.5 ${6-2.6*i}"/>`;
  return o; }
function faceSide(e){ const eh=7-4.4*e;                      // coordinates: along the spine, toward his chest
  return `<rect class="eye" x="22" y="${17+(7-eh)/2}" width="5" height="${eh}" rx="1.6"/>`; }

function scene(){
  const h=st.h, e=effort(), n=st.load/10;
  const psi=PSI_FLEX*(1-h)+PSI_EXT*h, th=Math.PI/2+psi, {u,b}=axes(th);    // u runs hip -> head, b is his chest (faces down)
  const H=HIP, at=l=>add(H,mul(u,l)), Sh=at(62), up=mul(b,-1);
  const TW=(x,l,t)=>add(add(add(H,mul(EX,x)),mul(u,l)),mul(b,t));          // a point fixed to his torso: across, up the spine, out of the chest
  const plateT=i=>19.5+5*i;                                                // plates lie flat against his chest, stacking outward

  // His arms are fixed to his torso, so they never move relative to his body during the rep.
  const arm=s=>{ const sh=TW(31*s,62,0), hand=n>0?TW(22*s,54,17+2.5*n):TW(19*s,86,5),   // weight: hugged to the chest; none: hands at his temples
      el=ik(sh,hand,34,32,n>0?mul(u,-1):mul(EX,s));                                     // weighted elbows hang in line with his chest
    const fist=`<g class="fist">${box(hand[0]-6,hand[1]-7,hand[2]-6,12,14,12,4)}</g>`;
    return fist+cap(el,hand,11)+cap(sh,el,14)+ball(el,6)+ball(sh,9); };
  const legPose=s=>{ const hip=[12*s,H[1],H[2]], ank=[12*s,-75,14]; return {hip,ank,knee:ik(hip,ank,54,52,[0,0,1])}; };
  const foot=s=>`<g class="shoe">${box(12*s-9,-83,0,18,38,8,4)}</g>`;
  const legBody=s=>{ const {hip,ank,knee}=legPose(s); return cap(knee,ank,16)+cap(hip,knee,21)+ball(knee,8)+ball(hip,9)+ball(ank,5.5); };
  const plates=()=>{ let o=''; if(Math.abs(dot(R(...b),V))<.03) return o; for(let i=n-1;i>=0;i--){ const c=TW(0,54,plateT(i)), back=add(c,mul(b,4)), p=a=>LP(a,EX,u);   // outermost first: it is farthest from the camera
      o+=`<g transform="${p(back)}"><circle class="face plate" cx="0" cy="0" r="20"/></g>`;
      o+=`<g transform="${p(c)}"><circle class="face plate" cx="0" cy="0" r="20"/><circle class="detail" cx="0" cy="0" r="14"/><circle class="detail" cx="0" cy="0" r="3.5"/></g>`; }
    return o; };

  const parts=[
    act(tbox(H,th,-10,24,46,32,7)),
    act(tbox(H,th,14,26,36,28,6)),
    act(tbox(H,th,38,32,58,34,8)),
    act(tbox(add(H,[-15.5,0,0]),th,80,12,3,8,1.5)
        +`<g class="cover">${tbox(H,th,73.2,27.6,25.2,23.6,4)}</g>`
        +tbox(H,th,72,30,28,26,9,faceBack(e),'',faceSide(e))
        +tbox(add(H,[15.5,0,0]),th,80,12,3,8,1.5),'robot head')
  ];
  if(dot(R(...u),V)<0) parts.reverse();                                          // draw far-to-near along the spine

  let o='';
  o+=act(foot(-1));                                                       // his far foot is behind the rod,
  o+=S_ROD;                                                               // the rod is behind the plank,
  o+=S_PLANK;                                                             // and the plank is behind his legs
  o+=act(legBody(-1)+foot(1)+legBody(1));
  o+=act(arm(-1));
  o+=act(plates());
  o+=parts.join('');
  o+=act(arm(1));
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
      const failing=st.load>ROBOT_MAX, top=failing?.36:1;
      const p=Math.min(1,t/((failing?1600:800+st.load*10)*sp));
      st.h=top*(failing?1-Math.pow(1-p,2.2):ease(p));
      if(p>=1){ if(failing){ st.phase='stall'; st.hs=st.h; st.t0=now; } else { st.phase='pause'; st.t0=now; } }
      break; }
    case 'pause': if(t>=300*sp){ st.phase='down'; st.t0=now; } break;
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
