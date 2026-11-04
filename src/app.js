/* ===== Rendering + interactivity ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- grammar view ---------- */
function grammarHTML(order, R, o = {}) {
  let n = 0;
  return '<div class="gram">' + order.map(A => {
    const alts = R[A].map((alt, ai) => {
      n++;
      const hlAlt = (o.alt && o.alt[0] === A && o.alt[1] === ai) || (o.hl && o.hl[0] === A && o.hl[1].includes(ai));
      const syms = alt.length ? alt.map((s, si) => {
        let c = '';
        if (o.alt && o.alt[0] === A && o.alt[1] === ai) {
          if (si === o.sym) c = 'sym-on';
          else if (o.look != null && si === o.look) c = 'sym-look';
        }
        return `<span class="s ${c}">${esc(s)}</span>`;
      }).join(' ') : `<span class="s eps">ε</span>`;
      const tag = o.numbered ? `<sup class="rn">${n}</sup>` : '';
      return `<span class="alt ${hlAlt ? 'alt-on' : ''} ${o.rule === n ? 'alt-on' : ''}">${tag}${syms}</span>`;
    }).join(' <span class="bar">|</span> ');
    const cls = [o.focus === A ? 'g-focus' : '', o.newNT === A ? 'g-new' : ''].join(' ');
    return `<div class="gline ${cls}"><span class="lhs">${esc(A)}</span> <span class="arr">→</span> ${alts}</div>`;
  }).join('') + '</div>';
}

function setsHTML(title, order, sets, o = {}) {
  const rows = order.map(A => {
    const s = sets[A];
    const added = o.added && o.added[0] === A ? o.added[1] : [];
    const items = s ? s.map(x => `<span class="chip ${added.includes(x) ? 'chip-new' : ''}">${esc(x)}</span>`).join(', ') : '<span class="muted">not yet</span>';
    const cls = [o.focus === A ? 'row-focus' : '', o.complete === A ? 'row-done' : ''].join(' ');
    return `<tr class="${cls}"><th>${title}(${esc(A)})</th><td>${s ? '{ ' + items + ' }' : items}</td></tr>`;
  }).join('');
  return `<table class="sets"><tbody>${rows}</tbody></table>`;
}

function ffTable(order, F, FO) {
  const f = x => '{ ' + [...x].join(', ') + ' }';
  return `<div class="tscroll"><table class="ff"><thead><tr><th>Non-terminal</th><th>FIRST()</th><th>FOLLOW()</th></tr></thead><tbody>${order.map(A => `<tr><th>${esc(A)}</th><td>${esc(f(F[A]))}</td><td>${esc(f(FO[A]))}</td></tr>`).join('')}</tbody></table></div>`;
}

