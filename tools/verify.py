"""Verify every grammar answer used in the study site.

FIRST/FOLLOW/LL(1) table/parse trace by fixed point, and grammar conversions
(left factoring, left recursion removal, ambiguity fixes) by comparing the sets
of strings each grammar generates up to a length bound.
"""
from itertools import product

EPS = "ε"


def parse_grammar(text):
    """'A -> a B | ε' lines; symbols separated by spaces. First LHS is start."""
    g, order = {}, []
    for line in text.strip().splitlines():
        lhs, rhs = line.split("->")
        lhs = lhs.strip()
        order.append(lhs)
        g[lhs] = [[] if alt.strip() == EPS else alt.split() for alt in rhs.split("|")]
    return g, order


def first_of_seq(seq, FIRST, g):
    out = set()
    for s in seq:
        f = FIRST[s] if s in g else {s}
        out |= f - {EPS}
        if EPS not in f:
            return out
    out.add(EPS)
    return out


def first_follow(g, order):
    FIRST = {A: set() for A in g}
    changed = True
    while changed:
        changed = False
        for A in g:
            for alt in g[A]:
                f = first_of_seq(alt, FIRST, g)
                if not f <= FIRST[A]:
                    FIRST[A] |= f
                    changed = True
    FOLLOW = {A: set() for A in g}
    FOLLOW[order[0]].add("$")
    changed = True
    while changed:
        changed = False
        for A in g:
            for alt in g[A]:
                for i, B in enumerate(alt):
                    if B not in g:
                        continue
                    f = first_of_seq(alt[i + 1:], FIRST, g)
                    add = (f - {EPS}) | (FOLLOW[A] if EPS in f else set())
                    if not add <= FOLLOW[B]:
                        FOLLOW[B] |= add
                        changed = True
    return FIRST, FOLLOW


def ll1_table(g, FIRST, FOLLOW):
    M = {}
    for A in g:
        for alt in g[A]:
            f = first_of_seq(alt, FIRST, g)
            keys = (f - {EPS}) | (FOLLOW[A] if EPS in f else set())
            for a in keys:
                M.setdefault((A, a), []).append(alt)
    conflicts = {k: v for k, v in M.items() if len(v) > 1}
    return M, conflicts


def ll1_parse(g, order, M, tokens):
    stack = ["$", order[0]]
    buf = tokens + ["$"]
    i = 0
    trace = []
    while True:
        top, la = stack[-1], buf[i]
        if top == "$" and la == "$":
            trace.append("accept")
            return True, trace
        if top not in g:
            if top == la:
                stack.pop()
                i += 1
                trace.append(f"match {la}")
                continue
            trace.append(f"ERROR: top {top} != LA {la}")
            return False, trace
        rules = M.get((top, la))
        if not rules:
            trace.append(f"ERROR: M[{top},{la}] empty")
            return False, trace
        alt = rules[0]
        stack.pop()
        stack.extend(reversed(alt))
        trace.append(f"{top} -> {' '.join(alt) or EPS}")


def language(g, order, maxlen):
    """All terminal strings of length <= maxlen (tuples). BFS over leftmost sentential forms."""
    start = (order[0],)
    seen, out = {start}, set()
    frontier = [start]
    while frontier:
        nxt = []
        for form in frontier:
            idx = next((k for k, s in enumerate(form) if s in g), None)
            if idx is None:
                out.add(form)
                continue
            terms = sum(1 for s in form if s not in g)
            if terms > maxlen:
                continue
            # prune: terminal prefix before first NT must stay short
            for alt in g[form[idx]]:
                nf = form[:idx] + tuple(alt) + form[idx + 1:]
                t = sum(1 for s in nf if s not in g)
                if t > maxlen or len(nf) > maxlen + 6:
                    continue
                if nf not in seen:
                    seen.add(nf)
                    nxt.append(nf)
        frontier = nxt
    return {w for w in out if len(w) <= maxlen}


