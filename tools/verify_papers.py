"""Verify the ambiguity claims used in papers.html (new practice sets)."""
import sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from verify import parse_grammar, language, count_lmd

def amb(name, text, strings, fixed=None, n=7):
    g, o = parse_grammar(text)
    for s in strings:
        print(f"{name}: LMDs of {s!r} = {count_lmd(g, o, s.split())}")
    if fixed:
        g2, o2 = parse_grammar(fixed)
        L1, L2 = language(g, o, n), language(g2, o2, n)
        print(f"{name}: same language up to {n}: {L1 == L2} ({len(L1)} strings)")
        worst = max((count_lmd(g2, o2, list(w)) for w in L2), default=0)
        print(f"{name}: fixed grammar max LMDs over those strings = {worst}")

amb("A1", "B -> B or B | B and B | not B | ( B ) | id", ["id or id and id"],
    "B -> B or T | T\nT -> T and F | F\nF -> not F | ( B ) | id")
amb("B1", "A -> A + A | B\nB -> B * B | C\nC -> ( A ) | x", ["x + x + x", "x * x * x", "x + x * x"],
    "A -> A + B | B\nB -> B * C | C\nC -> ( A ) | x")
g, o = parse_grammar("E -> E $ T | T\nT -> F % T | F\nF -> F ! | ( E ) | n")
L = language(g, o, 7)
print("C1: strings up to 7:", len(L), "max LMDs =", max(count_lmd(g, o, list(w)) for w in L))
print("C1: LMDs of n $ n % n ! =", count_lmd(g, o, "n $ n % n !".split()))
amb("C3", "E -> E + E | id", ["id + id + id"])
amb("C3'", "E -> id E'\nE' -> + E E' | ε", ["id + id + id"])
g1, o1 = parse_grammar("E -> E + E | id"); g2, o2 = parse_grammar("E -> id E'\nE' -> + E E' | ε")
print("C3 same language:", language(g1, o1, 7) == language(g2, o2, 7))
