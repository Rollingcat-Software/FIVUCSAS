#!/usr/bin/env python3
"""Assemble the FIVUCSAS thesis Markdown chapters into the Software-Oriented .docx template.

Preserves the template's Guide-compliant format:
  - title/approval/abstract/ack/ToC/LoF/LoT front matter (roman page numbers)
  - body regenerated with ListParagraph + numId=2 auto-numbered headings (1 / 1.1 / 1.1.1)
  - each chapter on a new page (pageBreakBefore); page numbers restart at arabic 1 at Chapter 1
  - chapter-based Figure/Table caption SEQ fields so the List of Figures/Tables auto-populate
  - citations renumbered by first appearance; References + Appendices generated
Run:  python3 assemble.py
"""
import os, re, sys
from docx import Document
from docx.shared import Pt, Inches, RGBColor, Twips
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = "/opt/projects/fivucsas"
T = ROOT + "/Thesis/build"
TEMPLATE = ROOT + "/Thesis/CSE4198_Thesis_Template_Software_Oriented_v2[1].docx"
OUT = os.environ.get("THESIS_OUT", ROOT + "/Thesis/FIVUCSAS_Thesis.docx")
CHAP_DIR = os.environ.get("THESIS_CHAP_DIR", T + "/chapters")
BIB = T + "/bibliography.md"

TITLE = "FACE AND IDENTITY VERIFICATION USING CLOUD-BASED SaaS MODELS"
AUTHORS = ["Ahmet Abdullah Gültekin", "Ayşe Gülsüm Eren", "Ayşenur Arıcı"]
SUPERVISOR = "Assoc. Prof. Dr. Mustafa Ağaoğlu"
YEAR = "2026"

# ---------------------------------------------------------------- bibliography + figures
def load_bibliography():
    refs, figs = {}, {}
    section = None
    for line in open(BIB, encoding="utf-8"):
        s = line.strip()
        if s.startswith("## References"): section = "ref"; continue
        if s.startswith("## Figure"): section = "fig"; continue
        if section == "ref":
            m = re.match(r"- \*\*([A-Za-z0-9_\-]+)\*\* :: (.+)", s)
            if m: refs[m.group(1)] = m.group(2).strip()
        elif section == "fig":
            m = re.match(r"\|\s*([A-Za-z0-9_\-]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", line)
            if m and m.group(1) not in ("key", "---", ":---"):
                figs[m.group(1)] = (m.group(2).strip(), m.group(3).strip())
    return refs, figs

REFS, FIGS = load_bibliography()

# ---------------------------------------------------------------- markdown tokenizer
def tokenize(md):
    """Yield block tokens: ('h',level,title) ('p',text) ('bullet',text) ('num',text)
       ('fig',key,caption) ('table',caption,rows) ('eq',text) ('code',text)"""
    lines = md.split("\n")
    i, n = 0, len(lines)
    toks = []
    pending_cap = None  # caption captured from a [[TABLE: ...]] marker, applied to the NEXT table
    FIG_INLINE = r"\[\[FIG:\s*[A-Za-z0-9_\-]+\s*(?:\|\s*.*?)?\]\]"
    while i < n:
        st = lines[i].strip()
        if not st:
            i += 1; continue
        # code fence
        if st.startswith("```"):
            i += 1; buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            toks.append(("code", "\n".join(buf))); continue
        # heading
        m = re.match(r"^(#{1,4})\s+(.*)$", st)
        if m:
            level = len(m.group(1))
            title = re.sub(r"^\d+(\.\d+)*\.?\s*", "", m.group(2).strip()).strip()
            toks.append(("h", level, title)); i += 1; continue
        # markdown table block (caption = nearest preceding [[TABLE: ...]] marker)
        if st.startswith("|"):
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip()); i += 1
            toks.append(("table", pending_cap or "", rows)); pending_cap = None; continue
        # equation marker
        m = re.match(r"^\[\[EQ:\s*(.*?)\]\]$", st)
        if m:
            i += 1; eq = ""
            if i < n and lines[i].strip() and not lines[i].strip().startswith("["):
                eq = lines[i].strip(); i += 1
            toks.append(("eq", m.group(1).strip(), eq)); continue
        # line that is ONLY figure marker(s) -> figure placement token(s)
        if re.match(r"^(?:" + FIG_INLINE + r"\s*)+$", st):
            for fm in re.finditer(r"\[\[FIG:\s*([A-Za-z0-9_\-]+)\s*(?:\|\s*(.*?))?\]\]", st):
                toks.append(("fig", fm.group(1), (fm.group(2) or "").strip()))
            i += 1; continue
        # standalone table caption marker -> remember for the next table
        m = re.match(r"^\[\[TABLE:\s*(.*?)\]\]$", st)
        if m:
            pending_cap = m.group(1).strip(); i += 1; continue
        # bullet / numbered
        m = re.match(r"^[-*]\s+(.*)$", st)
        if m: toks.append(("bullet", m.group(1).strip())); i += 1; continue
        m = re.match(r"^\d+[.)]\s+(.*)$", st)
        if m: toks.append(("num", m.group(1).strip())); i += 1; continue
        # paragraph (merge wrapped lines until blank/special); inline [[FIG]] stays in text
        buf = [st]; i += 1
        while i < n and lines[i].strip() and not re.match(
                r"^(#{1,4}\s|\[\[FIG:|\[\[TABLE:|\[\[EQ:|[-*]\s|\d+[.)]\s|\||```)", lines[i].strip()):
            buf.append(lines[i].strip()); i += 1
        ptext = " ".join(buf)
        # a trailing/inline [[TABLE: cap]] is the caption for the following table; pull it out
        tabs = re.findall(r"\[\[TABLE:\s*(.*?)\]\]", ptext)
        if tabs:
            pending_cap = tabs[-1].strip()
            ptext = re.sub(r"\s*\[\[TABLE:\s*.*?\]\]", "", ptext).strip()
        if ptext:
            toks.append(("p", ptext))
    return toks

