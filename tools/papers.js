/* Build papers.html (all past papers, solved) and a question PDF + solved PDF per paper.
   Usage: node tools/papers.js [--no-pdf] */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const { PAPERS } = require('./papers-data.js');

const tokens = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8').split('*{box-sizing')[0];
const CSS = tokens + `
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--sans)}
code{font-family:var(--mono);font-size:.92em;background:var(--soft);border:1px solid var(--line);padding:0 4px;border-radius:3px}
a{color:var(--teal)}
.small{font-size:.86rem;color:var(--muted)}
.bad{color:var(--clay)}
.sheet{max-width:860px;margin:0 auto;padding:0 16px}
.sh-head{border:1.5px solid var(--ink);padding:10px 14px;text-align:center;margin:18px 0}
.sh-head b{display:block;font-size:1rem}
.sh-head div{font-size:.9rem}
.sh-head .small{margin-top:2px}
h2.sec{font:700 1.15rem var(--sans);color:var(--teal);border-bottom:2px solid var(--teal);padding-bottom:4px;margin:26px 0 12px}
h3.part{font:700 .98rem var(--sans);margin:18px 0 8px}
.qb{background:var(--soft);border-left:4px solid var(--rose);padding:10px 14px;margin:10px 0;border-radius:0 4px 4px 0}
.qh{display:flex;gap:12px;justify-content:space-between;align-items:flex-start}
.qh .mk{font-weight:700;white-space:nowrap}
.gbox{font:14px/1.7 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere;border:1.5px dashed var(--muted);background:var(--card);padding:6px 12px;margin:8px 0;display:inline-block;max-width:100%;overflow-x:auto}
.ans{border:1px solid var(--line);border-left:4px solid var(--teal);background:var(--card);border-radius:0 4px 4px 0;padding:10px 14px;margin:10px 0 18px}
.ah{font:700 1rem var(--sans);color:var(--teal);margin-bottom:6px}
.wt{display:inline-block;font:700 11px var(--mono);letter-spacing:.06em;background:var(--teal);color:var(--card);padding:2px 8px;border-radius:3px;margin-bottom:6px}
.ans h4{font:700 .92rem var(--sans);margin:14px 0 6px}
.ts{overflow-x:auto;max-width:100%}
table.t{border-collapse:collapse;font-size:.88rem;margin:6px 0}
table.t th,table.t td{border:1px solid var(--line);padding:4px 9px;text-align:center;font-family:var(--mono);font-size:.84rem}
table.t thead th{background:var(--soft)}
table.t td.bad{background:var(--clay-t);color:var(--clay);font-weight:700}
table.t td:last-child{text-align:left}
table.ll td:last-child{text-align:center}
.concl{font-weight:500}
.concl.bad{color:var(--clay)}
.lose{border-left:4px solid var(--clay);background:var(--clay-t);padding:6px 12px;margin:10px 0 0;font-size:.88rem;border-radius:0 4px 4px 0}
.labels{background:var(--soft);border:1px solid var(--line);border-radius:4px;padding:8px 12px;margin:8px 0;font-size:.86rem}
.labels .lh{font-weight:700;margin-bottom:4px}
.labels ol{list-style:none;margin:0;padding:0;columns:2;column-gap:24px}
.labels li{break-inside:avoid;font-family:var(--mono);font-size:.8rem;line-height:1.6}
svg text{font-family:var(--mono);text-anchor:middle}
svg.hstack rect{fill:var(--card);stroke:var(--ink);stroke-width:1.2}
svg.hstack rect.cerr{fill:var(--clay-t);stroke:var(--clay)}
svg.hstack .sym{font-size:13px;font-weight:700;fill:var(--ink)}
svg.hstack .x{stroke:var(--clay);stroke-width:1.2}
svg.hstack .pop{font-size:12px;font-weight:700;fill:var(--clay)}
svg.hstack .epsm{font-size:10px;fill:var(--clay)}
svg.hstack .br{fill:none;stroke:var(--muted);stroke-width:1}
svg.hstack .brl{font-size:10px;fill:var(--ink)}
svg.tree line{stroke:var(--muted);stroke-width:1.2}
svg.tree text{font-size:14px;dominant-baseline:middle}
svg.tree .nt{fill:var(--teal);font-weight:700}
svg.tree .t{fill:var(--ink);font-weight:700}
svg.tree .e{fill:var(--muted)}
.trees{display:flex;flex-wrap:wrap;gap:16px}
.trees figure{margin:4px 0;border:1px solid var(--line);border-radius:4px;padding:6px 10px;max-width:100%;overflow-x:auto}
.trees figcaption{font-size:.8rem;color:var(--muted)}
ol.tfq{margin:6px 0 0;padding-left:28px}ol.tfq li{margin:5px 0}.tfb{font:700 12px var(--mono);color:var(--muted);white-space:nowrap;margin-left:6px}
.tftab table.t td{text-align:left;font-family:var(--sans);font-size:.85rem}.tftab table.t td:nth-child(1),.tftab table.t td:nth-child(3){text-align:center}
details.rough{margin:10px 0 0;font-size:.85rem}
details.rough summary{cursor:pointer;color:var(--muted)}
details.rough ul{margin:6px 0;padding-left:18px}
details.rough li{font-family:var(--mono);font-size:.78rem;margin:3px 0}
`;

const SITE_CSS = `
.bar{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line)}
.bar .in{max-width:860px;margin:0 auto;padding:8px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bar b{font:700 14px var(--mono);margin-right:auto}
.btn{font:600 13px var(--sans);border:1px solid var(--line);background:var(--soft);color:var(--ink);padding:6px 12px;border-radius:4px;cursor:pointer;text-decoration:none;display:inline-block}
.btn.pri{background:var(--teal);color:var(--card);border-color:var(--teal)}
.intro{margin:18px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:12px 0 8px}
.pc{border:1px solid var(--line);background:var(--card);border-radius:5px;padding:10px 12px}
.pc .k{font:11px var(--mono);color:var(--rose);text-transform:lowercase}
.pc .nm{font-weight:700;margin:2px 0}
.pc .meta{font-size:.82rem;color:var(--muted);margin-bottom:8px}
.pc .row{display:flex;flex-wrap:wrap;gap:6px}
.pc .row a{font-size:12px;padding:4px 8px}
section.paper{border-top:3px double var(--line);margin-top:30px;padding-top:4px}
details.ansd{margin:4px 0 16px}
details.ansd>summary{cursor:pointer;font:600 13px var(--sans);color:var(--teal);padding:4px 0}
.tools{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.theme{position:fixed;right:14px;bottom:14px;z-index:6}
@media (max-width:560px){.labels ol{columns:1}}
`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function questionHTML(p) {
  return p.blocks.map(b => b.h ? `<h3 class="part">${b.h}</h3>` :
    `<div class="qb" id="${p.id}-q${b.sec}${b.n}"><div class="qh"><span><b>${b.n}.</b> ${b.q}</span><span class="mk">${b.marks !== '' ? `[${b.marks}]` : ''}</span></div>${b.g ? require('./sheet.js').gbox(b.g) : ''}</div>`).join('\n');
}
function answerHTML(p, b) {
  const lbl = b.label || (b.secName === 'Quiz' ? 'Quiz Answer ' : 'Answer ') + b.n + (b.marks !== '' ? ` [${b.marks}]` : '');
  return `<div class="ans"><div class="ah">${lbl}</div><span class="wt">WRITE THIS</span>${b.html}${b.lose ? `<p class="lose"><b>Lose marks by:</b> ${b.lose}</p>` : ''}</div>`;
}
function prepare(p) {
  let sec = 'Mid';
  for (const b of p.blocks) {
    if (b.h) { sec = /quiz/i.test(b.h) ? 'Quiz' : /extra/i.test(b.h) ? 'Extra' : 'Mid'; continue; }
    b.secName = sec; b.sec = sec[0].toLowerCase(); b.html = b.ans();
  }
}
const headHTML = p => `<div class="sh-head"><b>${p.head[0]}</b><div>${p.head[1]}</div>${p.head[2] ? `<div class="small">${p.head[2]}</div>` : ''}</div>`;

function doc(title, body, extraCss = '', theme = '') {
  return `<!doctype html>\n<html lang="en"${theme ? ` data-theme="${theme}"` : ''}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>${CSS}${extraCss}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

PAPERS.forEach(prepare);

/* ---------- PDFs ---------- */
const pdfDir = path.join(root, 'pdf'), tmp = path.join(root, 'dist/pdf-src');
fs.mkdirSync(pdfDir, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const PRINT = '@page{size:A4;margin:12mm 11mm}body{font-size:13px}.qb,.ans h4,.trees figure,.labels,table.t,svg{break-inside:avoid}.ans{break-inside:auto}h2.sec,.ans h4,.ans p{break-after:avoid}';
for (const p of PAPERS) {
  const qs = `<div class="sheet">${headHTML(p)}<h2 class="sec">Question paper</h2>${questionHTML(p)}</div>`;
  const ans = p.blocks.filter(b => !b.h).map(b => answerHTML(p, b)).join('\n').replace(/<details class="rough">/g, '<details class="rough" open>');
  const solved = `<div class="sheet">${headHTML(p)}<h2 class="sec">Question paper</h2>${questionHTML(p)}<h2 class="sec" style="break-before:page">Answers (exam layout, with comments)</h2>${ans}</div>`;
  fs.writeFileSync(path.join(tmp, `${p.id}-questions.html`), doc(`${p.short} questions`, qs, PRINT, 'light'));
  fs.writeFileSync(path.join(tmp, `${p.id}-solved.html`), doc(`${p.short} solved`, solved, PRINT, 'light'));
}
if (!process.argv.includes('--no-pdf')) {
  const chrome = ['/usr/bin/chromium', '/usr/bin/google-chrome-stable'].find(f => fs.existsSync(f));
  for (const f of fs.readdirSync(tmp).filter(f => f.endsWith('.html'))) {
    execFileSync(chrome, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${path.join(pdfDir, f.replace('.html', '.pdf'))}`, 'file://' + path.join(tmp, f)], { stdio: 'ignore' });
  }
}