def count_lmd(g, order, target):
    """Number of distinct leftmost derivations of target (bounded)."""
    target = tuple(target)
    from functools import lru_cache

    @lru_cache(None)
    def ways(form):
        idx = next((k for k, s in enumerate(form) if s in g), None)
        if idx is None:
            return 1 if form == target else 0
        if form[:idx] != target[:idx]:
            return 0
        if sum(1 for s in form if s not in g) > len(target) or len(form) > len(target) + 4:
            return 0
        return sum(ways(form[:idx] + tuple(alt) + form[idx + 1:]) for alt in g[form[idx]])

    return ways((order[0],))


def show_ll1(name, text, inputs=()):
    g, order = parse_grammar(text)
    F, FO = first_follow(g, order)
    M, conf = ll1_table(g, F, FO)
    print(f"\n=== {name}")
    for A in order:
        print(f"  {A:4} FIRST={sorted(F[A])}  FOLLOW={sorted(FO[A])}")
    print("  conflicts:", {f"{k}": [' '.join(a) or EPS for a in v] for k, v in conf.items()} or "none -> LL(1)")
    for s in inputs:
        ok, tr = ll1_parse(g, order, M, s.split())
        print(f"  parse '{s}': {'ACCEPT' if ok else 'REJECT'} ({len(tr)} steps)")
        print("    " + " | ".join(tr))


def equiv(name, a, b, n=7):
    ga, oa = parse_grammar(a)
    gb, ob = parse_grammar(b)
    la, lb = language(ga, oa, n), language(gb, ob, n)
    print(f"  {name}: {'EQUIVALENT' if la == lb else 'DIFFERENT'} up to len {n} ({len(la)} strings)")
    if la != lb:
        print("    only in original:", sorted(la - lb)[:5])
        print("    only in converted:", sorted(lb - la)[:5])