def parse_table(rows):
    cells = []
    for r in rows:
        r = r.strip().strip("|")
        cols = [c.strip() for c in r.split("|")]
        cells.append(cols)
    # drop separator row (---)
    cells = [c for c in cells if not all(re.match(r"^:?-{2,}:?$", x.strip()) for x in c if x.strip()) or not c]
    cells = [c for c in cells if c and not all(re.match(r"^:?-{3,}:?$", x.strip() or "-") for x in c)]
    # simpler: remove rows that are all dashes
    out = []
    for c in rows:
        cc = [x.strip() for x in c.strip().strip("|").split("|")]
        if all(re.match(r"^:?-{2,}:?$", x) for x in cc if x != ""):
            continue
        out.append(cc)
    return out

# ---------------------------------------------------------------- citation numbering
def collect_citations(ordered_md):
    order, seen = [], set()
    for md in ordered_md:
        for m in re.finditer(r"\[CITE:\s*([A-Za-z0-9_,\-\s]+?)\]", md):
            for key in [k.strip() for k in m.group(1).split(",")]:
                if key and key not in seen:
                    seen.add(key); order.append(key)
    return {k: i + 1 for i, k in enumerate(order)}  # 1-based

def sub_citations(text, numbering):
    def repl(m):
        keys = [k.strip() for k in m.group(1).split(",") if k.strip()]
        nums = sorted({numbering.get(k) for k in keys if k in numbering})
        nums = [x for x in nums if x]
        return "[" + ",".join(str(x) for x in nums) + "]" if nums else ""
    return re.sub(r"\[CITE:\s*([A-Za-z0-9_,\-\s]+?)\]", repl, text)

# ---------------------------------------------------------------- oxml helpers
TNR = "Times New Roman"
def _set(el, tag, **attrs):
    e = OxmlElement(tag)
    for k, v in attrs.items():
        e.set(qn(k), str(v))
    el.append(e); return e

def style_run_font(run, size_pt=12, bold=False, underline=False, italic=False, font=TNR, color=None):
    run.font.name = font; run.font.size = Pt(size_pt)
    run.font.bold = bold; run.font.underline = underline; run.font.italic = italic
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rpr.insert(0, rf)
    for a in ("w:ascii", "w:hAnsi", "w:cs"):
        rf.set(qn(a), font)
    if color: run.font.color.rgb = color

