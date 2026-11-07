// @ts-nocheck
// Ported from robot-nordic-color.html (original untouched): buttons, text and click/keyboard
// input removed; the rep loop is driven by RobotFigure.
export const viewBox = "-122 -200 322 300";

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
const MIN_T=1, MAX_T=6, CONTROL_T=3;          // lowering time in seconds: below CONTROL_T he cannot control the fall
const KNEE=[0,0,16], ANKLE_Y=-52;             // kneeling at the origin, shins flat on a padded plank behind him
const PHI_TOP=.04, PHI_BOTTOM=1.26;           // body angle from vertical: tall on his knees / almost flat

/* ---------- static scene: the ankle anchor and the tempo pads ---------- */
const S_PLANK=`<g class="cushion">${box(-26,-64,0,52,174,8,4)}</g>`;             // a padded plank under his knees, shins and feet...
const S_POST=x=>`<g class="steel">${box(x,-56,0,8,12,42,1)}</g>`;               // ...bolted to the posts at its ankle end
const S_ROLLER=`<g class="cushion">${box(-28,-60,26,56,20,12,5)}</g>`;          // a padded roller holds his ankles down

/* ---------- the robot (rebuilt every frame from state) ---------- */
const st={ tempo:4, reps:0, f:0, f0:0, phase:'idle', t0:0, T:0, fail:false };     // f: 0 tall on his knees, 1 almost flat
const smooth=x=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const effort=()=> st.fail ? 1 : (st.phase==='down' ? Math.min(1,.2+st.f*.8) : 0);

function faceBack(e){ const eh=7-4.4*e; let o='';                   // the face, on the side his chest faces (across, up the spine)
  [8,20].forEach(c=>{ o+=`<rect class="eye" x="${c-2.5}" y="${19-eh/2}" width="5" height="${eh}" rx="1.6"/>`; });
  o+=`<path class="detail" d="M5 24 L11.5 24 M16.5 24 L23 24 M14 14 L14 10"/>`;
  for(let i=0;i<3;i++) o+=`<path class="detail" d="M9.5 ${6-2.6*i} L18.5 ${6-2.6*i}"/>`;
  return o; }
function faceSide(e){ const eh=7-4.4*e;                              // one eye on the near side, for when the face points at the floor
  return `<rect class="eye" x="22" y="${17+(7-eh)/2}" width="5" height="${eh}" rx="1.6"/>`; }

function scene(){
  const f=st.f, e=effort(), phi=PHI_TOP+(PHI_BOTTOM-PHI_TOP)*f, th=phi, {u,b}=axes(th);
  const H=add(KNEE,mul(u,54)), at=l=>add(H,mul(u,l)), Sh=at(62);          // thigh, hips and spine are one straight line, hinged at the knees
  const TW=(x,l,t)=>add(add(add(H,mul(EX,x)),mul(u,l)),mul(b,t));          // a point fixed to his torso
  const arm=s=>{ const sh=[31*s,Sh[1],Sh[2]], hand=add(add(sh,mul(u,-70)),[3*s,0,0]), el=mul(add(sh,hand),.5);   // straight at his sides, in line with his body
    return `<g class="fist">${box(hand[0]-6,hand[1]-7,hand[2]-6,12,14,12,4)}</g>`+cap(sh,hand,13)+ball(el,6)+ball(sh,9); };
  const foot=ank=>{ const al=.35, f=[0,-Math.cos(al),-Math.sin(al)], n=[0,-Math.sin(al),Math.cos(al)];   // toes hang over the end of the plank and angle down
    return obox(add(add(add(ank,[-9,0,0]),mul(f,-4)),mul(n,-8)),[EX,f,n],[18,34,8],4); };
  const leg=s=>{ const knee=[12*s,0,KNEE[2]], hip=[12*s,H[1],H[2]], ank=[12*s,ANKLE_Y,KNEE[2]];
    return `<g class="shoe">${foot(ank)}</g>`+cap(knee,ank,16)+cap(hip,knee,21)+ball(knee,8)+ball(hip,9)+ball(ank,5.5); };

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

  let o=''+S_PLANK;
  o+=S_POST(-34);
  o+=act(leg(-1)+leg(1));
  o+=S_ROLLER+S_POST(26);
  o+=act(arm(-1));
  o+=parts.join('');
  o+=act(arm(1));
  return o;
}

function rep(){
  if(st.phase!=='idle') return;
  const controlled=st.tempo>=CONTROL_T;
  st.fail=!controlled; st.T=controlled?st.tempo*1000:450+st.tempo*120;       // too fast and he can't hold it: he drops
  st.t0=performance.now(); st.phase='down'; 
}
function step(now){
  const t=now-st.t0;
  switch(st.phase){
    case 'down': { const p=Math.min(1,t/(st.T*sp)); st.f=st.fail?Math.pow(p,2.4):Math.pow(p,1.7); if(p>=1){ st.f=1; st.phase='pause'; st.t0=now; } break; }
    case 'pause': if(t>=(st.fail?500:300)*sp){ st.phase='up'; st.t0=now; } break;
    case 'up': { const p=Math.min(1,t/(1300*sp)); st.f=1-ease(p); if(p>=1){ st.f=0; st.reps++; st.phase='idle'; } break; }
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
