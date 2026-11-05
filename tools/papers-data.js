/* Every past paper (and the new practice sets) with answers in the exam layout. */
const S = require('./sheet.js');
const { gbox, glines, ll1Answer, parseBlock, lfAnswer, lrAnswer, twoLMD, oneLMD, table, tf, G } = S;
const IUB = 'Independent University, Bangladesh';
const FAC = 'Since for the string <code>%s</code> there exists more than one leftmost derivation parse tree, the grammar is ambiguous.';
const fac = s => FAC.replace('%s', s);

const PAPERS = [
/* ------------------------------------------------------------------ */
{ id: 'aut23', kind: 'past paper', short: 'Mid Autumn-23 SET-A', time: '1h30m', total: '20 + 10',
  head: [IUB, 'CSE-313 Mid + Quiz Exam, Autumn-23, SET-A · Time: 1h30m', 'Real paper from this course. Quiz questions are on the other side of the paper.'],
  blocks: [
  { h: 'Mid Question (Total marks: 20)' },
  { n: 1, marks: 7, q: 'Prove whether the following Grammar is Ambiguous or NOT. If the following grammar is ambiguous, convert it to unambiguous form.',
    g: 'E -> E @ S | S\nS -> S # B | B\nB -> C ~ B | C\nC -> C ? A | E\nA -> a',
    ans: () => `<p class="small">The last rule is printed as <code>C → C ? A | E</code>. With E there, C can never finish with only terminals, so the grammar makes no strings. Treat it as a typo for ε and write that assumption.</p>
<p><b>[Assuming the last rule is C → C ? A | ε]</b></p>
<p>Check every rule for the ambiguity shape X → X op X (the same non-terminal on <b>both</b> sides of one operator):</p>
${table(['Rule', 'Recursion'], [['E → E @ S', 'left only'], ['S → S # B', 'left only'], ['B → C ~ B', 'right only'], ['C → C ? A', 'left only']])}
<p>Each operator is in exactly one rule at one level, so its precedence and associativity are fixed. Example, the string <code>? a # ? a</code>: at every step only one rule fits.</p>
${oneLMD('E', ['E', 'S', 'B', 'C', 'A'], ['S', 'S # B', 'B', 'C', 'C ? A', 'ε', 'a', 'C', 'C ? A', 'ε', 'a'])}
<p class="concl">Every string has exactly one leftmost derivation parse tree ∴ the grammar is <b>NOT ambiguous</b>. No conversion is needed.</p>
${table(['Operator', 'Precedence', 'Associativity'], [['@', '1 (lowest)', 'left (E → E @ S)'], ['#', '2', 'left (S → S # B)'], ['~', '3', 'right (B → C ~ B)'], ['?', '4 (highest)', 'left (C → C ? A)']])}`,
    lose: 'saying "ambiguous" just because there are many operators; not writing the typo assumption; no precedence table.' },
  { n: 2, marks: 8, q: 'Write the First() and Follow() of the following Grammar. Draw LL(1) Parsing Table and Parse the string <code>( ) g c c d c e</code> showing all steps. If parsing is not possible, point out the reasons. Here, V = {E, U, V, W, X, Y}, T = {c, d, e, (, ), g, ε}, and S = {E}',
    g: 'E -> c U V W | X Y E\nU -> c | ε\nV -> d U | ε\nW -> e | ε\nX -> e | ( Y )\nY -> g | ε',
    ans: () => ll1Answer('E -> c U V W | X Y E\nU -> c | ε\nV -> d U | ε\nW -> e | ε\nX -> e | ( Y )\nY -> g | ε', ['( ) g c c d c e']),
    lose: 'forgetting that U, V, W can all be ε (so FOLLOW(U) gets FOLLOW(E)); putting ε rules under FIRST instead of FOLLOW.' },
  { n: 3, marks: 5, q: 'Find True/ False of the following statements:<br>(a) All TDP can use Left Recursive Grammar (LRG).<br>(b) All TDP can use Non-deterministic Grammar (NDG).<br>(c) From LRG grammar complete First set can\'t be found.<br>(d) From LRG grammar complete Follow set can\'t be found.<br>(e) Brute Force Parser is a BUP.',
    ans: () => tf([['a', 'False', 'Left recursion makes a top-down parser loop forever (A ⇒ Aα ⇒ Aαα …).'], ['b', 'False', 'Predictive parsers (LL(1)) need a deterministic grammar. Only backtracking parsers cope with NDG, so not ALL TDP.'], ['c', 'False', 'For A → Aα | β, FIRST(A) = FIRST(β) (plus FIRST(α) if β can be ε). Only the naive recursive method loops.'], ['d', 'False', 'FOLLOW comes from where a symbol appears on right sides. Left recursion does not stop this.'], ['e', 'False', 'Brute force = top-down parsing with backtracking.']]) + '<p class="small">(c) and (d) are not settled by the slides. This is the textbook view. Always write the reason, so you earn marks either way.</p>' },
  { h: 'Quiz Question (Total marks: 10)' },
  { n: 1, marks: 5, q: 'Convert the following Non Deterministic Grammar (NDG) to Deterministic Grammar (DG):',
    g: 'S -> b a c d S | b a c P | b a Q | b a\nP -> c P | c\nQ -> a Q | a', ans: () => lfAnswer('S -> b a c d S | b a c P | b a Q | b a\nP -> c P | c\nQ -> a Q | a'),
    lose: 'stopping after one round (S\' still has two alternatives starting with c); forgetting the ε from the bare "ba"; leaving P and Q unfactored.' },
  { n: 2, marks: 5, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):',
    g: 'A -> A % B | B\nB -> B & C | C\nC -> C ^ 0 1 | a b c', ans: () => lrAnswer('A -> A % B | B\nB -> B & C | C\nC -> C ^ 0 1 | a b c'),
    lose: 'forgetting ε in the new rules; putting α first (A → αA\').' },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'sum23', kind: 'past paper', short: 'Mid Summer-23', time: '1h20m', total: '20',
  head: [IUB, 'CSE 313 (Compiler Construction) Midterm Summer 2023 · Sec: 1 · Total: 20 · Time: 1h20m', 'Instructor: Bijoy Rahman Arif. Answer all 4. Marks are after each question.'],
  blocks: [
  { n: 1, marks: 5, q: '[CO1] Consider the following grammar. Is the grammar Ambiguous? If so, find a string for which it is Ambiguous and finally, convert to Unambiguous grammar without changing the original Language. Find the Operator Precedence and Associativity of Unambiguous grammar. If the Unambiguous grammar is Left Recursive and/ or Non-deterministic, convert the grammar to Right Recursive and Deterministic as well.',
    g: 'S -> A @ S | A\nA -> A & B | B\nB -> B # B | B ~ C | C\nC -> i',
    ans: () => `<p>Yes, the grammar is ambiguous. <code>B → B # B</code> has B on both sides of #. String: <code>i # i # i</code>.</p>
${twoLMD('S', ['S', 'A', 'B', 'C'], ['A', 'B', 'B # B', 'C', 'i', 'B # B', 'C', 'i', 'C', 'i'], ['A', 'B', 'B # B', 'B # B', 'C', 'i', 'C', 'i', 'C', 'i'])}
<p>${fac('i # i # i')}</p>
<p><b>[Assuming ~ has higher precedence than #, and both # and ~ are left associative]</b></p>
<p><b>Unambiguous grammar</b> (same language, # and ~ get their own levels):</p>${gbox('S -> A @ S | A\nA -> A & B | B\nB -> B # D | D\nD -> D ~ C | C\nC -> i')}
${table(['Operator', 'Precedence', 'Associativity', 'Why'], [['@', '1 (lowest)', 'right', 'S → A @ S'], ['&amp;', '2', 'left', 'A → A &amp; B'], ['#', '3', 'left', 'B → B # D'], ['~', '4 (highest)', 'left', 'D → D ~ C']])}
<p>It is left recursive (A, B, D) and non-deterministic (S → A @ S | A). Convert both.</p>
<h4>LRG → RRG</h4>${lrAnswer('S -> A @ S | A\nA -> A & B | B\nB -> B # D | D\nD -> D ~ C | C\nC -> i')}
<h4>NDG → DG</h4>${lfAnswer("S -> A @ S | A\nA -> B A'\nA' -> & B A' | ε\nB -> D B'\nB' -> # D B' | ε\nD -> C D'\nD' -> ~ C D' | ε\nC -> i")}`,
    lose: 'stopping after the unambiguous grammar (this question has four parts); "fixing" S → A @ S, which is already right recursive.' },
  { n: 2, marks: 5, q: '[CO3] Consider the following grammar, and try to parse the string <code>( ( ( (</code> using all the conversion and steps in LL(1) parsing. Where variable = { S } and terminal = { (, ϵ }. If parsing is not possible, point out why it is not possible.',
    g: 'S -> ( ( b\nS -> ε',
    ans: () => `<p><b>Conversions first.</b> Left recursion? No, S does not start with S. Non-determinism? No, only one alternative starts with a terminal. So no conversion is needed. b is not in the given terminal set; treat it as a terminal, as printed.</p>
${ll1Answer('S -> ( ( b | ε', ['( ( ( (']).replace('Step 3', 'Step 3')}
<p>Extra reason: the grammar makes only two strings, <code>((b</code> and ε, so <code>((((</code> can never be accepted.</p>
<h4>If the paper meant S → ( ( S | ε (b is a typo for S)</h4><p>Write this second reading too. It costs one minute and protects your marks.</p>${parseBlock(G('S -> ( ( S | ε'), '( ( ( (', 'Parse <code>( ( ( (</code> with S → ( ( S | ε')}`,
    lose: 'writing only "error". Write the top, the LA and why.' },
  { n: 3, marks: 5, q: '[CO3] An ambiguous grammar is Non-deterministic Grammar (NDG). After converting it to Deterministic Grammar it is still ambiguous. What is the reason behind this? Is it possible to prove: "Determinism does not change ambiguity of a grammar." Justify with reasonings.',
    ans: () => `<p>Take <code>E → E + E | E * E | id</code>. It is ambiguous, and it is an NDG (two alternatives start with E). Left factor it:</p>${gbox("E -> E E' | id\nE' -> + E | * E")}
<p>The string <code>id + id * id</code> still has two leftmost derivations:</p>
${twoLMD('E', ['E', "E'"], ["E E'", 'id', '+ E', "E E'", 'id', '* E', 'id'], ["E E'", "E E'", 'id', '+ E', 'id', '* E', 'id'])}
<p><b>Reason:</b> left factoring only removes common prefixes. It delays the choice between alternatives; it does not remove any alternative or any tree.</p>
<p><b>Proof (one-to-one mapping):</b> each use of A → αβᵢ in the old grammar becomes A → αA' then A' → βᵢ in the new one, and back. So each parse tree maps to exactly one parse tree, and every string keeps the same number of trees.</p>
<p class="concl">∴ Yes, it can be proved: determinism does not change ambiguity. To remove ambiguity you must restructure the grammar with precedence levels.</p>`,
    lose: 'giving only the claim with no example; no derivations for the factored grammar.' },
  { n: 4, marks: 5, q: '[CO1] Point out TRUE/ FALSE of the following statements:<br>(a) Left Recursive Grammar (LRG) can not be used in LL(1).<br>(b) Non-deterministic Grammar (NDG) can not be used in LL(1).<br>(c) Recursive Descent Parser (RDP) is as powerful as LL(1)<br>(d) Recursive Descent Parser (RDP) uses OS stack.<br>(e) Recursive Descent Parser (RDP) can use Non-deterministic Grammar (NDG).',
    ans: () => tf([['a', 'True', 'LL(1) is top-down; left recursion makes it loop and puts two rules in one cell.'], ['b', 'True', 'Two alternatives with the same prefix fall in the same cell (FIRST/FIRST conflict).'], ['c', 'False', 'RDP with backtracking can try every alternative, so it accepts grammars LL(1) cannot. More general, but slower.'], ['d', 'True', 'One procedure per non-terminal, called recursively, so it uses the program (OS) call stack.'], ['e', 'True', 'With backtracking it tries one alternative, and on failure goes back and tries the next.']]) },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'quiz01', kind: 'past quiz · faculty solution', short: 'Quiz 01 (Aut-2026)', time: '30 min', total: '15',
  head: [IUB, 'CSE-313 Quiz 01 Exam, Autumn-2026, Sec: 01 · Total Marks: 15 · Time: 30min', 'Your real quiz. The answers follow the faculty solution sheet.'],
  blocks: [
  { n: 1, marks: 7, q: 'Consider the context-free grammar below. Is the grammar ambiguous or not? Find out a string for which it is ambiguous and convert to unambiguous grammar.',
    g: 'L -> L ; L | L & L | id',
    ans: () => `<p>Yes, the grammar is ambiguous. String: <code>id ; id &amp; id</code></p>
${twoLMD('L', ['L'], ['L ; L', 'id', 'L & L', 'id', 'id'], ['L & L', 'L ; L', 'id', 'id', 'id'])}
<p>${fac('id ; id &amp; id')}</p>
<p><b>Conversion to unambiguous grammar:</b> <b>[Assuming &amp; has higher precedence than ; and both operators are left associative]</b></p>${gbox('L -> L ; M | M\nM -> M & T | T\nT -> id')}
<p><b>Alt ans</b> [Assuming ; has higher precedence than &amp; and both are left associative]:</p>${gbox('L -> L & M | M\nM -> M ; T | T\nT -> id')}`,
    lose: 'no string; two trees that are really the same; no assumption in brackets.' },
  { n: 2, marks: 4, q: 'Convert the following Non Deterministic Grammar (NDG) to Deterministic Grammar (DG):',
    g: 'S -> a b c A | a b c B | a b | a b d\nA -> e A | e g f\nB -> g f', ans: () => lfAnswer('S -> a b c A | a b c B | a b | a b d\nA -> e A | e g f\nB -> g f'),
    lose: 'missing the second round on S\'; forgetting to factor A.' },
  { n: 3, marks: 4, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):',
    g: 'A -> A a | B c | d\nB -> A e | C g h | g f\nC -> C a b | A c e | c d', ans: () => lrAnswer('A -> A a | B c | d\nB -> A e | C g h | g f\nC -> C a b | A c e | c d'),
    lose: 'missing the hidden (indirect) left recursion: B → A e and C → A c e must be substituted first.' },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'quiz02', kind: 'past quiz · LL(1)', short: 'Quiz 02 (LL(1))', time: '20 min', total: '15',
  head: [IUB, 'Compiler Quiz 02 (LL(1) Parsing) · Autumn 2026 · Total marks 15 · Time 20 min', ''],
  blocks: [
  { n: 1, marks: 15, q: 'Write the First() and Follow() of the following Grammar. Draw LL(1) Parsing Table and parse the string <code>int id , id ;</code> showing all steps. If parsing is not possible, point out the reasons. Here, Non-terminals = {D, T, L, L\'}, Terminals = {;, int, char, id, ,, ε}, and Start symbol = {D}.',
    g: "D -> T L ;\nT -> int | char\nL -> id L'\nL' -> , id L' | ε", ans: () => ll1Answer("D -> T L ;\nT -> int | char\nL -> id L'\nL' -> , id L' | ε", ['int id , id ;']),
    lose: 'FOLLOW(L\') must be { ; } (from L → id L\', it gets FOLLOW(L)); missing the L\' → ε entry under ;.' },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'pp02', kind: 'classroom practice', short: 'Practice problem 02', time: '-', total: '-',
  head: [IUB, 'CSE313 · Practice problem 02 (LL(1) Grammar) · Google Classroom', 'Q3 (Operator Precedence Parser) is a final-exam topic, so it is not solved here.'],
  blocks: [
  { n: 1, marks: '', q: 'Consider the grammar G with start symbol S, non-terminals {S, A, B}, terminals {a, b, c, d}. (a) Find FIRST(S), FIRST(A), FIRST(B). (b) Find FOLLOW(S), FOLLOW(A), FOLLOW(B). (c) Construct the parsing table, paying special attention to the ε-production. (d) Parse aaabbc. (e) Parse bbc.',
    g: 'S -> a A b\nA -> c B\nB -> d | ε', ans: () => ll1Answer('S -> a A b\nA -> c B\nB -> d | ε', ['a a a b b c', 'b b c']),
    lose: 'writing only "error". Write the top, the LA and the empty cell.' },
  { n: 2, marks: '', q: 'Consider the grammar G with start symbol S, non-terminals {S, A, B}, terminals {a, b, c}. (a) FIRST sets. (b) FOLLOW sets. (c) Parsing table. (d) Parse acdb.',
    g: 'S -> A B\nA -> a A | ε\nB -> b B | c', ans: () => ll1Answer('S -> A B\nA -> a A | ε\nB -> b B | c', ['a c d b']) + '<p class="small">Also note: d is not a terminal of this grammar at all.</p>' },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'sample', kind: 'sample (same shape as Aut-23)', short: 'Sample midterm', time: '1h30m', total: '20 + 10',
  head: [IUB, 'CSE313 Compiler Construction · Sample Midterm + Quiz (Practice) · Time: 1h30m', 'Same shape as Mid Autumn-23. New questions.'],
  blocks: [
  { h: 'Mid Question (Total marks: 20)' },
  { n: 1, marks: 7, q: 'Prove whether the following grammar is Ambiguous or NOT. If the grammar is ambiguous, convert it to unambiguous form.',
    g: 'E -> E - E | E / E | E ^ E | ( E ) | id',
    ans: () => `<p>The grammar is ambiguous. String: <code>id - id / id</code></p>
${twoLMD('E', ['E'], ['E - E', 'id', 'E / E', 'id', 'id'], ['E / E', 'E - E', 'id', 'id', 'id'], '- at the root: does / first, correct', '/ at the root: does - first, wrong')}
<p>${fac('id - id / id')}</p>
${table(['Operator', 'Precedence', 'Associativity'], [['^', 'highest', 'right'], ['/', 'middle', 'left'], ['-', 'lowest', 'left']])}
<p><b>Unambiguous grammar</b> (low precedence on top, high at the bottom):</p>${gbox('E -> E - T | T\nT -> T / F | F\nF -> G ^ F | G\nG -> ( E ) | id')}
<p class="small">- and / are left associative → left recursive. ^ is right associative → right recursive (F → G ^ F).</p>`,
    lose: 'two trees that are really the same tree; forgetting ( E ); no assumption written.' },
  { n: 2, marks: 8, q: 'Write the First() and Follow() of the following grammar. Draw the LL(1) Parsing Table and parse the string <code>w x x y k z</code> showing all steps. If parsing is not possible, point out the reasons. (b) Using the same table, parse <code>x y w z</code>.',
    g: 'S -> X Y z | w S\nX -> x X | ε\nY -> y Z | ε\nZ -> k | ε', ans: () => ll1Answer('S -> X Y z | w S\nX -> x X | ε\nY -> y Z | ε\nZ -> k | ε', ['w x x y k z', 'x y w z']),
    lose: 'FIRST(S) needs z too (X and Y can both be ε).' },
  { n: 3, marks: 5, q: 'Find True/False:<br>(a) An LL(1) grammar can be left recursive.<br>(b) The FIRST set of a non-terminal can contain ε.<br>(c) A grammar with a FIRST/FIRST conflict can be parsed by an LL(1) parser.<br>(d) The lexical analyzer removes comments and white space.<br>(e) Left factoring changes the language of the grammar.',
    ans: () => tf([['a', 'False', 'A top-down parser loops forever on A → Aα.'], ['b', 'True', 'If A ⇒* ε then ε ∈ FIRST(A). (FOLLOW never has ε.)'], ['c', 'False', 'Two rules in one cell, so not LL(1).'], ['d', 'True', 'The scanner throws them away while making tokens.'], ['e', 'False', 'It only rewrites the rules; the strings stay the same.']]) },
  { h: 'Quiz Question (Total marks: 10)' },
  { n: 1, marks: 5, q: 'Convert the following Non-Deterministic Grammar (NDG) to Deterministic Grammar (DG):', g: 'S -> a b c S | a b d | a b | a T | e\nT -> t', ans: () => lfAnswer('S -> a b c S | a b d | a b | a T | e\nT -> t') },
  { n: 2, marks: 5, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):', g: 'A -> A b c | A d | e | f B\nB -> B g | h', ans: () => lrAnswer('A -> A b c | A d | e | f B\nB -> B g | h') },
  { h: 'Extra practice [8]' },
  { n: 4, marks: 8, q: 'The grammar below is left recursive. Make it ready for LL(1), then write First() and Follow(), draw the LL(1) table and parse <code>int id ; float id</code>.',
    g: 'L -> L ; D | D\nD -> int id | float id',
    ans: () => `<h4>Step 0 · Remove left recursion</h4>${lrAnswer('L -> L ; D | D\nD -> int id | float id')}<p>D → int id | float id start with different terminals, so no left factoring is needed.</p>${ll1Answer("L -> D L'\nL' -> ; D L' | ε\nD -> int id | float id", ['int id ; float id'])}` },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'setA', kind: 'new practice set', short: 'Practice set A', time: '1h30m', total: '20 + 10',
  head: [IUB, 'CSE313 Compiler Construction · Practice Set A · Mid + Quiz · Time: 1h30m', 'New questions in the Aut-23 shape. Solve on paper first, then check.'],
  blocks: [
  { h: 'Mid Question (Total marks: 20)' },
  { n: 1, marks: 7, q: 'Prove whether the following grammar is Ambiguous or NOT. If the grammar is ambiguous, convert it to unambiguous form.',
    g: 'B -> B or B | B and B | not B | ( B ) | id',
    ans: () => `<p>Yes, the grammar is ambiguous. String: <code>id or id and id</code></p>
${twoLMD('B', ['B'], ['B or B', 'id', 'B and B', 'id', 'id'], ['B and B', 'B or B', 'id', 'id', 'id'], 'or at the root', 'and at the root')}
<p>${fac('id or id and id')}</p>
<p><b>[Assuming not &gt; and &gt; or in precedence; or and and are left associative; not is a prefix operator (right associative)]</b></p>
${table(['Operator', 'Precedence', 'Associativity'], [['not', 'highest', 'right (prefix)'], ['and', 'middle', 'left'], ['or', 'lowest', 'left']])}
<p><b>Unambiguous grammar:</b></p>${gbox('B -> B or T | T\nT -> T and F | F\nF -> not F | ( B ) | id')}
<p class="small">Checked by computer: same strings as the original (all 207 strings up to length 7), and each has exactly one LMD.</p>`,
    lose: 'forgetting "not F" must recurse on the right (not not id); dropping ( B ).' },
  { n: 2, marks: 8, q: 'Write the First() and Follow() of the following Grammar. Draw LL(1) Parsing Table and parse the string <code>[ ] d a b c b</code> showing all steps. If parsing is not possible, point out the reasons. (b) Parse <code>a c b b</code>. V = {E, F, G, H}, T = {a, b, c, d, [, ], ε}, S = {E}',
    g: 'E -> a F G | H E\nF -> b | ε\nG -> c F | ε\nH -> d | [ F ]', ans: () => ll1Answer('E -> a F G | H E\nF -> b | ε\nG -> c F | ε\nH -> d | [ F ]', ['[ ] d a b c b', 'a c b b']),
    lose: 'FOLLOW(F) has three sources: c (from a F G), FOLLOW(G) = { $ }, and ] (from [ F ]).' },
  { n: 3, marks: 5, q: 'Find True/False:<br>(a) Every LL(1) grammar is unambiguous.<br>(b) The FOLLOW set of a non-terminal can contain ε.<br>(c) An LL(1) parsing table has one row for each terminal.<br>(d) Syntax analysis comes after lexical analysis.<br>(e) A Bottom-Up Parser builds the parse tree from the root down to the leaves.',
    ans: () => tf([['a', 'True', 'Each cell has at most one rule, so each string has only one derivation.'], ['b', 'False', 'FOLLOW holds terminals and $ only; ε never goes in FOLLOW.'], ['c', 'False', 'One row per non-terminal; one column per terminal plus $.'], ['d', 'True', 'The parser reads the tokens that the lexical analyzer makes.'], ['e', 'False', 'BUP goes from the leaves (input) up to the root (start symbol). TDP goes root down.']]) },
  { h: 'Quiz Question (Total marks: 10)' },
  { n: 1, marks: 5, q: 'Convert the following Non-Deterministic Grammar (NDG) to Deterministic Grammar (DG):', g: 'S -> i E t S | i E t S e S | a\nE -> b c | b d | b', ans: () => lfAnswer('S -> i E t S | i E t S e S | a\nE -> b c | b d | b') },
  { n: 2, marks: 5, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):', g: 'S -> S a B | S b | c\nB -> B d | e', ans: () => lrAnswer('S -> S a B | S b | c\nB -> B d | e') },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'setB', kind: 'new practice set', short: 'Practice set B', time: '1h30m', total: '20 + 10',
  head: [IUB, 'CSE313 Compiler Construction · Practice Set B · Mid + Quiz · Time: 1h30m', 'New questions. Q2 needs a conversion before LL(1); quiz Q2 has hidden left recursion.'],
  blocks: [
  { h: 'Mid Question (Total marks: 20)' },
  { n: 1, marks: 7, q: 'Prove whether the following grammar is Ambiguous or NOT. If the grammar is ambiguous, convert it to unambiguous form.',
    g: 'A -> A + A | B\nB -> B * B | C\nC -> ( A ) | x',
    ans: () => `<p>Yes, the grammar is ambiguous. <code>A → A + A</code> and <code>B → B * B</code> both have the same non-terminal on both sides. String: <code>x + x + x</code></p>
${twoLMD('A', ['A', 'B', 'C'], ['A + A', 'B', 'C', 'x', 'A + A', 'B', 'C', 'x', 'B', 'C', 'x'], ['A + A', 'A + A', 'B', 'C', 'x', 'B', 'C', 'x', 'B', 'C', 'x'], 'right + done first', 'left + done first')}
<p>${fac('x + x + x')} (<code>x * x * x</code> also has two trees.)</p>
<p><b>[Assuming + and * are both left associative; * has higher precedence, as the levels already show]</b></p>
<p><b>Unambiguous grammar:</b> make each rule recurse on one side only.</p>${gbox('A -> A + B | B\nB -> B * C | C\nC -> ( A ) | x')}
${table(['Operator', 'Precedence', 'Associativity'], [['+', 'lowest', 'left (A → A + B)'], ['*', 'highest', 'left (B → B * C)']])}
<p class="small">Checked by computer: same 60 strings up to length 7, each with one LMD.</p>`,
    lose: 'fixing only one of the two levels; picking x + x * x (it has only one tree here).' },
  { n: 2, marks: 8, q: 'The grammar below is left recursive. Make it ready for LL(1), then write First() and Follow(), draw the LL(1) Parsing Table and parse <code>n - ( n )</code>. (b) Parse <code>n ( n</code>. If parsing is not possible, point out the reasons.',
    g: 'E -> E - T | T\nT -> n | ( E )',
    ans: () => `<h4>Step 0 · Remove left recursion</h4>${lrAnswer('E -> E - T | T\nT -> n | ( E )')}<p>T → n | ( E ) start with different terminals: no left factoring needed.</p>${ll1Answer("E -> T E'\nE' -> - T E' | ε\nT -> n | ( E )", ['n - ( n )', 'n ( n'])}`,
    lose: 'building the table from the left recursive grammar; FOLLOW(E\') must include ) (from ( E )).' },
  { n: 3, marks: 5, q: 'Find True/False:<br>(a) Left factoring removes left recursion.<br>(b) An ambiguous grammar can be LL(1).<br>(c) For A → ε, the rule is placed in M[A, b] for every b in FOLLOW(A).<br>(d) The lexical analyzer produces the parse tree.<br>(e) In LL(1), the first L means the input is scanned Left to right.',
    ans: () => tf([['a', 'False', 'Left factoring removes common prefixes (NDG → DG). Left recursion needs A → βA\', A\' → αA\' | ε.'], ['b', 'False', 'Two trees for a string means two rules compete for some cell.'], ['c', 'True', 'ε rules go under the FOLLOW terminals of the left side.'], ['d', 'False', 'The lexer makes tokens; the syntax analyzer (parser) makes the parse tree.'], ['e', 'True', 'L = left-to-right scan, L = leftmost derivation, 1 = one look-ahead.']]) },
  { h: 'Quiz Question (Total marks: 10)' },
  { n: 1, marks: 5, q: 'Convert the following Non-Deterministic Grammar (NDG) to Deterministic Grammar (DG):', g: 'A -> a b B | a B | c d g | c d e B | c d f B\nB -> x', ans: () => lfAnswer('A -> a b B | a B | c d g | c d e B | c d f B\nB -> x') },
  { n: 2, marks: 5, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):', g: 'S -> A a | b\nA -> A c | S d | e', ans: () => lrAnswer('S -> A a | b\nA -> A c | S d | e'),
    lose: 'missing the hidden recursion A → S d → A a d; substitute S into A first.' },
  ] },
/* ------------------------------------------------------------------ */
{ id: 'setC', kind: 'new practice set', short: 'Practice set C', time: '1h30m', total: '20 + 10',
  head: [IUB, 'CSE313 Compiler Construction · Practice Set C · Mid + Quiz · Time: 1h30m', 'New questions. Q1 is NOT ambiguous (like Aut-23). Q2 is NOT LL(1). Q3 is a reason question (like Summer-23).'],
  blocks: [
  { h: 'Mid Question (Total marks: 20)' },
  { n: 1, marks: 7, q: 'Prove whether the following grammar is Ambiguous or NOT. If the grammar is ambiguous, convert it to unambiguous form.',
    g: 'E -> E $ T | T\nT -> F % T | F\nF -> F ! | ( E ) | n',
    ans: () => `<p>Check every rule for the shape X → X op X:</p>
${table(['Rule', 'Recursion'], [['E → E $ T', 'left only'], ['T → F % T', 'right only'], ['F → F !', 'left only (postfix)']])}
<p>Each operator lives on one level and recurses on one side, so precedence and associativity are fixed. Example <code>n $ n % n !</code>: only one rule fits at each step.</p>
${oneLMD('E', ['E', 'T', 'F'], ['E $ T', 'T', 'F', 'n', 'F % T', 'n', 'F', 'F !', 'n'])}
<p class="concl">Every string has exactly one leftmost derivation parse tree ∴ the grammar is <b>NOT ambiguous</b>. No conversion is needed.</p>
${table(['Operator', 'Precedence', 'Associativity'], [['$', '1 (lowest)', 'left (E → E $ T)'], ['%', '2', 'right (T → F % T)'], ['!', '3 (highest)', 'postfix, left (F → F !)']])}
<p class="small">Checked by computer: all 207 strings up to length 7 have exactly one LMD.</p>`,
    lose: 'calling it ambiguous because it is left recursive (left recursion is not ambiguity).' },
  { n: 2, marks: 8, q: 'Write the First() and Follow() of the following Grammar. Draw LL(1) Parsing Table and parse the string <code>a a b</code> showing all steps. If parsing is not possible, point out the reasons.',
    g: 'S -> A a B | b C\nA -> a A | ε\nB -> b | ε\nC -> c C | d',
    ans: () => ll1Answer('S -> A a B | b C\nA -> a A | ε\nB -> b | ε\nC -> c C | d', [], { conflictWhy: '<b>Why:</b> this is a FIRST/FOLLOW conflict. A → a A puts a rule under FIRST = a. A → ε puts a rule under FOLLOW(A) = { a } (in S → A a B, a comes after A). Same cell, two rules. With LA = a the parser cannot know whether this a belongs to A or is the a after A. ∴ the string <code>a a b</code> cannot be parsed by LL(1).' }),
    lose: 'filling the table and parsing anyway; the mark is for pointing at the cell with two rules and naming the conflict.' },
  { n: 3, marks: 5, q: 'A student removed left recursion from an ambiguous grammar and claimed the new grammar is unambiguous. Is the claim correct? Justify with an example.',
    ans: () => `<p>No, the claim is wrong. Take <code>E → E + E | id</code>. It is ambiguous: <code>id + id + id</code> has two LMDs. Remove left recursion (α = + E, β = id):</p>${gbox("E -> id E'\nE' -> + E E' | ε")}
<p>The same string still has two leftmost derivations in the new grammar:</p>
${twoLMD('E', ['E', "E'"], ["id E'", "+ E E'", "id E'", "+ E E'", "id E'", 'ε', 'ε', 'ε'], ["id E'", "+ E E'", "id E'", 'ε', "+ E E'", "id E'", 'ε', 'ε'])}
<p class="concl"><b>Reason:</b> left recursion removal keeps the language and only changes the direction of recursion. It does not add precedence or associativity. Ambiguity comes from the X → X op X shape; here E\' → + E E\' still lets the second + attach in two places. ∴ To remove ambiguity, rebuild the grammar with precedence levels.</p>`,
    lose: 'a claim with no derivations; showing derivations only for the old grammar.' },
  { h: 'Quiz Question (Total marks: 10)' },
  { n: 1, marks: 5, q: 'Convert the following Non-Deterministic Grammar (NDG) to Deterministic Grammar (DG):', g: 'X -> p q r X | p q r Y | p q | p s\nY -> y', ans: () => lfAnswer('X -> p q r X | p q r Y | p q | p s\nY -> y'),
    lose: 'this needs three rounds; check every new rule again.' },
  { n: 2, marks: 5, q: 'Convert the following Left Recursive Grammar (LRG) to Right Recursive Grammar (RRG):', g: 'P -> P + Q | P - Q | Q\nQ -> Q * id | id', ans: () => lrAnswer('P -> P + Q | P - Q | Q\nQ -> Q * id | id') },
  ] },
];

/* ---------- all True/False statements, most important first ---------- */
const TF = [
 ['Tier 1 · Which grammar works with which parser (asked in every past paper)', [
  ['All TDP can use Left Recursive Grammar (LRG).', 'False', 'Left recursion makes a top-down parser loop forever (A ⇒ Aα ⇒ Aαα …).', 'Aut-23 3(a)'],
  ['All TDP can use Non-deterministic Grammar (NDG).', 'False', 'Predictive parsers (LL(1)) need a deterministic grammar. Only backtracking parsers cope with NDG.', 'Aut-23 3(b)'],
  ['Left Recursive Grammar (LRG) can not be used in LL(1).', 'True', 'LL(1) is top-down; left recursion loops and puts two rules in one cell.', 'Sum-23 4(a)'],
  ['Non-deterministic Grammar (NDG) can not be used in LL(1).', 'True', 'Alternatives with the same prefix fall in the same cell (FIRST/FIRST conflict).', 'Sum-23 4(b)'],
  ['An LL(1) grammar can be left recursive.', 'False', 'Left recursion must be removed first.', 'sample 3(a)'],
  ['A grammar with a FIRST/FIRST conflict can be parsed by an LL(1) parser.', 'False', 'Two rules in one cell, so the grammar is not LL(1).', 'sample 3(c)'],
  ['If two rules fall in one cell of the table, the grammar is not LL(1).', 'True', 'The parser cannot choose with one look-ahead.', 'drill'],
  ['Brute Force Parser is a BUP.', 'False', 'Brute force = top-down parsing with backtracking.', 'Aut-23 3(e)'],
  ['Recursive Descent Parser (RDP) is as powerful as LL(1).', 'False', 'RDP with backtracking tries every alternative, so it accepts grammars LL(1) cannot (more general, but slower).', 'Sum-23 4(c)'],
  ['Recursive Descent Parser (RDP) uses OS stack.', 'True', 'One procedure per non-terminal, called recursively, so it uses the program (OS) call stack.', 'Sum-23 4(d)'],
  ['Recursive Descent Parser (RDP) can use Non-deterministic Grammar (NDG).', 'True', 'With backtracking it tries one alternative, and on failure goes back and tries the next.', 'Sum-23 4(e)'],
  ['A predictive parser needs backtracking.', 'False', 'A predictive parser never backtracks. It uses the look-ahead and the table.', 'drill'],
  ['From LRG grammar complete First set can\'t be found.', 'False', 'For A → Aα | β, FIRST(A) = FIRST(β) (plus FIRST(α) if β can be ε). Textbook view; write the reason.', 'Aut-23 3(c)'],
  ['From LRG grammar complete Follow set can\'t be found.', 'False', 'FOLLOW comes from where a symbol appears on right sides. Left recursion does not stop this.', 'Aut-23 3(d)'],
 ]],
 ['Tier 2 · Conversions and ambiguity', [
  ['Left factoring removes left recursion.', 'False', 'Left factoring removes common prefixes (NDG → DG). Left recursion needs A → βA\', A\' → αA\' | ε.', 'set B / drill'],
  ['Left factoring changes the language of the grammar.', 'False', 'It only rewrites the rules; the set of strings stays the same.', 'sample 3(e)'],
  ['Removing left recursion changes the language of the grammar.', 'False', 'The new grammar makes exactly the same strings. Only the shape of the trees changes.', 'drill'],
  ['Converting an ambiguous NDG to a DG (left factoring) makes it unambiguous.', 'False', 'Left factoring only delays the choice; every parse tree maps one-to-one, so ambiguity stays.', 'Sum-23 Q3'],
  ['Removing left recursion from an ambiguous grammar makes it unambiguous.', 'False', 'E → E + E | id becomes E → id E\', E\' → + E E\' | ε, and id + id + id still has two LMDs.', 'set C Q3'],
  ['An ambiguous grammar can be LL(1).', 'False', 'Two trees for a string means two rules compete for some cell.', 'set B 3(b)'],
  ['Every LL(1) grammar is unambiguous.', 'True', 'Each cell has at most one rule, so each string has only one derivation.', 'set A 3(a)'],
  ['In an unambiguous expression grammar, + is defined at a higher level (closer to the start symbol) than *.', 'True', 'Lower precedence = upper level of the grammar.', 'drill'],
  ['A left recursive rule (E → E + T) makes the operator left associative.', 'True', 'The tree grows to the left, so the left operation is done first.', 'lesson 6'],
  ['The rule for ^ (power) should be left recursive.', 'False', '^ is right associative, so its rule is right recursive: F → G ^ F.', 'drill'],
 ]],
 ['Tier 3 · FIRST, FOLLOW and the LL(1) table', [
  ['The FIRST set of a non-terminal can contain ε.', 'True', 'If A ⇒* ε then ε ∈ FIRST(A).', 'sample 3(b)'],
  ['The FOLLOW set of a non-terminal can contain ε.', 'False', 'FOLLOW holds terminals and $ only; ε never goes in FOLLOW.', 'set A 3(b)'],
  ['$ is always in FOLLOW of the start symbol.', 'True', 'Rule 1 of FOLLOW.', 'drill'],
  ['FIRST of a terminal is the terminal itself.', 'True', 'FIRST rule 1.', 'drill'],
  ['For A → ε, the rule is placed in M[A, b] for every b in FOLLOW(A).', 'True', 'ε rules go under the FOLLOW terminals of the left side.', 'set B 3(c)'],
  ['ε can be a column in the LL(1) parsing table.', 'False', 'Columns are terminals and $. ε rules are placed using FOLLOW.', 'drill'],
  ['An LL(1) parsing table has one row for each terminal.', 'False', 'One row per non-terminal; one column per terminal plus $.', 'set A 3(c)'],
  ['In LL(1), the first L means the input is scanned Left to right.', 'True', 'L = left-to-right scan, L = leftmost derivation, 1 = one look-ahead.', 'set B 3(e)'],
 ]],
 ['Tier 4 · Parser classes, phases and lexical analysis', [
  ['A Bottom-Up Parser builds the parse tree from the root down to the leaves.', 'False', 'BUP goes from the leaves (input) up to the root. TDP goes root down.', 'set A 3(e)'],
  ['Bottom-up parsing uses the reverse of the rightmost derivation.', 'True', 'Slides: bottom-up uses the reverse of rightmost derivation.', 'drill'],
  ['The lexical analyzer removes comments and white space.', 'True', 'The scanner throws them away while making tokens.', 'sample 3(d)'],
  ['The lexical analyzer builds the parse tree.', 'False', 'The lexer makes tokens. The syntax analyzer (parser) builds the parse tree.', 'drill / set B 3(d)'],
  ['Syntax analysis comes after lexical analysis.', 'True', 'The parser reads the tokens that the lexical analyzer makes.', 'set A 3(d)'],
  ['Semantic analysis belongs to the analysis (front end) part of the compiler.', 'True', 'Lexical, syntax and semantic analysis form the analysis part.', 'drill'],
  ['An interpreter produces a target program in machine code.', 'False', 'An interpreter does not produce a target program; it executes directly.', 'drill'],
  ['Regular expressions can check balanced parentheses.', 'False', 'Finite automata cannot remember nesting depth. A CFG is needed.', 'drill'],
 ]],
];
let tfN = 0;
const tfBlocks = TF.map(([title, rows], i) => {
  const start = tfN + 1; tfN += rows.length;
  const nums = rows.map((_, k) => start + k);
  return { n: 'ABCD'[i], marks: '', label: title,
    q: `<b>${title}</b><ol start="${start}" class="tfq">${rows.map(r => `<li>${r[0]} <span class="tfb">T / F</span></li>`).join('')}</ol>`,
    ans: () => '<div class="tftab">' + table(['#', 'Statement', 'Answer', 'Reason (one line)', 'Seen in'], rows.map((r, k) => [nums[k], r[0], `<b>${r[1]}</b>`, r[2], `<span class="small">${r[3]}</span>`])) + '</div>' };
});
const TFPAPER = { id: 'truefalse', kind: 'all true / false', short: 'True / False bank', time: '-', total: '-',
  head: [IUB, 'CSE313 · Every True / False statement, most important first', 'Tier 1 is asked in every past paper. Write T or F and a one-line reason for each; the reason earns the mark.'],
  blocks: tfBlocks };

PAPERS.splice(5, 0, TFPAPER);
module.exports = { PAPERS };