def add_heading(doc, title, ilvl, citation_numbering=None, page_break=False, numbered=True):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:pStyle", **{"w:val": "ListParagraph"})
    if numbered:
        numPr = OxmlElement("w:numPr")
        _set(numPr, "w:ilvl", **{"w:val": str(ilvl)})
        _set(numPr, "w:numId", **{"w:val": "2"})
        pPr.append(numPr)
    if page_break:
        _set(pPr, "w:pageBreakBefore")
    # Guide §Headings: chapter = UPPER/Bold/14pt/left-justified; L1 = Bold/12pt/indent 0.6cm;
    # L2 = Normal(not bold)/Underlined/12pt/indent 1.2cm. Hanging indent (425tw≈0.75cm) keeps the
    # auto-number at the required position with wrapped text aligned under the heading text.
    if ilvl == 0:
        _set(pPr, "w:spacing", **{"w:after": "120", "w:before": "240"})
        _set(pPr, "w:ind", **{"w:left": "425", "w:hanging": "425"})      # number at margin
    elif ilvl == 1:
        _set(pPr, "w:spacing", **{"w:after": "0", "w:line": "360", "w:lineRule": "auto"})
        _set(pPr, "w:ind", **{"w:left": "765", "w:hanging": "425"})      # number at 0.6 cm
    else:
        _set(pPr, "w:spacing", **{"w:after": "0", "w:line": "360", "w:lineRule": "auto"})
        _set(pPr, "w:ind", **{"w:left": "1105", "w:hanging": "425"})     # number at 1.2 cm
    _set(pPr, "w:jc", **{"w:val": "left"})
    _set(pPr, "w:outlineLvl", **{"w:val": str(ilvl)})
    run = p.add_run(title.upper() if ilvl == 0 else title)
    style_run_font(run, size_pt=(14 if ilvl == 0 else 12),
                   bold=(ilvl < 2), underline=(ilvl >= 2))
    return p

def add_body(doc, text, citation_numbering, first_indent=True):
    text = sub_citations(text, citation_numbering)
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:jc", **{"w:val": "both"})
    _set(pPr, "w:spacing", **{"w:after": "120", "w:line": "360", "w:lineRule": "auto"})
    if first_indent:
        _set(pPr, "w:ind", **{"w:firstLine": "426"})
    add_inline_runs(p, text)
    return p

def add_inline_runs(p, text):
    # handle **bold**, *italic*, `code`
    parts = re.split(r"(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)", text)
    for part in parts:
        if not part: continue
        if part.startswith("**") and part.endswith("**"):
            r = p.add_run(part[2:-2]); style_run_font(r, bold=True)
        elif part.startswith("`") and part.endswith("`"):
            r = p.add_run(part[1:-1]); style_run_font(r, font="Consolas", size_pt=10.5)
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r = p.add_run(part[1:-1]); style_run_font(r, italic=True)
        else:
            r = p.add_run(part); style_run_font(r)

def add_bullet(doc, text, citation_numbering, numbered=False, idx=1):
    text = sub_citations(text, citation_numbering)
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:jc", **{"w:val": "both"})
    _set(pPr, "w:spacing", **{"w:after": "60", "w:line": "360", "w:lineRule": "auto"})
    _set(pPr, "w:ind", **{"w:left": "720", "w:hanging": "360"})
    marker = (str(idx) + ".\t") if numbered else "•\t"
    r = p.add_run(marker); style_run_font(r)
    add_inline_runs(p, text)
    return p

def add_caption(doc, label, chapter, is_first_in_chapter, text):
    """Caption paragraph: 'Figure C.' + SEQ(reset per chapter) + ' ' + text. Feeds TOC \\c."""
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:pStyle", **{"w:val": "Caption"})
    _set(pPr, "w:jc", **{"w:val": "center"})
    _set(pPr, "w:spacing", **{"w:before": "60", "w:after": "200"})
    def run_text(s, bold=True):
        r = p.add_run(s); style_run_font(r, size_pt=10, bold=bold); return r
    run_text(label + " " + str(chapter) + ".")
    # SEQ field
    def fld(instr):
        r = p.add_run(); fb = OxmlElement("w:fldChar"); fb.set(qn("w:fldCharType"), "begin"); r._r.append(fb)
        style_run_font(r, size_pt=10, bold=True)
        r2 = p.add_run(); it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr; r2._r.append(it)
        style_run_font(r2, size_pt=10, bold=True)
        r3 = p.add_run(); fs = OxmlElement("w:fldChar"); fs.set(qn("w:fldCharType"), "separate"); r3._r.append(fs)
        r4 = p.add_run("1"); style_run_font(r4, size_pt=10, bold=True)
        r5 = p.add_run(); fe = OxmlElement("w:fldChar"); fe.set(qn("w:fldCharType"), "end"); r5._r.append(fe)
    fld(" SEQ %s \\* ARABIC %s " % (label, ("\\r 1" if is_first_in_chapter else "")))
    run_text("  " + text, bold=False)
    return p

