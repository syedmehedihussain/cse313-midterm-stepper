/* ===== Grammar engine: every step is computed, never typed by hand ===== */
const EPS = 'ε';

function parseGrammar(text) {
  const order = [], rules = {};
  const lines = text.replace(/→/g, '->').split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const k = line.indexOf('->');
    if (k < 0) throw new Error('Missing "->" in: ' + line);
    const lhs = line.slice(0, k).trim();
    if (!lhs || /\s/.test(lhs)) throw new Error('Left side must be one non-terminal: ' + line);
    const alts = line.slice(k + 2).split('|').map(a => a.trim().split(/\s+/).filter(Boolean))
      .map(a => (a.length === 1 && (a[0] === EPS || a[0] === 'eps' || a[0] === '∈')) ? [] : a);
    if (!rules[lhs]) { rules[lhs] = []; order.push(lhs); }
    rules[lhs].push(...alts);
  }
  if (!order.length) throw new Error('Grammar is empty.');
  const nts = new Set(order);
  const terms = [];
  for (const A of order) for (const alt of rules[A]) for (const s of alt)
    if (!nts.has(s) && !terms.includes(s)) terms.push(s);
  const numbered = [];
  for (const A of order) rules[A].forEach((alt, i) => numbered.push({ lhs: A, alt: i, rhs: alt, n: numbered.length + 1 }));
  return { order, rules, nts, terms, numbered, start: order[0] };
}

const isNT = (G, s) => G.nts.has(s);
const fmt = a => a.length ? a.join(' ') : EPS;
const setStr = s => '{ ' + [...s].join(', ') + ' }';
const snap = obj => { const o = {}; for (const k in obj) o[k] = [...obj[k]]; return o; };

function firstOfSeq(G, seq, F) {
  const out = new Set();
  for (const s of seq) {
    const f = isNT(G, s) ? F[s] : new Set([s]);
    for (const x of f) if (x !== EPS) out.add(x);
    if (!f.has(EPS)) return out;
  }
  out.add(EPS);
  return out;
}

function computeFirst(G) {
  const F = {}; G.order.forEach(A => F[A] = new Set());
  let ch = true;
  while (ch) { ch = false;
    for (const A of G.order) for (const alt of G.rules[A]) for (const x of firstOfSeq(G, alt, F))
      if (!F[A].has(x)) { F[A].add(x); ch = true; } }
  return F;
}

function computeFollow(G, F) {
  const FO = {}; G.order.forEach(A => FO[A] = new Set());
  FO[G.start].add('$');
  let ch = true;
  while (ch) { ch = false;
    for (const A of G.order) for (const alt of G.rules[A]) alt.forEach((B, i) => {
      if (!isNT(G, B)) return;
      const f = firstOfSeq(G, alt.slice(i + 1), F);
      const add = [...f].filter(x => x !== EPS);
      if (f.has(EPS)) add.push(...FO[A]);
      for (const x of add) if (!FO[B].has(x)) { FO[B].add(x); ch = true; }
    }); }
  return FO;
}

function leftRecursive(G) {
  // returns list of NTs that can derive themselves at the left
  const F0 = computeFirst(G), bad = [];
  for (const A of G.order) {
    const seen = new Set(), stack = [A];
    while (stack.length) {
      const X = stack.pop();
      for (const alt of G.rules[X]) for (const s of alt) {
        if (!isNT(G, s)) break;
        if (s === A) { if (!bad.includes(A)) bad.push(A); }
        else if (!seen.has(s)) { seen.add(s); stack.push(s); }
        if (!F0[s].has(EPS)) break;
      }
    }
  }
  return bad;
}

