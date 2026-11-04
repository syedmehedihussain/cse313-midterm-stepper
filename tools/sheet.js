/* Answer-sheet renderer: turns grammars into the exam layout (tables, horizontal stack, trees).
   Every LL(1) and conversion answer is computed by src/engine.js, never typed by hand. */
const E = require('../src/engine.js');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const set = s => '{ ' + [...s].join(', ') + ' }';
const G = text => E.parseGrammar(text);
const rhsTxt = rhs => rhs.length ? (rhs.some(s => s.length > 1) ? rhs.join(' ') : rhs.join('')) : 'ε';
const ruleTxt = (A, rhs) => `${A}→${rhsTxt(rhs)}`;

/* grammar box, as printed on the paper */
function gbox(text) {
  return `<div class="gbox">${esc(text.trim().replace(/->/g, '→'))}</div>`;
}
function glines(order, R) {
  return `<div class="gbox">${order.map(A => esc(`${A} → ${R[A].map(E.fmt).join(' | ')}`)).join('\n')}</div>`;
}

/* ---------- FIRST / FOLLOW rough work ---------- */
function firstSeq(g, F, seq) {
  const out = new Set(); const why = [];
  for (const s of seq) {
    if (!g.nts.has(s)) { out.add(s); why.push(`${s} is a terminal → add ${s}, stop`); return { out, why, eps: false }; }
    [...F[s]].filter(x => x !== E.EPS).forEach(x => out.add(x));
    if (!F[s].has(E.EPS)) { why.push(`add FIRST(${s}) without ε, stop`); return { out, why, eps: false }; }
    why.push(`${s} can be ε → look at the next symbol`);
  }
  return { out, why, eps: true };
}
function roughWork(g, F, FO) {
  const L = [];
  for (const A of g.order) {
    const parts = g.rules[A].map(alt => {
      if (!alt.length) return `${A} → ε gives ε`;
      const r = firstSeq(g, F, alt);
      const lead = r.why.length > 1 ? ` (${r.why.slice(0, -1).join('; ')})` : '';
      return `${A} → ${alt.join(' ')} gives ${set([...r.out, ...(r.eps ? [E.EPS] : [])])}${lead}`;
    });
    L.push(`FIRST(${A}): ${parts.join('. ')}. Total ${set(F[A])}.`);
  }
  for (const B of g.order) {
    const parts = [];
    if (B === g.start) parts.push('start symbol → add $');
    for (const A of g.order) for (const alt of g.rules[A]) alt.forEach((s, i) => {
      if (s !== B) return;
      const beta = alt.slice(i + 1);
      const where = `in ${A} → ${alt.join(' ')}`;
      if (!beta.length) { if (A !== B) parts.push(`${where}: nothing after ${B} → add FOLLOW(${A})`); return; }
      const r = firstSeq(g, F, beta);
      let t = `${where}: after ${B} is ${beta.join(' ')} → add ${set(r.out)}`;
      if (r.eps && A !== B) t += `; ${beta.join(' ')} can be ε → add FOLLOW(${A})`;
      parts.push(t);
    });
    L.push(`FOLLOW(${B}): ${parts.join('. ')}. Total ${set(FO[B])}.`);
  }
  return `<details class="rough"><summary>How the FIRST / FOLLOW were found (rough work, not needed on paper)</summary><ul>${L.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>`;
}