def add_figure(doc, key, caption, chapter, is_first):
    path_cap = FIGS.get(key)
    if not path_cap:
        # unknown figure key -> placeholder
        add_caption(doc, "Figure", chapter, is_first, caption or ("[missing figure: %s]" % key)); return False
    rel, default_cap = path_cap
    img = os.path.join(ROOT, rel)
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:jc", **{"w:val": "center"})
    _set(pPr, "w:spacing", **{"w:before": "120", "w:after": "0"})
    run = p.add_run()
    try:
        run.add_picture(img, width=Inches(5.9))
    except Exception as e:
        run.add_text("[image error: %s]" % e)
    add_caption(doc, "Figure", chapter, is_first, caption or default_cap)
    return True

def add_table(doc, caption, rows, chapter, is_first, citation_numbering):
    data = parse_table(rows)
    if caption:
        add_caption(doc, "Table", chapter, is_first, sub_citations(caption, citation_numbering))
    if not data: return
    ncols = max(len(r) for r in data)
    tbl = doc.add_table(rows=0, cols=ncols)
    tbl.style = "Table Grid"
    for ri, r in enumerate(data):
        cells = tbl.add_row().cells
        for ci in range(ncols):
            txt = sub_citations(r[ci], citation_numbering) if ci < len(r) else ""
            cell = cells[ci]; cell.text = ""
            para = cell.paragraphs[0]
            add_inline_runs(para, txt)
            for rr in para.runs:
                style_run_font(rr, size_pt=10, bold=(ri == 0))
    return tbl

def add_code(doc, text):
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:spacing", **{"w:after": "120", "w:line": "240", "w:lineRule": "auto"})
    _set(pPr, "w:ind", **{"w:left": "360"})
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), "F2F2F2"); pPr.append(shd)
    for j, line in enumerate(text.split("\n")):
        if j: p.add_run().add_break()
        r = p.add_run(line); style_run_font(r, font="Consolas", size_pt=9)
    return p

def add_equation(doc, name, eq, chapter, counter):
    counter[0] += 1
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr()
    _set(pPr, "w:jc", **{"w:val": "center"})
    _set(pPr, "w:spacing", **{"w:before": "60", "w:after": "60"})
    tabs = OxmlElement("w:tabs"); _set(tabs, "w:tab", **{"w:val": "right", "w:pos": "9000"}); pPr.append(tabs)
    r = p.add_run(eq if eq else name); style_run_font(r, italic=True)
    r2 = p.add_run("\t(Equation %d.%d)" % (chapter, counter[0])); style_run_font(r2)
    return p

# ---------------------------------------------------------------- body section reset
def remove_body_after_frontmatter(doc):
    body = doc.element.body
    # locate first ListParagraph heading (INTRODUCTION) among body children
    children = list(body)
    start = None
    for idx, ch in enumerate(children):
        if ch.tag == qn("w:p"):
            txt = "".join(t.text or "" for t in ch.iter(qn("w:t")))
            ps = ch.find(qn("w:pPr"))
            sty = ps.find(qn("w:pStyle")) if ps is not None else None
            if sty is not None and sty.get(qn("w:val")) == "ListParagraph" and "INTRODUCTION" in txt.upper():
                start = idx; break
    assert start is not None, "could not find INTRODUCTION heading"
    trailing = children[-1] if children[-1].tag == qn("w:sectPr") else None
    # remove everything from start to end except trailing sectPr
    for ch in children[start:]:
        if ch is trailing: continue
        body.remove(ch)
    return trailing

def configure_body_section(trailing_sectPr):
    """Make the single body section arabic, restart at 1, footer rId17 (footer with PAGE field)."""
    if trailing_sectPr is None: return
    # remove existing pgNumType / footerReference(default)
    for tag in ("w:pgNumType",):
        for e in trailing_sectPr.findall(qn(tag)):
            trailing_sectPr.remove(e)
    # set footer default -> rId17 (footer3 has PAGE field)
    for fr in trailing_sectPr.findall(qn("w:footerReference")):
        if fr.get(qn("w:type")) == "default":
            trailing_sectPr.remove(fr)
    fr = OxmlElement("w:footerReference"); fr.set(qn("w:type"), "default"); fr.set(qn("r:id"), "rId17")
    trailing_sectPr.insert(0, fr)
    png = OxmlElement("w:pgNumType"); png.set(qn("w:start"), "1")
    # insert pgNumType after pgMar
    pgmar = trailing_sectPr.find(qn("w:pgMar"))
    if pgmar is not None: pgmar.addnext(png)
    else: trailing_sectPr.append(png)