/* ---------- FIRST, step by step ---------- */
function firstSteps(G) {
  const F = {}, state = {}, steps = [];
  const push = (msg, extra = {}) => steps.push(Object.assign({ msg, sets: snap(F), done: Object.keys(state).filter(k => state[k] === 'done') }, extra));
  const lr = leftRecursive(G);
  if (lr.length) {
    push(`<b>Stop.</b> ${lr.map(x => `<code>${x}</code>`).join(', ')} is left recursive (it starts with itself). FIRST would loop forever, and LL(1) needs <b>no left recursion</b>. Remove left recursion first (Lesson 7).`, { error: true });
    return steps;
  }
  function compute(A) {
    state[A] = 'busy'; F[A] = F[A] || new Set();
    push(`Find <b>FIRST(${A})</b>. FIRST(${A}) = the terminals that can come <b>first</b> in anything ${A} makes. Look at each alternative of ${A}, one by one.`, { focus: A });
    G.rules[A].forEach((alt, ai) => {
      if (!alt.length) {
        F[A].add(EPS);
        push(`Alternative <code>${A} → ε</code>. ${A} can be empty. <b>Add ε</b> to FIRST(${A}).`, { focus: A, alt: [A, ai], added: [A, [EPS]] });
        return;
      }
      for (let i = 0; i < alt.length; i++) {
        const X = alt[i];
        if (!isNT(G, X)) {
          const isNew = !F[A].has(X); F[A].add(X);
          push(`Alternative <code>${A} → ${fmt(alt)}</code>. ${i ? 'Now the next' : 'The first'} symbol is <code>${X}</code>. It is a <b>terminal</b>. <b>Add ${X}</b>${isNew ? '' : ' (already there)'} and stop for this alternative.`, { focus: A, alt: [A, ai], sym: i, added: [A, [X]] });
          return;
        }
        if (state[X] !== 'done') {
          push(`Alternative <code>${A} → ${fmt(alt)}</code>. ${i ? 'Next' : 'First'} symbol <code>${X}</code> is a <b>non-terminal</b>. We need FIRST(${X}) before we can continue. <b>Pause ${A}</b> and solve ${X} first.`, { focus: A, alt: [A, ai], sym: i });
          compute(X);
          push(`FIRST(${X}) is ready. <b>Go back</b> to ${A}, alternative <code>${A} → ${fmt(alt)}</code>.`, { focus: A, alt: [A, ai], sym: i });
        }
        const add = [...F[X]].filter(x => x !== EPS); add.forEach(x => F[A].add(x));
        const vanish = F[X].has(EPS);
        if (!vanish) {
          push(`Copy FIRST(${X}) = ${setStr(F[X])} into FIRST(${A}). ${X} cannot be empty (no ε), so <b>stop</b> here.`, { focus: A, alt: [A, ai], sym: i, added: [A, add] });
          return;
        }
        if (i === alt.length - 1) {
          F[A].add(EPS);
          push(`Copy FIRST(${X}) without ε = ${setStr(add)}. ${X} can be empty, and it is the <b>last</b> symbol. So the whole alternative can be empty: <b>add ε</b> too.`, { focus: A, alt: [A, ai], sym: i, added: [A, [...add, EPS]] });
          return;
        }
        push(`Copy FIRST(${X}) <b>without ε</b> = ${setStr(add)}. ${X} can be empty (it has ε). So we must <b>also look at the next symbol</b>, <code>${alt[i + 1]}</code>.`, { focus: A, alt: [A, ai], sym: i, added: [A, add] });
      }
    });
    state[A] = 'done';
    push(`<b>FIRST(${A}) = ${setStr(F[A])}</b> is complete.`, { focus: A, complete: A });
  }
  for (const A of G.order) if (state[A] !== 'done') compute(A);
  push(`All FIRST sets are complete. Check: every set holds only terminals and maybe ε.`, { final: true });
  return steps;
}

