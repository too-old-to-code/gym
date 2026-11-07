const out=[];const run=()=>{rep();let t=st.t0;let g=0;while(st.phase!=="idle"&&g++<5000){t+=16;step(t);} scene();return readout()+" h="+st.h.toFixed(2);};
st.load=120;out.push(run());out.push(run());setLoad(-20);out.push(run());document.title=out.join(" || ");
