// Run every stepper declared in content.html without a browser.
const fs = require('fs');
global.document = { addEventListener() {} };
const code = ['src/engine.js', 'src/data.js', 'src/app.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n')
  .replace(/^const \$ = /m, 'var $ = ') + '\n;Object.assign(globalThis,{GRAMMARS,DERIVS,NOTES,buildLL1,buildConv,buildDeriv,parseGrammar,examAnswer,nfaSteps,derivSteps});';
eval(code);
const html = fs.readFileSync('src/content.html', 'utf8');
let n = 0, bad = 0;
const attr = (tag, k) => (tag.match(new RegExp(`data-${k}="([^"]*)"`)) || [])[1];
for (const tag of html.match(/<div[^>]*data-(ll1|conv|deriv|notes|answer|tree)[^>]*>/g)) {
  n++;
  try {
    let steps;
    if (attr(tag, 'll1')) { const r = buildLL1(parseGrammar(GRAMMARS[attr(tag, 'g')]), attr(tag, 'll1'), attr(tag, 'input')); steps = r.steps; steps.forEach((s, i) => r.render(s, i)); }
    else if (attr(tag, 'conv')) { const r = buildConv(parseGrammar(GRAMMARS[attr(tag, 'g')]), attr(tag, 'conv')); steps = r.steps; steps.forEach((s, i) => r.render(s, i)); }
    else if (attr(tag, 'deriv')) { const r = buildDeriv(DERIVS[attr(tag, 'deriv')]); steps = r.steps; steps.forEach((s, i) => r.render(s, i)); }
    else if (attr(tag, 'notes')) { steps = NOTES[attr(tag, 'notes')]; if (!steps) throw new Error('missing notes'); }
    else if (/data-answer/.test(tag)) { examAnswer(parseGrammar(GRAMMARS[attr(tag, 'g')]), attr(tag, 'input')); steps = [1]; }
    if (!steps || !steps.length) throw new Error('no steps');
    console.log(`ok  ${String(steps.length).padStart(3)} steps  ${attr(tag, 'title') || tag.slice(0, 60)}`);
  } catch (e) { bad++; console.log('FAIL', tag, e.message); }
}
for (const [k, d] of Object.entries(DERIVS)) { const s = derivSteps(d); const l = s[s.length - 1]; if (d.leafVals) console.log(`  ${k} value: ${l.msg.replace(/<[^>]+>/g, '').slice(0, 70)}`); }
console.log(`\n${n} widgets, ${bad} failures; nfa abab -> ${nfaSteps('abab').pop().ok}, aba -> ${nfaSteps('aba').pop().ok}`);