/* ---------- FOLLOW, step by step ---------- */
function followSteps(G) {
  const F = computeFirst(G), FO = {}, state = {}, steps = [];
  const push = (msg, extra = {}) => steps.push(Object.assign({ msg, sets: snap(FO), first: snap(F) }, extra));
  const borrowed = [];
  function compute(B) {
    state[B] = 'busy'; FO[B] = FO[B] || new Set();
    push(`Find <b>FOLLOW(${B})</b>. FOLLOW(${B}) = the terminals that can come <b>right after</b> ${B}.`, { focus: B });
    if (B === G.start) {
      FO[B].add('$');
      push(`${B} is the <b>start symbol</b>. Rule 1: always put <b>$</b> (end of input) in FOLLOW(${B}).`, { focus: B, added: [B, ['$']] });
    }
    const occ = [];
    for (const A of G.order) G.rules[A].forEach((alt, ai) => alt.forEach((s, p) => { if (s === B) occ.push([A, ai, p]); }));
    if (!occ.length) push(`${B} does not appear on any right side. Nothing more to add.`, { focus: B });
    else push(`Search every right side for <code>${B}</code>. It appears ${occ.length} time${occ.length > 1 ? 's' : ''}. We check each place.`, { focus: B, occ });
    for (const [A, ai, p] of occ) {
      const alt = G.rules[A][ai];
      for (let j = p + 1; ; j++) {
        const where = { focus: B, alt: [A, ai], sym: p, look: j };
        if (j === alt.length) {
          const tail = j === p + 1 ? 'Nothing comes after' : 'Everything after';
          const tail2 = j === p + 1 ? '' : ' can be empty, so it is as if nothing comes after';
          if (A === B) { push(`In <code>${A} → ${fmt(alt)}</code>: ${tail} ${B}${tail2}. Rule 3 says add FOLLOW(${A}). But ${A} is ${B} itself, so this adds nothing new. Skip.`, where); break; }
          if (state[A] !== 'done') {
            if (state[A] === 'busy') {
              borrowed.push([B, A]);
              push(`In <code>${A} → ${fmt(alt)}</code>: ${tail} ${B}${tail2}. We need FOLLOW(${A}), but we are still working on it. Take what it has <b>now</b> and re-check at the end.`, where);
            } else {
              push(`In <code>${A} → ${fmt(alt)}</code>: ${tail} ${B}${tail2}. Rule 3: add FOLLOW(${A}). We do not have FOLLOW(${A}) yet. <b>Pause ${B}</b> and solve ${A} first.`, where);
              compute(A);
              push(`FOLLOW(${A}) is ready. <b>Go back</b> to ${B}.`, where);
            }
          }
          const add = [...FO[A]]; add.forEach(x => FO[B].add(x));
          push(`In <code>${A} → ${fmt(alt)}</code>: ${tail} ${B}${tail2}. <b>Rule 3:</b> whatever follows the parent ${A} also follows ${B}. Add FOLLOW(${A}) = ${setStr(FO[A])}.`, Object.assign({ added: [B, add] }, where));
          break;
        }
        const X = alt[j];
        if (!isNT(G, X)) {
          FO[B].add(X);
          push(`In <code>${A} → ${fmt(alt)}</code>: right after ${j === p + 1 ? B : 'that'} comes <code>${X}</code>, a <b>terminal</b>. <b>Add ${X}</b>. Stop.`, Object.assign({ added: [B, [X]] }, where));
          break;
        }
        const add = [...F[X]].filter(x => x !== EPS); add.forEach(x => FO[B].add(x));
        if (!F[X].has(EPS)) {
          push(`In <code>${A} → ${fmt(alt)}</code>: right after ${j === p + 1 ? B : 'that'} comes <code>${X}</code>, a <b>non-terminal</b>. <b>Rule 2:</b> add FIRST(${X}) without ε = ${setStr(add)}. ${X} cannot be empty, so stop.`, Object.assign({ added: [B, add] }, where));
          break;
        }
        push(`In <code>${A} → ${fmt(alt)}</code>: right after ${j === p + 1 ? B : 'that'} comes <code>${X}</code>. Add FIRST(${X}) without ε = ${setStr(add)}. But ${X} <b>can be empty</b> (ε in FIRST(${X})). So look one more symbol to the right.`, Object.assign({ added: [B, add] }, where));
      }
    }
    state[B] = 'done';
    push(`<b>FOLLOW(${B}) = ${setStr(FO[B])}</b> is complete.`, { focus: B, complete: B });
  }
  for (const A of G.order) if (state[A] !== 'done') compute(A);
  const real = computeFollow(G, F);
  for (const A of G.order) {
    const miss = [...real[A]].filter(x => !FO[A].has(x));
    if (miss.length) {
      miss.forEach(x => FO[A].add(x));
      push(`<b>Re-check.</b> FOLLOW(${A}) borrowed a set that grew later. Add the missing ${setStr(miss)}.`, { focus: A, added: [A, miss] });
    }
  }
  push(`All FOLLOW sets are complete. Check: FOLLOW never contains ε, and the start symbol has $.`, { final: true });
  return steps;
}

