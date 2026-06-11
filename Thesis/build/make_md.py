#!/usr/bin/env python3
"""Render the chapter Markdown + facts into ONE readable, self-contained master Markdown file
(citations resolved to [n], figures embedded, tables kept, references + appendices appended)."""
import os, re
import assemble as A

OUT = os.path.join(A.ROOT, "Thesis", "FIVUCSAS_Thesis.md")
CHAP = A.CHAP_DIR

def read(n):
    p = os.path.join(CHAP, n)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""

fm = read("00_frontmatter.md")
chaps = {i: read("ch%d.md" % i) for i in range(1, 8)}
appx = read("appendices.md")

cit = A.collect_citations([chaps[i] for i in range(1, 8)] + [appx])

def render_md(md, chapter_no):
    """Resolve markers in one chapter's markdown for readable output."""
    fignum = {}; c = 0
    # number figures by first appearance
    for m in re.finditer(A.FIG_RE, md):
        if m.group(1) not in fignum:
            c += 1; fignum[m.group(1)] = c
    # also standalone fig lines counted above since FIG_RE matches them too
    out = []
    lines = md.split("\n")
    i = 0; tbl = 0; eqn = 0; emitted = set(); pending_cap = None
    while i < len(lines):
        ln = lines[i]; st = ln.strip()
        # table block
        if st.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i]); i += 1
            tbl += 1
            if pending_cap:
                out.append("\n**Table %d.%d.** %s\n" % (chapter_no, tbl, A.sub_citations(pending_cap, cit)))
                pending_cap = None
            out.append("\n".join(A.sub_citations(r, cit) for r in rows)); out.append(""); continue
        # standalone table caption
        m = re.match(r"^\[\[TABLE:\s*(.*?)\]\]$", st)
        if m:
            pending_cap = m.group(1).strip(); i += 1; continue
        # standalone figure line(s)
        if re.match(r"^(?:\[\[FIG:[^\]]*\]\]\s*)+$", st):
            for fm2 in re.finditer(A.FIG_RE, st):
                out.append(fig_md(fm2, chapter_no, fignum, emitted))
            i += 1; continue
        # equation (the LaTeX line may be separated by blank lines)
        m = re.match(r"^\[\[EQ:\s*(.*?)\]\]$", st)
        if m:
            i += 1
            while i < len(lines) and not lines[i].strip():
                i += 1
            eq = ""
            if i < len(lines) and lines[i].strip() and not lines[i].strip().startswith("["):
                eq = lines[i].strip(); i += 1
            eqn += 1
            if not eq.startswith("$$"):
                eq = "$$" + eq.strip().strip("$").strip() + "$$"
            out.append("\n**Equation %d.%d — %s:**\n\n%s\n"
                       % (chapter_no, eqn, m.group(1).strip(), eq)); continue
        # a line with inline table caption marker -> capture caption, strip from text
        if "[[TABLE:" in ln:
            tabs = re.findall(r"\[\[TABLE:\s*(.*?)\]\]", ln)
            if tabs: pending_cap = tabs[-1].strip()
            ln = re.sub(r"\s*\[\[TABLE:\s*.*?\]\]", "", ln)
            st = ln.strip()
        # inline figures in a text line: emit text then figure(s)
        if "[[FIG:" in ln:
            figs = list(re.finditer(A.FIG_RE, ln))
            txt = re.sub(A.FIG_RE, lambda m: "Figure %d.%d" % (chapter_no, fignum.get(m.group(1), 0)), ln)
            out.append(A.sub_citations(txt, cit))
            for fm2 in figs:
                out.append(fig_md(fm2, chapter_no, fignum, emitted))
            i += 1; continue
        out.append(A.sub_citations(ln, cit)); i += 1
    return "\n".join(out)

def fig_md(m, chapter_no, fignum, emitted):
    key = m.group(1); cap = (m.group(2) or "").strip()
    num = fignum.get(key, 0)
    if key in emitted:
        return ""  # already shown in this chapter
    emitted.add(key)
    pc = A.FIGS.get(key)
    if not pc:
        return "\n**Figure %d.%d.** %s\n" % (chapter_no, num, cap)
    rel, dcap = pc
    return "\n![%s](../%s)\n\n**Figure %d.%d.** %s\n" % (cap or dcap, rel, chapter_no, num, cap or dcap)

doc = []
doc.append("# Face and Identity Verification Using Cloud-Based SaaS Models\n")
doc.append("**A graduation thesis submitted to the Faculty of Engineering, Marmara University, "
           "Computer Engineering Department, in partial fulfillment of the requirements for the degree of "
           "Bachelor of Science.**\n")
doc.append("**Authors:** Ahmet Abdullah Gültekin · Ayşe Gülsüm Eren · Ayşenur Arıcı  \n"
           "**Supervisor:** Assoc. Prof. Dr. Mustafa Ağaoğlu  \n**Year:** 2026\n")
doc.append("\n---\n")
# front matter (abstract/ack) verbatim
doc.append(fm.strip())
doc.append("\n---\n")
for i in range(1, 8):
    doc.append(render_md(chaps[i], i)); doc.append("\n---\n")
# references
doc.append("# REFERENCES\n")
for key, num in sorted(cit.items(), key=lambda kv: kv[1]):
    ref = A.REFS.get(key, "[MISSING: %s]" % key)
    doc.append("%d. %s" % (num, ref))
doc.append("\n---\n")
# appendices (letter-based)
letters = iter("ABCDEFGH")
cl = ["A"]; atbl = [0]
albuf = []
lines = appx.split("\n"); i = 0; pend = None
while i < len(lines):
    st = lines[i].strip()
    if re.match(r"^#\s+Appendix", st):
        cl[0] = next(letters); atbl[0] = 0
        albuf.append("\n# " + re.sub(r"^#\s+", "", st)); i += 1; continue
    if st.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            rows.append(lines[i]); i += 1
        atbl[0] += 1
        if pend:
            albuf.append("\n**Table %s.%d.** %s\n" % (cl[0], atbl[0], A.sub_citations(pend, cit))); pend = None
        albuf.append("\n".join(A.sub_citations(r, cit) for r in rows)); albuf.append(""); continue
    m = re.match(r"^\[\[TABLE:\s*(.*?)\]\]$", st)
    if m: pend = m.group(1).strip(); i += 1; continue
    if "[[TABLE:" in st:
        t = re.findall(r"\[\[TABLE:\s*(.*?)\]\]", st)
        if t: pend = t[-1].strip()
        st2 = re.sub(r"\s*\[\[TABLE:\s*.*?\]\]", "", lines[i]).rstrip()
        albuf.append(A.sub_citations(st2, cit)); i += 1; continue
    albuf.append(A.sub_citations(lines[i], cit)); i += 1
doc.append("\n".join(albuf))

open(OUT, "w", encoding="utf-8").write("\n".join(doc))
print("SAVED:", OUT, "(%d words)" % len(open(OUT, encoding="utf-8").read().split()))
print("leftover markers:", {m: open(OUT, encoding="utf-8").read().count(m) for m in ["[[FIG", "[[TABLE", "[CITE:"]})