if __name__ == "__main__":
    show_ll1("Notes: E->TE' ...", """
E -> T E'
E' -> + T E' | ε
T -> M T'
T' -> * M T' | ε
M -> id | ( E )""", ["( id + id ) * id", "id + id * id"])

    show_ll1("Quiz 02: D->TL;", """
D -> T L ;
T -> int | char
L -> id L'
L' -> , id L' | ε""", ["int id , id ;"])

    show_ll1("Mid Aut-23 Q2", """
E -> c U V W | X Y E
U -> c | ε
V -> d U | ε
W -> e | ε
X -> e | ( Y )
Y -> g | ε""", ["( ) g c c d c e"])

    show_ll1("Practice 02 Q1", """
S -> a A b
A -> c B
B -> d | ε""", ["a a a b b c", "b b c", "a c b", "a c d b"])

    show_ll1("Practice 02 Q2", """
S -> A B
A -> a A | ε
B -> b B | c""", ["a c d b", "a a b c"])

    show_ll1("Slides FIRST/FIRST conflict", """
S -> a S | B
B -> a b B | ε""")

    show_ll1("Slides FIRST/FOLLOW conflict", """
S -> A a
A -> a | ε""")

    show_ll1("Notes first page", """
S -> a | B
B -> a B | a""")

    show_ll1("Practice paper Q2", """
S -> a B D h
B -> c C
C -> b C | ε
D -> E F
E -> g | ε
F -> f | ε""", ["a c b b g h", "a c f h", "a c g g h"])

    show_ll1("Drill: S->(L)|a", """
S -> ( L ) | a
L -> S L'
L' -> , S L' | ε""", ["( a , ( a , a ) )"])

    print("\n=== Conversions")
    equiv("Quiz01 Q1 ambiguity fix (& over ;)", "L -> L ; L | L & L | id",
          "L -> L ; M | M\nM -> M & T | T\nT -> id")
    equiv("Quiz01 Q2 left factoring", """
S -> a b c A | a b c B | a b | a b d
A -> e A | e g f
B -> g f""", """
S -> a b S'
S' -> c S'' | ε | d
S'' -> A | B
A -> e A'
A' -> A | g f
B -> g f""", 9)
    equiv("Quiz01 Q3 left recursion", """
A -> A a | B c | d
B -> A e | C g h | g f
C -> C a b | A c e | c d""", """
A -> B c A' | d A'
A' -> a A' | ε
B -> d A' e B' | C g h B' | g f B'
B' -> c A' e B' | ε
C -> d A' e B' c A' c e C' | g f B' c A' c e C' | d A' c e C' | c d C'
C' -> a b C' | g h B' c A' c e C' | ε""", 8)
    equiv("MidAut23 quiz Q1 left factoring", """
S -> b a c d S | b a c P | b a Q | b a
P -> c P | c
Q -> a Q | a""", """
S -> b a S'
S' -> c S'' | Q | ε
S'' -> d S | P
P -> c P'
P' -> P | ε
Q -> a Q'
Q' -> Q | ε""", 9)
    equiv("MidAut23 quiz Q2 left recursion", """
A -> A % B | B
B -> B & C | C
C -> C ^ 0 1 | a b c""", """
A -> B A'
A' -> % B A' | ε
B -> C B'
B' -> & C B' | ε
C -> a b c C'
C' -> ^ 0 1 C' | ε""", 9)
    equiv("Practice quiz Q1 left factoring", """
S -> a a b S | a a C | a a b | b
C -> c C | c""", """
S -> a a S' | b
S' -> b S'' | C
S'' -> S | ε
C -> c C'
C' -> C | ε""", 9)
    equiv("Practice quiz Q2 left recursion", """
P -> P ! Q | Q
Q -> Q ? r | s t""", """
P -> Q P'
P' -> ! Q P' | ε
Q -> s t Q'
Q' -> ? r Q' | ε""", 9)
    equiv("Practice paper Q1 ambiguity fix", "S -> S # S | S & S | ( S ) | a",
          "S -> S # T | T\nT -> T & F | F\nF -> ( S ) | a", 7)
    equiv("Notes E/T/F/G fix", "E -> E * E | E / E | E + E | E - E | E ^ E | id",
          "E -> E + T | E - T | T\nT -> T * F | T / F | F\nF -> G ^ F | G\nG -> id", 7)
    equiv("Assignment Q4(i) left factoring", """
S -> 0 1 1 1 S | 0 1 1 A | 0 1 1 B
A -> 0 1 A | 0 1 B
B -> b""", """
S -> 0 1 1 S'
S' -> 1 S | A | B
A -> 0 1 A'
A' -> A | B
B -> b""", 10)
    equiv("Slides E->E+T left recursion", """
E -> E + T | T
T -> T * F | F
F -> ( E ) | id""", """
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id""", 7)

    print("\n=== Ambiguity counts (number of leftmost derivations)")
    for name, gtxt, s in [
        ("E->E+E|E*E|id", "E -> E + E | E * E | id", "id + id * id"),
        ("Quiz01 L", "L -> L ; L | L & L | id", "id ; id & id"),
        ("Quiz01 L fixed", "L -> L ; M | M\nM -> M & T | T\nT -> id", "id ; id & id"),
        ("Practice Q1 S", "S -> S # S | S & S | ( S ) | a", "a # a & a"),
        ("Practice Q1 fixed", "S -> S # T | T\nT -> T & F | F\nF -> ( S ) | a", "a # a & a"),
        ("Assign Q2(ii) S->aa|aS|a", "S -> a a | a S | a", "a a a"),
        ("Assign Q2(iii) S->aS|aSbS|ε", "S -> a S | a S b S | ε", "a a b"),
    ]:
        g, o = parse_grammar(gtxt)
        print(f"  {name}: '{s}' has {count_lmd(g, o, s.split())} LMD(s)")