function ll1TableHTML(order, cols, M, o = {}) {
  const head = `<tr><th></th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const body = order.map(A => `<tr><th>${esc(A)}</th>${cols.map(a => {
    const e = M[A + '\u0000' + a] || [];
    const on = o.cell && o.cell[0] === A && o.cell[1] === a;
    const cls = [on ? (o.conflict ? 'cell-bad' : 'cell-on') : '', e.length > 1 ? 'cell-bad' : '', o.look && o.look[0] === A && o.look[1] === a ? 'cell-look' : ''].join(' ');
    const txt = e.length ? e.map(r => `<span class="tr">${esc(r.lhs)}→${esc(r.rhs.length ? r.rhs.join(' ') : 'ε')}</span>`).join('') : (o.blanks ? '<span class="err">error</span>' : '');
    return `<td class="${cls}">${txt}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="tscroll"><table class="ll1">${head}${body}</table></div>`;
}

/* ---------- tree ---------- */
function treeSVG(nodes, cur, opts = {}) {
  if (!nodes.length) return '';
  const root = nodes.find(n => n.parent == null);
  let leaf = 0; const pos = {};
  (function lay(id, d) {
    const n = nodes[id];
    if (!n.kids.length) pos[id] = { x: leaf++, y: d };
    else { n.kids.forEach(k => lay(k, d + 1)); pos[id] = { x: (pos[n.kids[0]].x + pos[n.kids[n.kids.length - 1]].x) / 2, y: d }; }
  })(root.id, 0);
  const W = 46, H = 50, maxY = Math.max(...Object.values(pos).map(p => p.y));
  const w = Math.max(leaf * W, 120), h = (maxY + 1) * H + 10;
  let s = `<svg class="tree" viewBox="${-W / 2} -18 ${w} ${h}" style="max-width:${Math.min(w * 1.15, 860)}px">`;
  for (const n of nodes) if (n.parent != null) {
    const a = pos[n.parent], b = pos[n.id];
    s += `<line x1="${a.x * W}" y1="${a.y * H + 8}" x2="${b.x * W}" y2="${b.y * H - 12}" class="edge ${n.born === cur ? 'edge-new' : ''}"/>`;
  }
  for (const n of nodes) {
    const p = pos[n.id], nt = opts.nts ? opts.nts.has(n.label) : /^[A-Z]/.test(n.label);
    const cls = [n.born === cur ? 'n-new' : '', nt ? 'n-nt' : (n.label === 'ε' ? 'n-eps' : 'n-t'), n.matched ? 'n-match' : '', opts.val && n.val != null ? '' : ''].join(' ');
    s += `<text x="${p.x * W}" y="${p.y * H}" class="node ${cls}">${esc(n.label)}</text>`;
    if (n.val != null) s += `<text x="${p.x * W + 14}" y="${p.y * H - 10}" class="nval">${n.val}</text>`;
  }
  return s + '</svg>';
}

/* ---------- parse view ---------- */
function parseHTML(G, st, tbl) {
  const buf = st.buf.map((t, i) => `<span class="tok ${i < st.la ? 'tok-used' : ''} ${i === st.la ? 'tok-la' : ''}">${esc(t)}</span>`).join('');
  const stack = st.stack.map((s, i) => `<span class="cell ${i === st.stack.length - 1 ? 'cell-top' : ''}">${esc(s)}</span>`).join('');
  const hist = st.cells.map(c => `<span class="hc ${c.pop ? 'hc-pop' : ''} ${c.born === st.n ? 'hc-new' : ''}"><span class="hs">${esc(c.sym)}</span><span class="hn">${c.pop || ''}</span>${c.rule ? `<span class="hr">${esc(c.rule)}</span>` : ''}</span>`).join('');
  return `
  <div class="pv">
    <div class="lbl">Buffer (input) &nbsp;<span class="muted">LA = look-ahead</span></div><div class="buf">${buf}</div>
    <div class="lbl">Stack now &nbsp;<span class="muted">bottom ← → top</span></div><div class="stk">${stack || '<span class="muted">empty</span>'}</div>
    <div class="lbl">Exam-style stack &nbsp;<span class="muted">every push, in order. Number = pop order. Rule = what replaced it.</span></div><div class="hist">${hist}</div>
    <details class="mini" ${st.look ? 'open' : ''}><summary>LL(1) table${st.look ? ` &mdash; looking at M[${esc(st.look[0])}, ${esc(st.look[1])}]` : ''}</summary>${ll1TableHTML(G.order, [...G.terms, '$'], tbl, { look: st.look })}</details>
    <div class="lbl">Parse tree (grows as rules are used)</div>${treeSVG(st.nodes, st.n, { nts: G.nts })}
  </div>`;
}

/* ---------- Stepper ---------- */
let activeStepper = null;
class Stepper {
  constructor(el, steps, render, opts = {}) {
    this.el = el; this.steps = steps; this.render = render; this.i = 0;
    el.classList.add('stepper');
    el.innerHTML = `
      <div class="st-sticky">
      <div class="st-head"><span class="st-title">${opts.title || ''}</span><span class="st-count"></span></div>
      <div class="st-bar"><i></i></div>
      <div class="st-msg" aria-live="polite"></div>
      <div class="st-ctl">
        <button class="b-reset" title="Start again">⟲ Reset</button>
        <button class="b-back">← Back</button>
        <button class="b-next primary">Next →</button>
        <button class="b-end" title="Jump to the end">End ⇥</button>
      </div>
      </div>
      <div class="st-view"></div>`;
    $('.b-next', el).onclick = () => this.go(this.i + 1);
    $('.b-back', el).onclick = () => this.go(this.i - 1);
    $('.b-reset', el).onclick = () => this.go(0);
    $('.b-end', el).onclick = () => this.go(this.steps.length - 1);
    el.addEventListener('pointerdown', () => { activeStepper = this; });
    this.go(0);
  }
  go(i) {
    if (!this.steps.length) return;
    this.i = Math.max(0, Math.min(this.steps.length - 1, i));
    activeStepper = this;
    const st = this.steps[this.i];
    $('.st-count', this.el).textContent = `Step ${this.i + 1} / ${this.steps.length}`;
    $('.st-bar i', this.el).style.width = ((this.i + 1) / this.steps.length * 100) + '%';
    const m = $('.st-msg', this.el);
    m.innerHTML = (st.phase ? `<span class="phase">${st.phase}</span>` : '') + st.msg;
    m.className = 'st-msg' + (st.error || st.ok === false ? ' msg-bad' : '') + (st.accept || st.ok || st.final ? ' msg-good' : '');
    $('.st-view', this.el).innerHTML = this.render(st, this.i);
    $('.b-back', this.el).disabled = this.i === 0;
    $('.b-next', this.el).disabled = this.i === this.steps.length - 1;
  }
}
document.addEventListener('keydown', e => {
  if (!activeStepper || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') { activeStepper.go(activeStepper.i + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { activeStepper.go(activeStepper.i - 1); e.preventDefault(); }
});

/* ---------- step builders per kind ---------- */
function buildLL1(G, kind, input) {
  const { F, FO, M } = buildTable(G);
  const parts = [];
  const tag = (arr, p) => arr.map(s => Object.assign({}, s, { phase: p }));
  if (kind === 'first' || kind === 'full') parts.push(...tag(firstSteps(G), kind === 'full' ? '1 · FIRST' : ''));
  if (kind === 'follow' || kind === 'full') parts.push(...tag(followSteps(G), kind === 'full' ? '2 · FOLLOW' : ''));
  if (kind === 'table' || kind === 'full') parts.push(...tag(tableSteps(G), kind === 'full' ? '3 · TABLE' : ''));
  if ((kind === 'parse' || kind === 'full') && input) parts.push(...tag(parseSteps(G, input).steps.map(s => Object.assign(s, { isParse: true })), kind === 'full' ? '4 · PARSE' : ''));
  const render = st => {
    if (st.isParse) return parseHTML(G, st, M);
    if (st.M) return grammarHTML(G.order, G.rules, { numbered: true, rule: st.rule }) + ll1TableHTML(G.order, st.cols, st.M, st);
    if (st.first) return grammarHTML(G.order, G.rules, st) + `<div class="two"><div><div class="lbl">FIRST (done earlier)</div>${setsHTML('FIRST', G.order, snapAll(F))}</div><div><div class="lbl">FOLLOW (building)</div>${setsHTML('FOLLOW', G.order, st.sets, st)}</div></div>`;
    return grammarHTML(G.order, G.rules, st) + `<div class="lbl">FIRST sets (building)</div>` + setsHTML('FIRST', G.order, st.sets, st);
  };
  return { steps: parts, render };
}
const snapAll = F => { const o = {}; for (const k in F) o[k] = [...F[k]]; return o; };

function buildConv(G, kind) {
  const steps = kind === 'lf' ? leftFactorSteps(G) : leftRecSteps(G);
  return { steps, render: st => grammarHTML(st.order, st.R, st) + (st.final ? `<div class="final-box">${st.order.map(A => `${esc(A)} → ${esc(st.R[A].map(fmt).join(' | '))}`).join('<br>')}</div>` : '') };
}

/* derivation spec: {start, nts, mode:'L'|'R', seq:[[lhs, rhs]], notes?:[], vals?:{}} */
function derivSteps(spec) {
  const nts = new Set(spec.nts);
  const nodes = []; const mk = (label, parent) => { const id = nodes.length; nodes.push({ id, label, parent, kids: [], born: 0 }); if (parent != null) nodes[parent].kids.push(id); return id; };
  let form = [{ sym: spec.start, node: mk(spec.start, null) }];
  const lines = [spec.start];
  const steps = [{ msg: spec.intro || `Start with the start symbol <code>${spec.start}</code>.`, lines: [...lines], nodes: JSON.parse(JSON.stringify(nodes)), n: 0 }];
  spec.seq.forEach(([lhs, rhs], k) => {
    const idxs = form.map((f, i) => nts.has(f.sym) ? i : -1).filter(i => i >= 0);
    const at = spec.mode === 'R' ? idxs[idxs.length - 1] : idxs[0];
    if (form[at].sym !== lhs) throw new Error(`deriv: expected ${lhs} got ${form[at].sym}`);
    const parts = rhs === 'ε' ? [] : rhs.split(' ');
    const kids = (parts.length ? parts : ['ε']).map(s => mk(s, form[at].node));
    kids.forEach(id => nodes[id].born = k + 1);
    form = [...form.slice(0, at), ...parts.map((s, i) => ({ sym: s, node: kids[i] })), ...form.slice(at + 1)];
    const line = form.map(f => f.sym).join(' ') || 'ε';
    lines.push(line);
    const side = spec.mode === 'R' ? 'rightmost' : 'leftmost';
    const def = `Expand the <b>${side}</b> non-terminal <code>${lhs}</code> using <code>${lhs} → ${rhs}</code>.`;
    steps.push({ msg: (spec.notes && spec.notes[k]) || def, lines: [...lines], nodes: JSON.parse(JSON.stringify(nodes)), n: k + 1, at });
  });
  if (spec.leafVals) {
    const nn = JSON.parse(JSON.stringify(nodes)); let li = 0;
    (function ev(id) { const n = nn[id]; if (!n.kids.length) { n.val = /^(id|num)$/.test(n.label) ? spec.leafVals[li++] : null; return n.val; }
      const v = n.kids.map(ev); if (n.kids.length === 1) n.val = v[0];
      else if (n.kids.length === 3) { const op = nn[n.kids[1]].label; if (op === '(') n.val = v[1]; else n.val = op === '+' ? v[0] + v[2] : op === '*' ? v[0] * v[2] : op === '-' ? v[0] - v[2] : op === '/' ? v[0] / v[2] : v[0] ** v[2]; }
      return n.val; })(0);
    steps.push({ msg: spec.valMsg ? spec.valMsg(nn[0].val) : `Evaluate the tree from the bottom up. Result = <b>${nn[0].val}</b>.`, lines: [...lines], nodes: nn, n: -1, final: true });
  }
  return steps;
}
function buildDeriv(spec) {
  const steps = derivSteps(spec);
  return { steps, render: st => `<div class="deriv">${st.lines.map((l, i) => `<div class="dl ${i === st.lines.length - 1 ? 'dl-new' : ''}">${i ? '⇒' : '&nbsp;&nbsp;'} ${esc(l)}</div>`).join('')}</div>${treeSVG(st.nodes, st.n, { nts: new Set(spec.nts) })}` };
}

/* NFA for (a|b)*ab, from the class notes */
function nfaSteps(str) {
  const T = { 0: { a: [0, 1], b: [0] }, 1: { b: [2] }, 2: {} };
  let cur = [0]; const steps = [{ msg: `Start in state <b>0</b>. Input: <code>${esc(str) || '(empty)'}</code>.`, cur: [...cur], i: 0 }];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c !== 'a' && c !== 'b') { steps.push({ msg: `<code>${esc(c)}</code> is not in the alphabet {a, b}. <b class="bad">Rejected.</b>`, cur: [], i: i + 1, error: true }); return steps; }
    const nx = [...new Set(cur.flatMap(s => T[s][c] || []))].sort();
    steps.push({ msg: `Read <code>${c}</code>. From {${cur.join(', ')}} on <code>${c}</code> we can go to {${nx.join(', ') || 'nowhere'}}.${c === 'a' && cur.includes(0) ? ' From 0, <code>a</code> can stay in 0 <b>or</b> guess "this is the last <code>a</code>" and go to 1.' : ''}`, cur: nx, i: i + 1, ch: c });
    cur = nx;
  }
  const ok = cur.includes(2);
  steps.push({ msg: ok ? `Input finished in state set {${cur.join(', ')}}. It contains the final state <b>2</b>. <b>Accepted:</b> the string ends in <code>ab</code>.` : `Input finished in {${cur.join(', ') || 'nothing'}}. Final state 2 is not there. <b class="bad">Rejected.</b>`, cur, i: str.length, ok, final: ok, error: !ok });
  return steps;
}
function nfaSVG(cur) {
  const on = s => cur.includes(s) ? 'st-on' : '';
  return `<svg class="nfa" viewBox="0 0 340 130">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" class="ahead"/></marker></defs>
  <text x="8" y="80" class="lab">start</text><line x1="40" y1="76" x2="66" y2="76" class="arrow" marker-end="url(#ah)"/>
  <circle cx="90" cy="76" r="22" class="st ${on(0)}"/><text x="90" y="81" class="stl">0</text>
  <path d="M78,56 C70,22 110,22 102,56" class="arrow" marker-end="url(#ah)"/><text x="90" y="24" class="lab">a, b</text>
  <line x1="112" y1="76" x2="178" y2="76" class="arrow" marker-end="url(#ah)"/><text x="145" y="68" class="lab">a</text>
  <circle cx="200" cy="76" r="22" class="st ${on(1)}"/><text x="200" y="81" class="stl">1</text>
  <line x1="222" y1="76" x2="276" y2="76" class="arrow" marker-end="url(#ah)"/><text x="249" y="68" class="lab">b</text>
  <circle cx="300" cy="76" r="22" class="st ${on(2)}"/><circle cx="300" cy="76" r="17" class="st2"/><text x="300" y="81" class="stl">2</text>
  </svg>`;
}

/* ---------- exam-format final answer (what to write on paper) ---------- */
function examAnswer(G, input) {
  const { F, FO, M } = buildTable(G);
  const cols = [...G.terms, '$'];
  const rules = G.numbered.map(r => `(${r.n}) ${esc(r.lhs)} → ${esc(fmt(r.rhs))}`).join('&nbsp;&nbsp; ');
  const conflicts = Object.values(M).filter(v => v.length > 1).length;
  let h = `<div class="ans"><p class="muted">Rules numbered: ${rules}</p><h5>1. First() and Follow()</h5>${ffTable(G.order, F, FO)}<h5>2. LL(1) Parsing Table</h5>${ll1TableHTML(G.order, cols, M, { blanks: false })}<p>${conflicts ? '<b class="bad">A cell has more than one rule ∴ the grammar is NOT LL(1).</b>' : 'No cell has more than one rule ∴ the grammar is LL(1).'}</p>`;
  if (input) {
    const { steps, ok } = parseSteps(G, input); const last = steps[steps.length - 1];
    const hist = last.cells.map(c => `<span class="hc hc-pop"><span class="hs">${esc(c.sym)}</span><span class="hn">${c.pop || ''}</span>${c.rule ? `<span class="hr">${esc(c.rule)}</span>` : ''}</span>`).join('');
    const acts = steps.filter(s => s.act).map((s, k) => `${k + 1} ${s.act === 'expand' ? esc(s.ruleTxt) : s.act === 'match' ? 'match ' + esc(s.tok) : s.act === 'accept' ? '$ = $ accept' : 'error'}`).join(' · ');
    h += `<h5>3. Parsing the string (horizontal stack)</h5><p>Buffer: <code>${esc(input)} $</code> &nbsp; LA ↑ starts at <code>${esc(input.split(' ')[0])}</code></p><div class="hist">${hist}</div>
      <p class="muted">Non-terminal: pop, push right side reversed. Terminal: match with LA, pop, move LA. Numbers under cells = pop order.</p><p><b>Steps:</b> ${acts}</p>`;
    if (ok) h += `<h5>4. Parse tree</h5>${treeSVG(last.nodes, -1, { nts: G.nts })}<p class="concl"><b>Conclusion:</b> Stack reaches $ when the buffer reaches $. ∴ The string <code>${esc(input.replace(/ /g, ''))}</code> is accepted. The grammar is LL(1) and the string is syntactically correct.</p>`;
    else h += `<p class="concl bad"><b>Conclusion:</b> ${last.msg.replace(/<[^>]+>/g, '')} ∴ Parsing is not possible for <code>${esc(input.replace(/ /g, ''))}</code>.</p>`;
  }
  return h + '</div>';
}

/* ---------- mount everything ---------- */
function mountAll() {
  for (const el of $$('[data-ll1]')) {
    const G = parseGrammar(GRAMMARS[el.dataset.g]);
    const { steps, render } = buildLL1(G, el.dataset.ll1, el.dataset.input);
    new Stepper(el, steps, render, { title: el.dataset.title });
  }
  for (const el of $$('[data-conv]')) {
    const G = parseGrammar(GRAMMARS[el.dataset.g]);
    const { steps, render } = buildConv(G, el.dataset.conv);
    new Stepper(el, steps, render, { title: el.dataset.title });
  }
  for (const el of $$('[data-deriv]')) {
    const { steps, render } = buildDeriv(DERIVS[el.dataset.deriv]);
    new Stepper(el, steps, render, { title: el.dataset.title });
  }
  for (const el of $$('[data-notes]')) {
    const steps = NOTES[el.dataset.notes];
    new Stepper(el, steps, (st, i) => `<div class="nview">${steps.slice(0, i + 1).filter(s => s.html).map((s, k, a) => `<div class="nb ${k === a.length - 1 && s === st ? 'nb-new' : ''}">${s.html}</div>`).join('')}</div>`, { title: el.dataset.title });
  }
  for (const el of $$('[data-answer]')) el.innerHTML = examAnswer(parseGrammar(GRAMMARS[el.dataset.g]), el.dataset.input);
  for (const el of $$('[data-tree]')) { const st = derivSteps(DERIVS[el.dataset.tree]); el.innerHTML = treeSVG(st[st.length - 1].nodes, -1, { nts: new Set(DERIVS[el.dataset.tree].nts) }); }

  /* NFA tester */
  const nf = $('#nfa-run');
  if (nf) {
    const host = $('#nfa-stepper');
    const run = () => { const s = $('#nfa-in').value.trim(); const steps = nfaSteps(s);
      new Stepper(host, steps, st => nfaSVG(st.cur) + `<div class="buf">${[...s].map((c, i) => `<span class="tok ${i < st.i ? 'tok-used' : ''} ${i === st.i - 1 ? 'tok-la' : ''}">${esc(c)}</span>`).join('')}</div>`, { title: `NFA for (a|b)*ab on "${esc(s)}"` }); };
    nf.onclick = run; run();
  }

  /* playground */
  const pg = $('#pg-run');
  if (pg) pg.onclick = () => {
    const out = $('#pg-out'), mode = $('#pg-mode').value;
    try {
      const G = parseGrammar($('#pg-g').value);
      out.innerHTML = '<div id="pg-st"></div>';
      const host = $('#pg-st');
      if (mode === 'lf' || mode === 'lr') { const { steps, render } = buildConv(G, mode); new Stepper(host, steps, render, { title: mode === 'lf' ? 'Left factoring (NDG → DG)' : 'Remove left recursion (LRG → RRG)' }); }
      else {
        const lr = leftRecursive(G);
        if (lr.length) { out.innerHTML = `<p class="warnbox">${lr.join(', ')} is left recursive. LL(1) is not possible. Choose "Remove left recursion" first, then paste the result here.</p>`; return; }
        const { steps, render } = buildLL1(G, 'full', $('#pg-s').value.trim());
        new Stepper(host, steps, render, { title: 'Full LL(1) solution' });
        out.insertAdjacentHTML('beforeend', `<details class="ex"><summary>Show the exam-format answer (write this on paper)</summary>${examAnswer(G, $('#pg-s').value.trim())}</details>`);
      }
    } catch (e) { out.innerHTML = `<p class="warnbox">${esc(e.message)}</p>`; }
  };
  $$('[data-load]').forEach(b => b.onclick = () => { const [g, s, m] = b.dataset.load.split('::'); $('#pg-g').value = GRAMMARS[g]; $('#pg-s').value = s || ''; $('#pg-mode').value = m || 'll1'; $('#pg-run').click(); });

  /* classifiers (True/False and others) */
  for (const q of $$('.cls')) {
    const fb = $('.fb', q);
    $$('button', q).forEach(b => b.onclick = () => {
      const ok = b.dataset.v === q.dataset.a;
      $$('button', q).forEach(x => x.classList.remove('ok', 'no'));
      b.classList.add(ok ? 'ok' : 'no');
      fb.innerHTML = ok ? `<b>Correct.</b> ${q.dataset.why}` : `Not quite. Try again.`;
      fb.className = 'fb ' + (ok ? 'fb-ok' : 'fb-no');
    });
  }

  /* practice paper scoring */
  const upd = () => {
    let tot = 0, max = 0;
    for (const q of $$('.pq')) {
      let s = 0, m = 0;
      $$('input[type=checkbox]', q).forEach(c => { const v = +c.dataset.m; m += v; if (c.checked) s += v; });
      $('.pq-score', q).textContent = `${s} / ${m}`; tot += s; max += m;
    }
    const pct = max ? tot / max * 100 : 0;
    $('#pp-total').textContent = `${tot} / ${max}`;
    $('#pp-msg').innerHTML = !tot ? 'Tick the steps you got right to see your result.'
      : pct >= 80 ? '<b>Ready.</b> Sleep well and repeat the cheat sheet in the morning.'
      : pct >= 60 ? '<b>Close.</b> Redo the questions where you lost marks, using their steppers.'
      : '<b>Go back to the lessons:</b> 6 (ambiguity), 7 (left recursion), 8 (left factoring), 12–14 (FIRST, FOLLOW, table, parse).';
  };
  $$('.pq input[type=checkbox]').forEach(c => c.onchange = upd); if ($('#pp-total')) upd();

  /* timer */
  const tEl = $('#pp-time');
  if (tEl) {
    let left = 90 * 60, h = null;
    const show = () => { tEl.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; tEl.classList.toggle('low', left < 600); };
    $('#pp-start').onclick = () => { if (h) { clearInterval(h); h = null; $('#pp-start').textContent = 'Resume'; return; } $('#pp-start').textContent = 'Pause'; tEl.parentNode.classList.add('running'); h = setInterval(() => { if (left > 0) left--; show(); if (!left) { clearInterval(h); h = null; } }, 1000); };
    $('#pp-reset').onclick = () => { clearInterval(h); h = null; left = 90 * 60; tEl.parentNode.classList.remove('running'); $('#pp-start').textContent = 'Start'; show(); };
    show();
  }

  /* theme */
  $('#theme').onclick = () => {
    const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark';
  };
}
document.addEventListener('DOMContentLoaded', () => {
  mountAll();
  const side = $('#side'), scrim = $('#scrim'), menu = $('#menu');
  const setOpen = o => { side.classList.toggle('open', o); scrim.classList.toggle('open', o); menu.setAttribute('aria-expanded', o); };
  menu.onclick = () => setOpen(!side.classList.contains('open'));
  scrim.onclick = () => setOpen(false);
  $$('a', side).forEach(a => a.addEventListener('click', () => setOpen(false)));
  const links = new Map($$('a', side).map(a => [a.getAttribute('href').slice(1), a]));
  const mark = id => { links.forEach((a, k) => a.classList.toggle('on', k === id)); const a = links.get(id); if (a) { $('#cur').textContent = a.textContent.replace(/^(\d+)/, '$1 '); a.scrollIntoView({ block: 'nearest' }); } };
  const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0]; if (v) mark(v.target.id); }, { rootMargin: '-20% 0px -70% 0px' });
  $$('section.card').forEach(sec => io.observe(sec));
  mark('s0');
});