function ffTable(g, F, FO) {
  return `<table class="t"><thead><tr><th>Non-terminal</th><th>FIRST</th><th>FOLLOW</th></tr></thead><tbody>${g.order.map(A => `<tr><th>${esc(A)}</th><td>${esc(set(F[A]))}</td><td>${esc(set(FO[A]))}</td></tr>`).join('')}</tbody></table>`;
}
function ll1Table(g, M) {
  const cols = [...g.terms, '$'];
  return `<div class="ts"><table class="t ll"><thead><tr><th></th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${g.order.map(A => `<tr><th>${esc(A)}</th>${cols.map(a => {
    const e = M[A + '\u0000' + a] || [];
    return `<td class="${e.length > 1 ? 'bad' : ''}">${e.map(r => esc(ruleTxt(r.lhs, r.rhs))).join('<br>')}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- tree ---------- */
function treeSVG(nodes, nts) {
  const root = nodes.find(n => n.parent == null);
  let leaf = 0; const pos = {};
  (function lay(id, d) {
    const n = nodes[id];
    if (!n.kids.length) pos[id] = { x: leaf++, y: d };
    else { n.kids.forEach(k => lay(k, d + 1)); pos[id] = { x: (pos[n.kids[0]].x + pos[n.kids[n.kids.length - 1]].x) / 2, y: d }; }
  })(root.id, 0);
  const W = 44, H = 46, maxY = Math.max(...Object.values(pos).map(p => p.y));
  const w = Math.max(leaf * W, 100), h = (maxY + 1) * H;
  let s = `<svg class="tree" viewBox="${-W / 2} -16 ${w} ${h}" width="${w}" style="max-width:100%">`;
  for (const n of nodes) if (n.parent != null) {
    const a = pos[n.parent], b = pos[n.id];
    s += `<line x1="${a.x * W}" y1="${a.y * H + 6}" x2="${b.x * W}" y2="${b.y * H - 13}"/>`;
  }
  for (const n of nodes) {
    const p = pos[n.id];
    const c = n.label === E.EPS ? 'e' : nts.has(n.label) ? 'nt' : 't';
    s += `<text x="${p.x * W}" y="${p.y * H}" class="${c}">${esc(n.label)}</text>`;
  }
  return s + '</svg>';
}

/* ---------- horizontal stack (faculty format) ---------- */
function stackSVG(res) {
  const last = res.steps[res.steps.length - 1];
  const cells = last.cells;
  const wd = cells.map(c => Math.max(30, c.sym.length * 8 + 14));
  const xs = []; let x = 0; wd.forEach(w => { xs.push(x); x += w; });
  const W = x, top = 16, ch = 28;
  let errCell = -1;
  if (!res.ok) for (let i = cells.length - 1; i >= 0; i--) if (cells[i].pop == null) { errCell = i; break; }
  // brackets: one per expansion that pushed something
  const groups = [];
  cells.forEach(c => {
    if (!c.rule || c.at == null || / → ε$/.test(c.rule)) return;
    const kids = cells.map((k, i) => k.born === c.at ? i : -1).filter(i => i >= 0);
    if (!kids.length) return;
    const [lhs, rhs] = c.rule.split(' → ');
    const label = ruleTxt(lhs, rhs.split(' '));
    const a = xs[kids[0]] + 3, b = xs[kids[kids.length - 1]] + wd[kids[kids.length - 1]] - 3, mid = (a + b) / 2;
    const lw = label.length * 6.2 + 8;
    groups.push({ a, b, mid, label, lo: Math.min(a, mid - lw / 2), hi: Math.max(b, mid + lw / 2), at: c.at });
  });
  groups.sort((p, q) => p.at - q.at);
  const lanes = [];
  for (const g of groups) {
    let l = 0;
    while ((lanes[l] || []).some(r => !(g.hi + 4 < r.lo || g.lo - 4 > r.hi))) l++;
    (lanes[l] = lanes[l] || []).push(g); g.lane = l;
  }
  const y0 = top + ch + 26, lh = 30, H = y0 + lanes.length * lh + 6;
  const minX = Math.min(0, ...groups.map(g => g.lo)), maxX = Math.max(W, ...groups.map(g => g.hi));
  let s = `<svg class="hstack" viewBox="${minX - 2} 0 ${maxX - minX + 4} ${H}" width="${maxX - minX + 4}" style="max-width:100%">`;
  cells.forEach((c, i) => {
    const cx = xs[i] + wd[i] / 2;
    s += `<rect x="${xs[i]}" y="${top}" width="${wd[i]}" height="${ch}" class="${i === errCell ? 'cerr' : ''}"/>`;
    s += `<text x="${cx}" y="${top + 19}" class="sym">${esc(c.sym)}</text>`;
    if (c.pop != null && c.sym !== '$') s += `<line x1="${xs[i] + 3}" y1="${top + ch - 3}" x2="${xs[i] + wd[i] - 3}" y2="${top + 3}" class="x"/>`;
    if (c.rule && / → ε$/.test(c.rule)) s += `<text x="${cx}" y="${top - 4}" class="epsm">→ε</text>`;
    const num = c.sym === '$' && res.ok ? 'acc' : i === errCell ? '✗' : (c.pop != null ? c.pop : '');
    s += `<text x="${cx}" y="${top + ch + 15}" class="pop">${num}</text>`;
  });
  for (const g of groups) {
    const y = y0 + g.lane * lh;
    s += `<path d="M${g.a} ${y} v6 H${g.b} v-6" class="br"/><text x="${g.mid}" y="${y + 19}" class="brl">${esc(g.label)}</text>`;
  }
  return s + '</svg>';
}

function stepLabels(res) {
  const L = []; let k = 0;
  for (const st of res.steps) {
    if (!st.act) continue;
    if (st.act === 'expand') {
      const r = st.ruleTxt.split(' → '), rhs = r[1] === E.EPS ? [] : r[1].split(' ');
      L.push(`<b>${++k}.</b> pop ${esc(r[0])} (LA = ${esc(st.buf[st.la])}): ${esc(ruleTxt(r[0], rhs))}, ${rhs.length ? 'push ' + esc([...rhs].reverse().join(' ')) : 'push nothing'}`);
    } else if (st.act === 'match') {
      L.push(`<b>${++k}.</b> match ${esc(st.tok)}, pop it, move LA → ${esc(st.buf[st.la])}`);
    } else if (st.act === 'accept') L.push('<b>acc.</b> Top = $ and LA = $ → accept');
    else L.push(`<b>err.</b> ${failLine(res)}`);
  }
  return `<div class="labels"><div class="lh">Step labels (write these under the cells on paper):</div><ol>${L.map(l => `<li>${l}</li>`).join('')}</ol></div>`;
}

function failLine(res) {
  const st = res.steps[res.steps.length - 1];
  const a = st.buf[st.la], t = st.stack[st.stack.length - 1];
  if (st.look) return `Top = ${esc(t)}, LA = ${esc(a)}: cell M[${esc(t)}, ${esc(a)}] is empty → error`;
  if (t === '$') return `Top = $ but LA = ${esc(a)} (input is left over) → error`;
  return `Top = ${esc(t)} (terminal) but LA = ${esc(a)}: they do not match → error`;
}

const READ = '<p class="small"><b>How to read it:</b> red number under a cell = the order it was popped. Bracket = what that pop pushed (right side, reversed). →ε above a cell = it was replaced by ε (push nothing). ✗ = where parsing stopped.</p>';

function parseBlock(g, input, title) {
  const res = E.parseSteps(g, input);
  const toks = input.split(' ');
  let h = `<h4>${title || `Parse ${esc(input)} (horizontal stack)`}</h4><p><b>Buffer:</b> <code>${esc(input)} $</code> &nbsp; LA ↑ starts at <code>${esc(toks[0])}</code></p>`;
  h += `<div class="ts">${stackSVG(res)}</div>${READ}${stepLabels(res)}`;
  const last = res.steps[res.steps.length - 1];
  if (res.ok) {
    h += `<h4>Parse tree</h4><div class="ts">${treeSVG(last.nodes, g.nts)}</div><p class="concl">Leaves left to right (skip ε): <code>${esc(input)}</code> = the input. Stack top $ and LA $ ∴ the string is accepted, it is syntactically correct.</p>`;
  } else {
    h += `<p class="concl bad">Parsing is not possible. Reason: ${failLine(res)}. ∴ error, the string <code>${esc(input)}</code> is not in the language.</p>`;
  }
  return h;
}

/* full LL(1) answer: rules, FIRST/FOLLOW, table, verdict, parses */
function ll1Answer(text, inputs = [], o = {}) {
  const g = G(text);
  const { F, FO, M } = E.buildTable(g);
  const rules = g.numbered.map(r => `${r.n}. ${esc(r.lhs)} → ${esc(E.fmt(r.rhs))}`).join('&nbsp;&nbsp; ');
  const bad = Object.entries(M).filter(([, v]) => v.length > 1);
  let h = `<p class="small">Numbered rules: ${rules}</p>`;
  h += `<h4>${o.step0 ? 'Step 1' : 'Step 1'} · FIRST &amp; FOLLOW</h4>${ffTable(g, F, FO)}`;
  h += `<h4>Step 2 · LL(1) parsing table</h4>${ll1Table(g, M)}`;
  if (bad.length) {
    const cells = bad.map(([k, v]) => { const [A, a] = k.split('\u0000'); return `M[${esc(A)}, ${esc(a)}] has ${v.map(r => esc(ruleTxt(r.lhs, r.rhs))).join(' and ')}`; });
    h += `<p class="concl bad">${cells.join('; ')}. A cell has more than one rule ∴ the grammar is <b>NOT LL(1)</b>. The parser cannot choose with one look-ahead, so parsing is not possible.</p>`;
    if (o.conflictWhy) h += `<p>${o.conflictWhy}</p>`;
  } else {
    h += `<p class="concl">No cell has more than one rule ∴ <b>the grammar is LL(1)</b>.</p>`;
    inputs.forEach((w, i) => { h += parseBlock(g, w, `Step 3${inputs.length > 1 ? String.fromCharCode(97 + i) : ''} · Parse <code>${esc(w)}</code> (horizontal stack)`); });
  }
  return h + roughWork(g, F, FO);
}

/* ---------- conversions ---------- */
function prefixOf(alts) { let p = 0; while (alts.every(a => p < a.length && a[p] === alts[0][p])) p++; return alts[0].slice(0, p); }

function lfAnswer(text) {
  const steps = E.leftFactorSteps(G(text));
  let h = '', k = 0;
  steps.forEach((st, i) => {
    if (!st.newNT) return;
    const A = st.focus, prev = steps[i - 1];
    const alts = prev.hl[1].map(j => prev.R[A][j]);
    h += `<p><b>Round ${++k}:</b> in ${esc(A)}, ${alts.map(a => `<code>${esc(E.fmt(a))}</code>`).join(', ')} all start with <code>${esc(prefixOf(alts).join(' '))}</code>. Take it out once:</p>${glines([A, st.newNT], st.R)}`;
  });
  const fin = steps[steps.length - 1];
  return h + `<p><b>Final DG:</b></p>${glines(fin.order, fin.R)}`;
}

function lrAnswer(text) {
  const steps = E.leftRecSteps(G(text));
  let h = '';
  steps.forEach((st, i) => {
    if (/^After substitution/.test(st.msg)) {
      const m = /starts with <code>([^<]+)<\/code>/.exec(steps[i - 1].msg);
      const Aj = m ? m[1] : 'an earlier non-terminal';
      h += `<p>${esc(st.focus)} has an alternative that starts with ${esc(Aj)} (already fixed), so hidden left recursion can come through it. Substitute ${esc(Aj)}'s current rules:</p>${glines([st.focus], st.R)}`;
    }
    if (st.newNT) {
      const A = st.focus, before = steps[i - 1].R[A];
      const al = before.filter(a => a[0] === A).map(a => E.fmt(a.slice(1))), be = before.filter(a => a[0] !== A).map(E.fmt);
      h += `<p>${esc(A)} → ${esc(before.map(E.fmt).join(' | '))}: α = ${al.map(x => `<code>${esc(x)}</code>`).join(', ')}, β = ${be.map(x => `<code>${esc(x)}</code>`).join(', ')}.</p>${glines([A, st.newNT], st.R)}`;
    }
  });
  const fin = steps[steps.length - 1];
  return h + `<p><b>Final RRG:</b></p>${glines(fin.order, fin.R)}<p class="small">Rule: A → Aα | β ⇒ A → βA', A' → αA' | ε. "β goes first, α goes to the new guy, new guy ends with ε."</p>`;
}

