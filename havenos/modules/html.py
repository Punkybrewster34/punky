"""Shared single-file HTML dashboard rendering — brand colors, HAVEN
serif wordmark, mobile-readable, zero external assets, no web server."""
import html as _html
import os
from datetime import datetime

from . import config
from .constants import BRAND


def esc(x):
    return _html.escape("" if x is None else str(x))


def money(x):
    if x is None:
        return "—"
    return f"${x:,.2f}" if abs(x - round(x)) > 0.004 else f"${x:,.0f}"


def pct(x):
    return "—" if x is None else f"{x:.0f}%"


_CSS = f"""
:root {{
  --navy:{BRAND['navy']}; --blue:{BRAND['blue']}; --lblue:{BRAND['light_blue']};
  --orange:{BRAND['orange']}; --gold:{BRAND['gold']}; --green:{BRAND['green']};
  --gray:{BRAND['gray']};
}}
* {{ box-sizing:border-box; margin:0; padding:0; }}
body {{ font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
       background:#f6f8fc; color:#1a2333; padding:0 0 40px; }}
header {{ background:var(--navy); color:#fff; padding:18px 20px 14px; }}
.wordmark {{ font-family:Georgia,'Times New Roman',serif; font-size:26px;
  letter-spacing:4px; font-weight:700; }}
.wordmark span {{ color:var(--gold); }}
.subtitle {{ font-size:13px; color:var(--lblue); margin-top:2px;
  font-family:inherit; letter-spacing:1px; }}
main {{ max-width:860px; margin:0 auto; padding:16px; }}
h2 {{ color:var(--navy); font-size:16px; text-transform:uppercase;
  letter-spacing:1.5px; margin:26px 0 10px; border-bottom:3px solid var(--gold);
  display:inline-block; padding-bottom:3px; }}
.tiles {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
  gap:10px; }}
.tile {{ background:#fff; border:1px solid var(--gray); border-radius:10px;
  padding:12px 14px; }}
.tile .label {{ font-size:11px; text-transform:uppercase; letter-spacing:1px;
  color:#5b6b85; }}
.tile .value {{ font-size:24px; font-weight:700; color:var(--navy); margin-top:2px; }}
.tile .delta {{ font-size:12px; margin-top:2px; }}
.up {{ color:var(--green); }} .down {{ color:#c0392b; }} .flat {{ color:#5b6b85; }}
table {{ width:100%; border-collapse:collapse; background:#fff; font-size:13px;
  border:1px solid var(--gray); border-radius:10px; overflow:hidden; }}
th {{ background:var(--navy); color:#fff; text-align:left; padding:8px 10px;
  font-size:11px; text-transform:uppercase; letter-spacing:1px; }}
td {{ padding:8px 10px; border-top:1px solid var(--gray); vertical-align:top; }}
tr:nth-child(even) td {{ background:#f9fafc; }}
.scroll {{ overflow-x:auto; }}
.badge {{ display:inline-block; padding:2px 8px; border-radius:999px;
  font-size:11px; font-weight:700; }}
.badge.green {{ background:#e8f1da; color:var(--green); }}
.badge.red {{ background:#fde8e6; color:#c0392b; }}
.badge.amber {{ background:#fff3d6; color:#9a6b00; }}
.progress {{ background:var(--gray); border-radius:999px; height:22px;
  position:relative; overflow:hidden; }}
.progress .bar {{ background:linear-gradient(90deg,var(--blue),var(--lblue));
  height:100%; border-radius:999px; }}
.progress .text {{ position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center; font-size:12px; font-weight:700; color:var(--navy); }}
.note {{ font-size:12px; color:#5b6b85; margin-top:8px; line-height:1.5; }}
.callout {{ background:#fff; border-left:5px solid var(--orange);
  border-radius:8px; padding:12px 14px; margin:10px 0; font-size:14px; }}
.msg {{ background:#f0f5ff; border:1px dashed var(--blue); border-radius:8px;
  padding:10px 12px; font-size:13px; margin:6px 0; white-space:pre-wrap; }}
footer {{ max-width:860px; margin:30px auto 0; padding:0 16px; font-size:11px;
  color:#8a97ab; line-height:1.6; }}
"""


def page(title, body_html, subtitle=""):
    stamp = datetime.now().strftime("%A %b %d, %Y · %I:%M %p")
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} · HavenOS</title><style>{_CSS}</style></head>
<body>
<header>
  <div class="wordmark">H A V E N<span> OS</span></div>
  <div class="subtitle">{esc(subtitle or title)} · generated {stamp}</div>
</header>
<main>{body_html}</main>
<footer>Haven House Cleaning · havenhouseclean.com · Phoenix &amp; Tucson, AZ.
Local file — no hosting, no server. Regenerate with <b>python haven.py</b>.</footer>
</body></html>"""


def tile(label, value, delta=None):
    d = ""
    if delta is not None:
        cls = "up" if delta.startswith("+") else ("down" if delta.startswith("-") else "flat")
        d = f'<div class="delta {cls}">{esc(delta)} vs last wk</div>'
    return (f'<div class="tile"><div class="label">{esc(label)}</div>'
            f'<div class="value">{esc(value)}</div>{d}</div>')


def table(headers, rows):
    th = "".join(f"<th>{esc(h)}</th>" for h in headers)
    trs = "".join(
        "<tr>" + "".join(f"<td>{c if str(c).startswith('<') else esc(c)}</td>"
                         for c in row) + "</tr>"
        for row in rows)
    return f'<div class="scroll"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>'


def badge(text, color):
    return f'<span class="badge {color}">{esc(text)}</span>'


def progress_bar(current, target, label):
    p = 0 if not target else max(0, min(100, current / target * 100))
    return (f'<div class="progress"><div class="bar" style="width:{p:.1f}%"></div>'
            f'<div class="text">{esc(label)}</div></div>')


def write(filename, html_text):
    os.makedirs(config.DASHBOARDS_DIR, exist_ok=True)
    path = os.path.join(config.DASHBOARDS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_text)
    return path