/* ---------- LL(1) table, step by step ---------- */
function tableSteps(G) {
  const F = computeFirst(G), FO = computeFollow(G, F), M = {}, steps = [];
  const cols = [...G.terms, '$'];
  const key = (A, a) => A + '\u0000' + a;
  const snapM = () => { const o = {}; for (const k in M) o[k] = M[k].map(e => Object.assign({}, e)); return o; };
  const push = (msg, extra = {}) => steps.push(Object.assign({ msg, M: snapM(), cols, F, FO }, extra));
  let conflicts = [];
  push(`Draw the table. <b>Rows</b> = non-terminals (${G.order.join(', ')}). <b>Columns</b> = terminals + $ (${cols.join(' ')}). ε is <b>never</b> a column. We fill it rule by rule.`, {});
  for (const r of G.numbered) {
    const f = firstOfSeq(G, r.rhs, F);
    const firsts = [...f].filter(x => x !== EPS);
    const how = !r.rhs.length ? `The right side is ε, so FIRST(ε) = { ε }.`
      : `FIRST(${fmt(r.rhs)}) = ${setStr(f)}.`;
    push(`<b>Rule ${r.n}: <code>${r.lhs} → ${fmt(r.rhs)}</code>.</b> ${how}`, { rule: r.n });
    const put = (a, via) => {
      const k = key(r.lhs, a);
      M[k] = M[k] || [];
      M[k].push({ n: r.n, lhs: r.lhs, rhs: r.rhs, via });
      const c = M[k].length > 1;
      if (c) conflicts.push([r.lhs, a, M[k].map(e => e.n)]);
      push(c ? `Put rule ${r.n} in <b>M[${r.lhs}, ${a}]</b>. <b class="bad">Conflict!</b> This cell already has rule ${M[k][0].n}. Two rules in one cell means the parser cannot choose.`
        : `${via === 'first' ? `${a} is in FIRST` : `${a} is in FOLLOW(${r.lhs})`} → put rule ${r.n} in <b>M[${r.lhs}, ${a}]</b>.`, { rule: r.n, cell: [r.lhs, a], conflict: c });
    };
    firsts.forEach(a => put(a, 'first'));
    if (f.has(EPS)) {
      push(`ε is in FIRST(${fmt(r.rhs)}): this rule can make ${r.lhs} disappear. So use <b>FOLLOW(${r.lhs}) = ${setStr(FO[r.lhs])}</b> for the columns.`, { rule: r.n });
      [...FO[r.lhs]].forEach(a => put(a, 'follow'));
    }
  }
  push(`Every empty cell means <b>error</b>. (You can write "error" or leave it blank.)`, { blanks: true });
  if (!conflicts.length) push(`<b>No cell has more than one rule ∴ the grammar is LL(1).</b>`, { final: true, ok: true });
  else {
    const c = conflicts[0], cell = M[key(c[0], c[1])];
    const type = cell.some(e => e.via === 'follow') ? 'FIRST/FOLLOW' : 'FIRST/FIRST';
    push(`<b class="bad">Cell M[${c[0]}, ${c[1]}] has rules ${c[2].join(' and ')} ∴ the grammar is NOT LL(1)</b> (${type} conflict).`, { final: true, ok: false, cell: [c[0], c[1]], conflict: true });
  }
  return steps;
}