# ---------------------------------------------------------------- front matter text replace
def replace_frontmatter(doc, abstract, acknowledgements):
    for p in doc.paragraphs:
        txt = p.text.replace(" ", " ")
        def setp(newtext, **fmt):
            for r in list(p.runs):
                r._r.getparent().remove(r._r)
            r = p.add_run(newtext); style_run_font(r, **fmt)
        if "Copyright" in txt:
            setp("Copyright © " + ", ".join(AUTHORS) + ", " + YEAR + ". All rights reserved.")
        elif "InsERT TITLE OF YOUR PROJECT" in txt:
            setp(TITLE, bold=True, size_pt=14)
        elif "Insert second line of title" in txt:
            setp("")  # no second line
        elif "Group member" in txt:
            # fill three author lines in order via a counter on the function attribute
            replace_frontmatter._ai = getattr(replace_frontmatter, "_ai", 0)
            idx = replace_frontmatter._ai % 3
            setp(AUTHORS[idx] if idx < len(AUTHORS) else "")
            replace_frontmatter._ai += 1
        elif "Insert supervisor's title" in txt:
            setp(SUPERVISOR)
        elif "Insert co-advisor" in txt or "Co-advised by" in txt:
            setp("")
        elif "Year of Graduation" in txt:
            setp(YEAR)
        elif txt.strip().startswith("The abstract part is a brief summary"):
            setp(abstract)
            _ppr = p._p.get_or_add_pPr()
            for _ind in _ppr.findall(qn("w:ind")): _ppr.remove(_ind)   # drop template's 708 twips
            _set(_ppr, "w:ind", **{"w:firstLine": "426"})              # 0.75cm per Guide
        elif txt.strip().startswith("This part is optional"):
            setp(acknowledgements)
            _ppr = p._p.get_or_add_pPr()
            for _ind in _ppr.findall(qn("w:ind")): _ppr.remove(_ind)
            _set(_ppr, "w:ind", **{"w:firstLine": "426"})

# ---------------------------------------------------------------- main build
FIG_RE = r"\[\[FIG:\s*([A-Za-z0-9_\-]+)\s*(?:\|\s*(.*?))?\]\]"

def number_figures(toks):
    """Per-chapter figure number by FIRST appearance (inline-in-text or standalone)."""
    fignum = {}; c = 0
    for t in toks:
        if t[0] in ("p", "bullet", "num"):
            for m in re.finditer(FIG_RE, t[1]):
                if m.group(1) not in fignum:
                    c += 1; fignum[m.group(1)] = c
        elif t[0] == "fig":
            if t[1] not in fignum:
                c += 1; fignum[t[1]] = c
    return fignum

def render_chapter(doc, chapter_no, toks, citation_numbering):
    tbl_count = [0]; eq_count = [0]
    fignum = number_figures(toks)
    embedded = set(); first_fig = [True]; first_tbl = [True]

    def fig_ref(text):
        return re.sub(FIG_RE, lambda m: "Figure %d.%d" % (chapter_no, fignum.get(m.group(1), 0)), text)

    def embed(key, cap):
        if key in embedded:
            return
        embedded.add(key)
        add_figure(doc, key, cap, chapter_no, first_fig[0])
        first_fig[0] = False

    def text_token(render_fn, text):
        keys = [(m.group(1), (m.group(2) or "").strip()) for m in re.finditer(FIG_RE, text)]
        render_fn(fig_ref(text))
        for k, cap in keys:
            embed(k, cap)

    for t in toks:
        if t[0] == "h":
            ilvl = t[1] - 1
            add_heading(doc, t[2], ilvl, page_break=(ilvl == 0))
        elif t[0] == "p":
            text_token(lambda s: add_body(doc, s, citation_numbering, first_indent=True), t[1])
        elif t[0] == "bullet":
            text_token(lambda s: add_bullet(doc, s, citation_numbering), t[1])
        elif t[0] == "num":
            text_token(lambda s: add_bullet(doc, s, citation_numbering, numbered=True), t[1])
        elif t[0] == "fig":
            embed(t[1], t[2])
        elif t[0] == "table":
            tbl_count[0] += 1
            add_table(doc, t[1], t[2], chapter_no, first_tbl[0], citation_numbering)
            first_tbl[0] = False
        elif t[0] == "eq":
            add_equation(doc, t[1], t[2], chapter_no, eq_count)
        elif t[0] == "code":
            add_code(doc, t[1])