/* ---------- derivations (ambiguity answers) ---------- */
function lmd(start, nts, seq) {
  const N = new Set(nts);
  const nodes = [{ id: 0, label: start, parent: null, kids: [] }];
  let form = [0];
  const line = [start];
  for (const rhs of seq) {
    const idx = form.findIndex(id => N.has(nodes[id].label));
    if (idx < 0) throw new Error('no non-terminal left in ' + line.join(' '));
    const par = form[idx];
    const syms = rhs === 'ε' ? ['ε'] : rhs.split(' ');
    const kids = syms.map(s => { const id = nodes.length; nodes.push({ id, label: s, parent: par, kids: [] }); return id; });
    nodes[par].kids = kids;
    form = [...form.slice(0, idx), ...kids.filter(id => nodes[id].label !== 'ε'), ...form.slice(idx + 1)];
    line.push(form.map(id => nodes[id].label).join(' ') || 'ε');
  }
  if (form.some(id => N.has(nodes[id].label))) throw new Error('derivation not finished: ' + line[line.length - 1]);
  return { text: line.join(' ⇒ '), svg: treeSVG(nodes, N), yield: line[line.length - 1] };
}
function twoLMD(start, nts, s1, s2, cap1, cap2) {
  const a = lmd(start, nts, s1), b = lmd(start, nts, s2);
  if (a.yield !== b.yield) throw new Error('LMDs give different strings: ' + a.yield + ' / ' + b.yield);
  return `<p><b>LMD 1</b>${cap1 ? ` (${cap1})` : ''}: ${esc(a.text)}</p><p><b>LMD 2</b>${cap2 ? ` (${cap2})` : ''}: ${esc(b.text)}</p>
  <div class="trees"><figure><figcaption>Tree 1</figcaption>${a.svg}</figure><figure><figcaption>Tree 2</figcaption>${b.svg}</figure></div>`;
}
function oneLMD(start, nts, seq) {
  const a = lmd(start, nts, seq);
  return `<p><b>LMD</b>: ${esc(a.text)}</p><div class="trees"><figure>${a.svg}</figure></div>`;
}

function table(head, rows) {
  return `<table class="t"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function tf(rows) {
  return table(['#', 'Answer', 'Reason (one line)'], rows.map(([k, a, why]) => [`(${k})`, `<b>${a}</b>`, why]));
}

module.exports = { esc, gbox, glines, ll1Answer, parseBlock, lfAnswer, lrAnswer, twoLMD, oneLMD, table, tf, G, E };