function buildTable(G) {
  const F = computeFirst(G), FO = computeFollow(G, F), M = {};
  for (const r of G.numbered) {
    const f = firstOfSeq(G, r.rhs, F);
    const keys = [...f].filter(x => x !== EPS);
    if (f.has(EPS)) keys.push(...FO[r.lhs]);
    for (const a of keys) (M[r.lhs + '\u0000' + a] = M[r.lhs + '\u0000' + a] || []).push(r);
  }
  return { F, FO, M };
}

/* ---------- LL(1) parse, step by step (stack, buffer, tree) ---------- */
function parseSteps(G, input) {
  const { M } = buildTable(G);
  const toks = input.trim().split(/\s+/).filter(Boolean);
  const buf = [...toks, '$'];
  const cells = []; let popN = 0;
  const nodes = [];
  const mk = (label, parent) => { const id = nodes.length; nodes.push({ id, label, parent, kids: [], born: null, matched: false }); if (parent != null) nodes[parent].kids.push(id); return id; };
  const stack = []; // {sym, cell, node}
  const steps = [];
  let sn = 0;
  const push = (msg, extra = {}) => steps.push(Object.assign({
    msg, stack: stack.map(s => s.sym), la: i, buf, cells: cells.map(c => Object.assign({}, c)),
    nodes: nodes.map(n => Object.assign({}, n, { kids: [...n.kids] })), n: sn
  }, extra));
  let i = 0;
  const pushSym = (sym, node) => { const cell = cells.length; cells.push({ sym, pop: null, born: sn }); stack.push({ sym, cell, node }); };
  push(`Write the input in the <b>buffer</b> and add <b>$</b> at the end: <code>${buf.join(' ')}</code>. The <b>LA</b> (look-ahead) arrow points at the first token, <code>${buf[0]}</code>.`, { phase: 'setup' });
  sn++; pushSym('$', null);
  push(`<b>Push $</b> on the stack first. $ marks the bottom of the stack.`, { phase: 'setup' });
  sn++; const root = mk(G.start, null); nodes[root].born = sn; pushSym(G.start, root);
  push(`<b>Push the start symbol ${G.start}</b>. The top of the stack is the <b>right end</b>. ${G.start} is also the root of the parse tree.`, { phase: 'setup' });
  let guard = 0;
  while (guard++ < 500) {
    const top = stack[stack.length - 1], a = buf[i];
    sn++;
    if (top.sym === '$' && a === '$') {
      cells[top.cell].pop = ++popN;
      push(`Top = <b>$</b> and LA = <b>$</b>. Both are at the end at the same time. <b>Accept.</b> The string is syntactically correct.`, { accept: true, act: 'accept' });
      return { steps, ok: true };
    }
    if (!isNT(G, top.sym)) {
      if (top.sym === a) {
        stack.pop(); cells[top.cell].pop = ++popN; if (top.node != null) nodes[top.node].matched = true;
        i++;
        push(`Top = <code>${a}</code> is a <b>terminal</b> and it equals LA = <code>${a}</code>. <b>Match:</b> pop it and move LA to <code>${buf[i]}</code>.`, { act: 'match', tok: a });
        continue;
      }
      if (top.sym === '$') {
        push(`The stack is down to <b>$</b> (nothing left to match), but the input still has <code>${a}</code>. <b class="bad">Error.</b> Extra input: the string is NOT accepted.`, { error: true, act: 'error' });
        return { steps, ok: false };
      }
      push(`Top = <code>${top.sym}</code> is a terminal, but LA = <code>${a}</code>. They are <b>different</b>. <b class="bad">Error.</b> The parser stops: the string is NOT accepted.`, { error: true, act: 'error' });
      return { steps, ok: false };
    }
    const rs = M[top.sym + '\u0000' + a];
    if (!rs || !rs.length) {
      const why = (a !== '$' && !G.terms.includes(a)) ? ` (<code>${a}</code> is not even a terminal of this grammar)` : '';
      push(`Top = <code>${top.sym}</code>, LA = <code>${a}</code>. Look up <b>M[${top.sym}, ${a}]</b>: it is <b>empty</b>${why}. <b class="bad">Error.</b> The string is NOT accepted.`, { error: true, act: 'error', look: [top.sym, a] });
      return { steps, ok: false };
    }
    const r = rs[0];
    stack.pop(); cells[top.cell].pop = ++popN; cells[top.cell].rule = `${top.sym} → ${fmt(r.rhs)}`;
    const kids = r.rhs.length ? r.rhs.map(s => mk(s, top.node)) : [mk(EPS, top.node)];
    kids.forEach(k => nodes[k].born = sn);
    if (!r.rhs.length) {
      push(`Top = <code>${top.sym}</code> (non-terminal), LA = <code>${a}</code>. M[${top.sym}, ${a}] = <b>${top.sym} → ε</b>. Pop ${top.sym} and push <b>nothing</b> (ε means empty). LA stays at <code>${a}</code>.`, { act: 'expand', rule: r.n, look: [top.sym, a], ruleTxt: `${top.sym} → ε` });
    } else {
      for (let k = r.rhs.length - 1; k >= 0; k--) pushSym(r.rhs[k], kids[k]);
      push(`Top = <code>${top.sym}</code> (non-terminal), LA = <code>${a}</code>. M[${top.sym}, ${a}] = <b>${top.sym} → ${fmt(r.rhs)}</b>. Pop ${top.sym}. Push the right side <b>reversed</b> (${[...r.rhs].reverse().join(', ')}), so <code>${r.rhs[0]}</code> ends on top.`, { act: 'expand', rule: r.n, look: [top.sym, a], ruleTxt: `${top.sym} → ${fmt(r.rhs)}` });
    }
  }
  return { steps, ok: false };
}

