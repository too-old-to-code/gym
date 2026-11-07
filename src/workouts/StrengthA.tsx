import type { CSSProperties } from "react";
import "./StrengthA.css";

export function StrengthA() {
  return (
    <main className="gd-root">
        <section className="gd-left" aria-label="Warm-up and session">
          <header className="gd-head">
            <p className="gd-label">Day 1 · Strength</p>
            <h1 className="gd-title">Strength A</h1>
            <p className="gd-lede">Five lifts, top to bottom. Finish all sets of one before the next.</p>
          </header>

          <div className="gd-card gd-warm">
            <h2 className="gd-label">Warm-up</h2>
            <div className="gd-clock">
              <span className="gd-clock-num">10</span>
              <span className="gd-clock-unit">min</span>
            </div>
            <p className="gd-warm-title">Easy row or bike</p>
            <p className="gd-warm-sub">then hip openers</p>
          </div>

          <div className="gd-notes">
            <div className="gd-card gd-note">
              <h2 className="gd-label">Session cap</h2>
              <p className="gd-stat">100 min</p>
              <p className="gd-stat-note">including warm-up</p>
            </div>
            <div className="gd-card gd-note">
              <h2 className="gd-label">Left hip</h2>
              <p className="gd-hip">Set the squat box where the hip is happy</p>
            </div>
          </div>
        </section>

        <section className="gd-card gd-sq" aria-label="Strength A exercises, in order">
          <article className="gd-row" style={{ "--c": "#67E8F9" } as CSSProperties}>
            <div className="gd-num">1</div>
            <svg className="gd-fig" viewBox="0 0 240 130" role="img" aria-label="Squat to box movement diagram">
              <line x1="8" y1="120" x2="232" y2="120" stroke="#64748B" strokeWidth="4" strokeLinecap="round"/>
              <rect x="18" y="92" width="34" height="28" rx="3" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <g opacity="0.62" fill="none" stroke="#67E8F9" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10">
                <line x1="180" y1="78" x2="182" y2="98"/>
                <line x1="182" y1="98" x2="182" y2="118"/>
                <line x1="180" y1="78" x2="180" y2="40"/>
                <line x1="180" y1="40" x2="172" y2="44"/>
                <circle cx="180" cy="26" r="9" fill="none"/>
              </g>
              <circle cx="176" cy="38" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5" opacity="0.6"/>
              <g fill="none" stroke="#67E8F9" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="52" y1="86" x2="88" y2="90"/>
                <line x1="88" y1="90" x2="86" y2="118"/>
                <line x1="52" y1="86" x2="68" y2="50"/>
                <line x1="68" y1="50" x2="62" y2="50"/>
                <circle cx="74" cy="37" r="9" fill="#67E8F9"/>
              </g>
              <circle cx="62" cy="46" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5"/>
              <defs>
                <marker id="a0" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#F1F5F9"/>
                </marker>
              </defs>
              <path d="M128 46 L128 96" fill="none" stroke="#F1F5F9" strokeWidth="3.5" markerStart="url(#a0)" markerEnd="url(#a0)"/>
            </svg>
            <div className="gd-meta">
              <h3 className="gd-name">Squat to box</h3>
              <p className="gd-kit">Barbell · box at a hip-happy height</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>3</span><span className="gd-times">×</span><span>8</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>

          <article className="gd-row" style={{ "--c": "#5EEAD4" } as CSSProperties}>
            <div className="gd-num">2</div>
            <svg className="gd-fig" viewBox="0 0 240 130" role="img" aria-label="Bench press movement diagram">
              <line x1="8" y1="120" x2="232" y2="120" stroke="#64748B" strokeWidth="4" strokeLinecap="round"/>
              <line x1="28" y1="84" x2="150" y2="84" fill="none" stroke="#CBD5E1" strokeWidth="8" strokeLinecap="round"/>
              <line x1="40" y1="86" x2="40" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="140" y1="86" x2="140" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <g opacity="0.62" fill="none" stroke="#5EEAD4" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10">
                <line x1="62" y1="74" x2="50" y2="64"/>
                <line x1="50" y1="64" x2="64" y2="58"/>
                <circle cx="40" cy="70" r="9" fill="none"/>
              </g>
              <circle cx="64" cy="56" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5" opacity="0.6"/>
              <g fill="none" stroke="#5EEAD4" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="56" y1="74" x2="130" y2="76"/>
                <line x1="130" y1="76" x2="162" y2="66"/>
                <line x1="162" y1="66" x2="170" y2="118"/>
                <line x1="62" y1="74" x2="64" y2="26"/>
                <circle cx="40" cy="70" r="9" fill="#5EEAD4"/>
              </g>
              <circle cx="64" cy="22" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5"/>
              <defs>
                <marker id="a1" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#F1F5F9"/>
                </marker>
              </defs>
              <path d="M96 58 L96 26" fill="none" stroke="#F1F5F9" strokeWidth="3.5" markerStart="url(#a1)" markerEnd="url(#a1)"/>
            </svg>
            <div className="gd-meta">
              <h3 className="gd-name">Bench press</h3>
              <p className="gd-kit">Barbell · flat bench</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>3</span><span className="gd-times">×</span><span>8</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>

          <article className="gd-row" style={{ "--c": "#C4B5FD" } as CSSProperties}>
            <div className="gd-num">3</div>
            <svg className="gd-fig" viewBox="0 0 240 130" role="img" aria-label="Pull-ups movement diagram">
              <line x1="40" y1="24" x2="220" y2="24" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round"/>
              <line x1="40" y1="24" x2="40" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="220" y1="24" x2="220" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <g opacity="0.62" fill="none" stroke="#C4B5FD" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10">
                <line x1="70" y1="24" x2="72" y2="56"/>
                <line x1="90" y1="24" x2="88" y2="56"/>
                <line x1="72" y1="56" x2="88" y2="56"/>
                <line x1="80" y1="56" x2="80" y2="92"/>
                <line x1="80" y1="92" x2="76" y2="118"/>
                <line x1="80" y1="92" x2="84" y2="118"/>
                <circle cx="80" cy="45" r="9" fill="none"/>
              </g>
              <g fill="none" stroke="#C4B5FD" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="168" y1="24" x2="158" y2="42"/>
                <line x1="158" y1="42" x2="170" y2="38"/>
                <line x1="192" y1="24" x2="202" y2="42"/>
                <line x1="202" y1="42" x2="190" y2="38"/>
                <line x1="170" y1="38" x2="190" y2="38"/>
                <line x1="180" y1="38" x2="180" y2="74"/>
                <line x1="180" y1="74" x2="176" y2="104"/>
                <line x1="180" y1="74" x2="184" y2="104"/>
                <circle cx="180" cy="14" r="9" fill="#C4B5FD"/>
              </g>
              <defs>
                <marker id="a2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#F1F5F9"/>
                </marker>
              </defs>
              <path d="M128 96 L128 44" fill="none" stroke="#F1F5F9" strokeWidth="3.5" markerStart="url(#a2)" markerEnd="url(#a2)"/>
            </svg>
            <div className="gd-meta">
              <h3 className="gd-name">Pull-ups</h3>
              <p className="gd-kit">Bodyweight</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>3</span><span className="gd-times">×</span><span>10</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>

          <article className="gd-row" style={{ "--c": "#FCD34D" } as CSSProperties}>
            <div className="gd-num">4</div>
            <svg className="gd-fig" viewBox="0 0 240 130" role="img" aria-label="Hip thrusts movement diagram">
              <line x1="8" y1="120" x2="232" y2="120" stroke="#64748B" strokeWidth="4" strokeLinecap="round"/>
              <rect x="14" y="66" width="44" height="14" rx="3" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="22" y1="80" x2="22" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="50" y1="80" x2="50" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <g opacity="0.62" fill="none" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10">
                <line x1="58" y1="66" x2="100" y2="104"/>
                <line x1="100" y1="104" x2="140" y2="84"/>
                <line x1="140" y1="84" x2="150" y2="118"/>
                <circle cx="46" cy="58" r="9" fill="none"/>
              </g>
              <circle cx="100" cy="95" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5" opacity="0.6"/>
              <g fill="none" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="58" y1="64" x2="106" y2="66"/>
                <line x1="106" y1="66" x2="146" y2="70"/>
                <line x1="146" y1="70" x2="152" y2="118"/>
                <line x1="58" y1="64" x2="46" y2="58"/>
                <circle cx="44" cy="56" r="9" fill="#FCD34D"/>
              </g>
              <circle cx="106" cy="57" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5"/>
              <defs>
                <marker id="a3" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#F1F5F9"/>
                </marker>
              </defs>
              <path d="M196 104 L196 62" fill="none" stroke="#F1F5F9" strokeWidth="3.5" markerStart="url(#a3)" markerEnd="url(#a3)"/>
            </svg>
            <div className="gd-meta">
              <h3 className="gd-name">Hip thrusts</h3>
              <p className="gd-kit">Barbell · bench</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>3</span><span className="gd-times">×</span><span>8</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>

          <article className="gd-row" style={{ "--c": "#93C5FD" } as CSSProperties}>
            <div className="gd-num">5</div>
            <svg className="gd-fig" viewBox="0 0 240 130" role="img" aria-label="Back extensions movement diagram">
              <line x1="8" y1="120" x2="232" y2="120" stroke="#64748B" strokeWidth="4" strokeLinecap="round"/>
              <line x1="98" y1="58" x2="122" y2="70" fill="none" stroke="#CBD5E1" strokeWidth="10" strokeLinecap="round"/>
              <line x1="112" y1="68" x2="116" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="184" cy="100" r="6" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="184" y1="106" x2="184" y2="120" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <line x1="116" y1="114" x2="184" y2="114" fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round"/>
              <g opacity="0.62" fill="none" stroke="#93C5FD" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10">
                <line x1="110" y1="62" x2="102" y2="102"/>
                <circle cx="100" cy="114" r="9" fill="none"/>
              </g>
              <circle cx="104" cy="92" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5" opacity="0.6"/>
              <g fill="none" stroke="#93C5FD" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="110" y1="62" x2="180" y2="96"/>
                <line x1="110" y1="62" x2="54" y2="35"/>
                <circle cx="42" cy="29" r="9" fill="#93C5FD"/>
              </g>
              <circle cx="64" cy="40" r="9" fill="none" stroke="#F1F5F9" strokeWidth="5"/>
              <defs>
                <marker id="a4" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#F1F5F9"/>
                </marker>
              </defs>
              <path d="M86 104 Q 54 90 52 60" fill="none" stroke="#F1F5F9" strokeWidth="3.5" markerStart="url(#a4)" markerEnd="url(#a4)"/>
            </svg>
            <div className="gd-meta">
              <h3 className="gd-name">Back extensions</h3>
              <p className="gd-kit">Weighted · Roman chair</p>
            </div>
            <div className="gd-rx">
              <div className="gd-score"><span>3</span><span className="gd-times">×</span><span>8</span></div>
              <div className="gd-rx-label">SETS × REPS</div>
            </div>
          </article>
        </section>

    </main>
  );
}