/* ---------- papers.html ---------- */
const cards = PAPERS.map(p => `<div class="pc"><div class="k">${p.kind}</div><div class="nm">${p.short}</div><div class="meta">${p.id === 'truefalse' ? (p.blocks.map(b => b.q).join('').match(/<li>/g) || []).length + ' statements · 4 tiers, most important first' : (n => n + (n === 1 ? ' question' : ' questions'))(p.blocks.filter(b => !b.h).length)}${p.total !== '-' ? ` · total ${p.total} · ${p.time}` : (p.id === 'truefalse' ? '' : ' · practice sheet')}</div><div class="row"><a class="btn pri" href="#p-${p.id}">open</a><a class="btn" href="pdf/${p.id}-questions.pdf" target="_blank">question pdf</a><a class="btn" href="pdf/${p.id}-solved.pdf" target="_blank">solved pdf</a></div></div>`).join('');
const sections = PAPERS.map(p => `<section class="paper" id="p-${p.id}">${headHTML(p)}
<div class="tools"><a class="btn" href="pdf/${p.id}-questions.pdf" target="_blank">question pdf</a><a class="btn" href="pdf/${p.id}-solved.pdf" target="_blank">solved pdf (with comments)</a><button class="btn" data-open="${p.id}">show all answers</button><a class="btn" href="#top">back to list</a></div>
${p.blocks.map(b => b.h ? `<h3 class="part">${b.h}</h3>` : `<div class="qb"><div class="qh"><span><b>${b.n}.</b> ${b.q}</span><span class="mk">${b.marks !== '' ? `[${b.marks}]` : ''}</span></div>${b.g ? require('./sheet.js').gbox(b.g) : ''}</div><details class="ansd" data-p="${p.id}"><summary>Show model answer ${b.n}</summary>${answerHTML(p, b)}</details>`).join('\n')}
</section>`).join('\n');
const body = `<div class="bar" id="top"><div class="in"><b>cse313 · past papers</b><a class="btn" href="index.html">← stepper</a><a class="btn" href="#list">paper list</a></div></div>
<div class="sheet">
<div class="intro" id="list"><h1 style="margin:6px 0">Past papers, solved</h1>
<p>Every past paper and quiz you have, plus three new practice sets in the same shape. Each answer is in the faculty layout: FIRST/FOLLOW table, LL(1) table, horizontal stack with pop numbers, step labels and the parse tree.</p>
<p><b>How to use:</b> download the <b>question pdf</b>, solve it on paper with a timer, then open the <b>solved pdf</b> (or "Show model answer") and mark yourself. The solved pdf has comments: the rough work and the ways to lose marks.</p>
<p class="small">Every LL(1) table, parse and conversion here is computed by the same engine as the stepper. The ambiguity claims of the new sets are checked by tools/verify_papers.py.</p></div>
<div class="grid">${cards}</div>
${sections}
</div>
<button class="btn theme" id="theme">theme</button>
<script>
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const d=[...document.querySelectorAll('details.ansd[data-p="'+b.dataset.open+'"]')];const o=!d.every(x=>x.open);d.forEach(x=>x.open=o);b.textContent=o?'hide all answers':'show all answers';});
document.getElementById('theme').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';};
</script>`;
fs.writeFileSync(path.join(root, 'papers.html'), doc('CSE313 Past Papers', body, SITE_CSS));
console.log('papers.html + ' + fs.readdirSync(pdfDir).length + ' pdfs');