def add_references(doc, citation_numbering):
    add_heading(doc, "REFERENCES", 0, page_break=True, numbered=False)
    inv = sorted(citation_numbering.items(), key=lambda kv: kv[1])
    for key, num in inv:
        ref = REFS.get(key, "[MISSING REFERENCE: %s]" % key)
        ref = re.sub(r"\*(.+?)\*", r"\1", ref)  # strip md italics (we add via runs)
        p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr()
        _set(pPr, "w:jc", **{"w:val": "both"})
        _set(pPr, "w:spacing", **{"w:after": "120", "w:line": "276", "w:lineRule": "auto"})
        _set(pPr, "w:ind", **{"w:left": "567", "w:hanging": "567"})
        r = p.add_run("[%d] " % num); style_run_font(r, bold=True)
        r2 = p.add_run(ref); style_run_font(r2)

def main():
    doc = Document(TEMPLATE)
    # read chapters
    def read(name):
        path = os.path.join(CHAP_DIR, name)
        return open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    fm = read("00_frontmatter.md")
    chap_md = {i: read("ch%d.md" % i) for i in range(1, 8)}
    appendix_md = read("appendices.md")

    # extract abstract + acknowledgements from frontmatter
    abstract, ack = "", ""
    fm_secs = re.split(r"^#\s+", fm, flags=re.M)
    for sec in fm_secs:
        if sec.upper().startswith("ABSTRACT"):
            abstract = re.sub(r"^ABSTRACT\s*", "", sec, flags=re.I).strip()
        elif sec.upper().startswith("ACKNOWLEDG"):
            ack = re.sub(r"^ACKNOWLEDGE\w*\s*", "", sec, flags=re.I).strip()
    abstract = " ".join(abstract.split())
    ack = " ".join(ack.split())

    # citation numbering across body in order
    ordered = [chap_md[i] for i in range(1, 8)] + [appendix_md]
    citation_numbering = collect_citations(ordered)

    replace_frontmatter(doc, abstract or "(abstract pending)", ack or "")
    trailing = remove_body_after_frontmatter(doc)
    for i in range(1, 8):
        if chap_md[i].strip():
            render_chapter(doc, i, tokenize(chap_md[i]), citation_numbering)
    add_references(doc, citation_numbering)
    if appendix_md.strip():
        render_appendices(doc, appendix_md, citation_numbering)
    configure_body_section(trailing)
    # ask Word to refresh all fields (ToC / List of Figures / List of Tables / SEQ / PAGEREF) on open
    settings = doc.settings.element
    if settings.find(qn("w:updateFields")) is None:
        uf = OxmlElement("w:updateFields"); uf.set(qn("w:val"), "true"); settings.append(uf)
    doc.save(OUT)
    # stats
    wc_abs = len(abstract.split())
    print("SAVED:", OUT)
    print("abstract words:", wc_abs, "(target 150-300)")
    print("citations:", len(citation_numbering))
    missing = [k for k in citation_numbering if k not in REFS]
    print("missing refs:", missing if missing else "none")

def render_appendices(doc, md, citation_numbering):
    letters = iter("ABCDEFGHIJ")
    cur_letter = ["A"]; first_tbl = [True]
    for t in tokenize(md):
        if t[0] == "h" and t[1] == 1:
            cur_letter[0] = next(letters); first_tbl[0] = True
            add_heading(doc, t[2], 0, numbered=False, page_break=True)  # APPENDIX X — Title (new page)
        elif t[0] == "h":
            add_heading(doc, t[2], t[1] - 1, numbered=False)
        elif t[0] == "p":
            add_body(doc, t[1], citation_numbering)
        elif t[0] == "bullet":
            add_bullet(doc, t[1], citation_numbering)
        elif t[0] == "num":
            add_bullet(doc, t[1], citation_numbering, numbered=True)
        elif t[0] == "table":
            add_table(doc, t[1], t[2], cur_letter[0], first_tbl[0], citation_numbering)
            first_tbl[0] = False
        elif t[0] == "code":
            add_code(doc, t[1])

if __name__ == "__main__":
    main()