/* ---------- Left factoring (NDG -> DG), step by step ---------- */
function cloneRules(R) { const o = {}; for (const k in R) o[k] = R[k].map(a => [...a]); return o; }
function primeName(base, used) { let n = base + "'"; while (used.includes(n)) n += "'"; return n; }

function leftFactorSteps(G) {
  let order = [...G.order], R = cloneRules(G.rules);
  const steps = [];
  const push = (msg, extra = {}) => steps.push(Object.assign({ msg, order: [...order], R: cloneRules(R) }, extra));
  push(`Start. A grammar is <b>non-deterministic</b> when two alternatives of the same non-terminal start with the same symbol. The parser then cannot choose with one look-ahead. Check each non-terminal from the top.`);
  const queue = [...order];
  while (queue.length) {
    const A = queue.shift();
    for (;;) {
      const groups = new Map();
      R[A].forEach((alt, i) => { const h = alt.length ? alt[0] : EPS; if (!groups.has(h)) groups.set(h, []); groups.get(h).push(i); });
      const g = [...groups.entries()].find(([h, ix]) => h !== EPS && ix.length > 1);
      if (!g) { push(`<code>${A}</code>: no two alternatives start with the same symbol. ${A} is <b>deterministic</b>. Keep it.`, { focus: A }); break; }
      const ix = g[1], alts = ix.map(k => R[A][k]);
      let p = 0; while (alts.every(a => p < a.length && a[p] === alts[0][p])) p++;
      const pre = alts[0].slice(0, p);
      push(`<code>${A}</code>: alternatives ${alts.map(a => `<code>${fmt(a)}</code>`).join(', ')} all start with <b><code>${pre.join(' ')}</code></b>. This is the common part (the longest prefix they share).`, { focus: A, hl: [A, ix] });
      const N = primeName(A, order);
      const suff = alts.map(a => a.slice(p));
      const newAlts = []; R[A].forEach((alt, k) => { if (k === ix[0]) newAlts.push([...pre, N]); else if (!ix.includes(k)) newAlts.push(alt); });
      R[A] = newAlts; R[N] = suff;
      order.splice(order.indexOf(A) + 1 + order.slice(order.indexOf(A) + 1).filter(x => x.startsWith(A + "'")).length, 0, N);
      push(`Take the common part out <b>once</b>: <code>${A} → ${pre.join(' ')} ${N}</code>. The new non-terminal <code>${N}</code> gets what was left after the prefix: ${suff.map(s => `<code>${fmt(s)}</code>`).join(' | ')}. ${suff.some(s => !s.length) ? 'An alternative that was <b>only</b> the prefix leaves nothing, so it becomes <b>ε</b>.' : ''}`, { focus: A, newNT: N });
      queue.unshift(N);
    }
  }
  push(`<b>Final result.</b> No non-terminal has two alternatives with the same first symbol. The grammar is now deterministic (DG).`, { final: true });
  return steps;
}

