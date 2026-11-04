const E = require('../src/engine.js');
const strip = s => s.replace(/<[^>]+>/g, '');
const G = {
 notes: `E -> T E'\nE' -> + T E' | ε\nT -> M T'\nT' -> * M T' | ε\nM -> id | ( E )`,
 quiz2: `D -> T L ;\nT -> int | char\nL -> id L'\nL' -> , id L' | ε`,
 mid23: `E -> c U V W | X Y E\nU -> c | ε\nV -> d U | ε\nW -> e | ε\nX -> e | ( Y )\nY -> g | ε`,
 conflict: `S -> a S | B\nB -> a b B | ε`,
 ppq2: `S -> a B D h\nB -> c C\nC -> b C | ε\nD -> E F\nE -> g | ε\nF -> f | ε`,
};
for (const [k, t] of Object.entries(G)) {
  const g = E.parseGrammar(t);
  const fs = E.firstSteps(g), last = fs[fs.length - 1].sets;
  const fo = E.followSteps(g), lastF = fo[fo.length - 1].sets;
  const real = E.computeFollow(g, E.computeFirst(g));
  const ok = g.order.every(A => [...real[A]].sort().join() === [...lastF[A]].sort().join());
  console.log(`== ${k}: first steps ${fs.length}, follow steps ${fo.length}, follow matches fixed point: ${ok}`);
  g.order.forEach(A => console.log(`  ${A}: FIRST {${last[A].join(',')}}  FOLLOW {${lastF[A].join(',')}}`));
  const ts = E.tableSteps(g); console.log('  table:', strip(ts[ts.length - 1].msg), `(${ts.length} steps)`);
}
const inputs = [['notes', '( id + id ) * id'], ['quiz2', 'int id , id ;'], ['mid23', '( ) g c c d c e'], ['ppq2', 'a c b b g h']];
for (const [k, s] of inputs) { const r = E.parseSteps(E.parseGrammar(G[k]), s); console.log(`parse ${k} '${s}': ${r.ok ? 'ACCEPT' : 'REJECT'} ${r.steps.length} steps`); }
const bad = E.parseSteps(E.parseGrammar(`S -> A B\nA -> a A | ε\nB -> b B | c`), 'a c d b');
console.log('acdb:', strip(bad.steps[bad.steps.length - 1].msg));
const show = (st) => { const l = st[st.length - 1]; return l.order.map(A => `  ${A} -> ${l.R[A].map(E.fmt).join(' | ')}`).join('\n'); };
console.log('LF quiz01 Q2\n' + show(E.leftFactorSteps(E.parseGrammar(`S -> a b c A | a b c B | a b | a b d\nA -> e A | e g f\nB -> g f`))));
console.log('LF mid23 quiz\n' + show(E.leftFactorSteps(E.parseGrammar(`S -> b a c d S | b a c P | b a Q | b a\nP -> c P | c\nQ -> a Q | a`))));
console.log('LR quiz01 Q3\n' + show(E.leftRecSteps(E.parseGrammar(`A -> A a | B c | d\nB -> A e | C g h | g f\nC -> C a b | A c e | c d`))));
console.log('LR assignment Q5(i)\n' + show(E.leftRecSteps(E.parseGrammar(`A -> B x | A y | z\nB -> A c | d`))));
console.log('LR assignment Q5(ii)\n' + show(E.leftRecSteps(E.parseGrammar(`S -> S ? T | S # | T\nT -> T ~ Q | T ~ M | Q H\nQ -> q\nM -> m`))));
const lr = E.firstSteps(E.parseGrammar(`E -> E + T | T\nT -> id`)); console.log('LR guard:', strip(lr[0].msg).slice(0, 60));