/* ---------- Left recursion (LRG -> RRG), step by step ---------- */
function leftRecSteps(G) {
  const base = [...G.order];
  let order = [...G.order], R = cloneRules(G.rules);
  const steps = [];
  const push = (msg, extra = {}) => steps.push(Object.assign({ msg, order: [...order], R: cloneRules(R) }, extra));
  push(`Start. A rule is <b>left recursive</b> when a non-terminal is the first symbol of its own right side: <code>A → A α</code>. Work top to bottom in the order ${base.join(', ')}.`);
  for (let i = 0; i < base.length; i++) {
    const Ai = base[i];
    for (let j = 0; j < i; j++) {
      const Aj = base[j];
      if (!R[Ai].some(a => a[0] === Aj)) continue;
      const before = R[Ai].map(a => [...a]);
      const hit = before.map((a, k) => a[0] === Aj ? k : -1).filter(k => k >= 0);
      push(`<code>${Ai}</code> has ${hit.map(k => `<code>${Ai} → ${fmt(before[k])}</code>`).join(', ')}: it starts with <code>${Aj}</code>, a non-terminal we already fixed. Hidden left recursion can come through ${Aj}. So <b>substitute</b> ${Aj}'s current rules in its place.`, { focus: Ai, hl: [Ai, hit] });
      const out = [];
      for (const a of R[Ai]) if (a[0] === Aj) for (const b of R[Aj]) out.push([...b, ...a.slice(1)]); else out.push(a);
      R[Ai] = out;
      push(`After substitution: <code>${Ai} → ${R[Ai].map(fmt).join(' | ')}</code>.`, { focus: Ai });
    }
    const alpha = R[Ai].filter(a => a[0] === Ai).map(a => a.slice(1));
    const beta = R[Ai].filter(a => a[0] !== Ai);
    if (!alpha.length) { push(`<code>${Ai}</code> has no direct left recursion (no alternative starts with ${Ai}). Keep it.`, { focus: Ai }); continue; }
    const hit = R[Ai].map((a, k) => a[0] === Ai ? k : -1).filter(k => k >= 0);
    push(`<code>${Ai}</code> has <b>direct left recursion</b>. Match the pattern <code>A → A α | β</code>:<br>α (what comes after ${Ai}) = ${alpha.map(a => `<code>${fmt(a)}</code>`).join(', ')}<br>β (alternatives that do NOT start with ${Ai}) = ${beta.map(b => `<code>${fmt(b)}</code>`).join(', ') || '<i>none</i>'}`, { focus: Ai, hl: [Ai, hit] });
    const N = primeName(Ai, order);
    R[Ai] = beta.length ? beta.map(b => [...b, N]) : [[N]];
    R[N] = [...alpha.map(a => [...a, N]), []];
    order.splice(order.indexOf(Ai) + 1, 0, N);
    push(`Apply the formula: <code>${Ai} → β ${N}</code> and <code>${N} → α ${N} | ε</code>.<br>So <code>${Ai} → ${R[Ai].map(fmt).join(' | ')}</code><br>and <code>${N} → ${R[N].map(fmt).join(' | ')}</code>.`, { focus: Ai, newNT: N });
  }
  push(`<b>Final result.</b> No rule starts with its own non-terminal. The grammar is right recursive (RRG) and makes the same strings.`, { final: true });
  return steps;
}

if (typeof module !== 'undefined') module.exports = { parseGrammar, computeFirst, computeFollow, firstSteps, followSteps, tableSteps, parseSteps, leftFactorSteps, leftRecSteps, buildTable, fmt, EPS };
