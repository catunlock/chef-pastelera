#!/usr/bin/env python3
"""
Professional PDF CV & Portfolio Generator for Chef Pastelera.
Reads data.json and generates a polished, two-column A4 PDF.

Usage:
    python3 generate_pdf.py                  # Full CV + Portfolio
    python3 generate_pdf.py --cv-only        # Only CV
    python3 generate_pdf.py --portfolio-only  # Only portfolio
    python3 generate_pdf.py -o output.pdf    # Custom filename
"""

import json
import os
import argparse
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line
from reportlab.graphics import renderPDF

# ─── Constants ───────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
FONTS_DIR = BASE_DIR / "fonts"
IMAGES_DIR = BASE_DIR / "images"
DATA_FILE = BASE_DIR / "data.json"

PAGE_W, PAGE_H = A4  # 210mm x 297mm
MARGIN = 15 * mm

# Colors matching the website palette
GOLD = HexColor("#cfa874")
GOLD_LIGHT = HexColor("#f5efe6")
DARK = HexColor("#2c2a29")
GRAY = HexColor("#6b6764")
LIGHT_GRAY = HexColor("#eae5de")
BG_SIDEBAR = HexColor("#2c2a29")
BG_SIDEBAR_TEXT = HexColor("#e8e4df")
WHITE = HexColor("#ffffff")

# ─── Font Registration ──────────────────────────────────────────────────────

def register_fonts():
    """Register custom fonts for the PDF."""
    font_map = {
        "Playfair": "PlayfairDisplay-Regular.ttf",
        "Playfair-Bold": "PlayfairDisplay-Bold.ttf",
        "Playfair-SemiBold": "PlayfairDisplay-SemiBold.ttf",
        "Playfair-Italic": "PlayfairDisplay-Italic.ttf",
        "Inter": "Inter-Regular.ttf",
        "Inter-Light": "Inter-Light.ttf",
        "Inter-Medium": "Inter-Medium.ttf",
        "Inter-SemiBold": "Inter-SemiBold.ttf",
        "Inter-Bold": "Inter-Bold.ttf",
    }
    for name, filename in font_map.items():
        path = FONTS_DIR / filename
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
        else:
            print(f"  Warning: Font {filename} not found, using fallback")

# ─── Styles ──────────────────────────────────────────────────────────────────

def create_styles():
    """Create paragraph styles for the PDF."""
    return {
        # Main content styles
        "name": ParagraphStyle(
            "Name", fontName="Playfair-Bold", fontSize=26, leading=30,
            textColor=DARK, spaceAfter=2 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", fontName="Inter-Light", fontSize=10, leading=14,
            textColor=GOLD, spaceAfter=4 * mm,
            tracking=2,
        ),
        "bio": ParagraphStyle(
            "Bio", fontName="Inter", fontSize=9, leading=14,
            textColor=GRAY, spaceAfter=6 * mm, alignment=TA_JUSTIFY,
        ),
        "section_heading": ParagraphStyle(
            "SectionHeading", fontName="Playfair-SemiBold", fontSize=13, leading=16,
            textColor=GOLD, spaceAfter=4 * mm, spaceBefore=2 * mm,
        ),
        "job_title": ParagraphStyle(
            "JobTitle", fontName="Inter-SemiBold", fontSize=10, leading=13,
            textColor=DARK,
        ),
        "job_meta": ParagraphStyle(
            "JobMeta", fontName="Inter", fontSize=8, leading=11,
            textColor=GRAY,
        ),
        "job_duty": ParagraphStyle(
            "JobDuty", fontName="Inter", fontSize=8, leading=12,
            textColor=DARK, leftIndent=8,
        ),
        "edu_title": ParagraphStyle(
            "EduTitle", fontName="Inter-SemiBold", fontSize=9, leading=12,
            textColor=DARK,
        ),
        "edu_detail": ParagraphStyle(
            "EduDetail", fontName="Inter", fontSize=8, leading=11,
            textColor=GRAY,
        ),
        # Sidebar styles
        "sidebar_heading": ParagraphStyle(
            "SidebarHeading", fontName="Playfair-SemiBold", fontSize=11, leading=14,
            textColor=GOLD, spaceAfter=3 * mm, spaceBefore=4 * mm,
        ),
        "sidebar_text": ParagraphStyle(
            "SidebarText", fontName="Inter", fontSize=8.5, leading=12,
            textColor=BG_SIDEBAR_TEXT,
        ),
        "sidebar_bold": ParagraphStyle(
            "SidebarBold", fontName="Inter-SemiBold", fontSize=8.5, leading=12,
            textColor=WHITE,
        ),
        "sidebar_label": ParagraphStyle(
            "SidebarLabel", fontName="Inter-Light", fontSize=7.5, leading=10,
            textColor=GOLD,
        ),
        # Portfolio styles
        "portfolio_title": ParagraphStyle(
            "PortfolioTitle", fontName="Playfair-Bold", fontSize=22, leading=26,
            textColor=DARK, alignment=TA_CENTER, spaceAfter=3 * mm,
        ),
        "portfolio_intro": ParagraphStyle(
            "PortfolioIntro", fontName="Inter", fontSize=10, leading=15,
            textColor=GRAY, alignment=TA_CENTER, spaceAfter=10 * mm,
        ),
        "dessert_name": ParagraphStyle(
            "DessertName", fontName="Playfair-SemiBold", fontSize=11, leading=14,
            textColor=DARK, spaceAfter=1 * mm,
        ),
        "dessert_origin": ParagraphStyle(
            "DessertOrigin", fontName="Inter-Medium", fontSize=7.5, leading=10,
            textColor=GOLD, spaceAfter=2 * mm,
        ),
        "dessert_desc": ParagraphStyle(
            "DessertDesc", fontName="Inter", fontSize=8, leading=12,
            textColor=GRAY,
        ),
    }


# ─── CV Page ─────────────────────────────────────────────────────────────────

def draw_cv_page(canvas, doc, data, styles):
    """Draw the CV page with sidebar + main content."""
    profile = data["profile"]
    canvas.saveState()

    # ── Sidebar background ──
    sidebar_w = 65 * mm
    canvas.setFillColor(BG_SIDEBAR)
    canvas.rect(0, 0, sidebar_w, PAGE_H, fill=1, stroke=0)

    # ── Sidebar content ──
    sx = 8 * mm  # sidebar x margin
    sw = sidebar_w - 16 * mm  # sidebar content width
    sy = PAGE_H - 15 * mm  # start y

    # Profile photo
    img_path = BASE_DIR / profile.get("image", "")
    if img_path.exists():
        # Draw circular clip effect with a gold ring
        photo_size = 42 * mm
        photo_x = (sidebar_w - photo_size) / 2
        photo_y = sy - photo_size
        
        # Gold ring
        canvas.setStrokeColor(GOLD)
        canvas.setLineWidth(1.5)
        cx = photo_x + photo_size / 2
        cy = photo_y + photo_size / 2
        canvas.circle(cx, cy, photo_size / 2 + 1.5, fill=0)
        
        # Clip to circle and draw image
        canvas.saveState()
        p = canvas.beginPath()
        p.circle(cx, cy, photo_size / 2)
        canvas.clipPath(p, stroke=0)
        canvas.drawImage(str(img_path), photo_x, photo_y, photo_size, photo_size,
                         preserveAspectRatio=True, mask='auto')
        canvas.restoreState()
        
        sy = photo_y - 8 * mm

    # Contact section
    sy = _draw_sidebar_section(canvas, "CONTACTO", sx, sy, sw, styles)
    
    if profile.get("contact"):
        sy = _draw_sidebar_item(canvas, "Email", profile["contact"], sx, sy, sw, styles)
    
    # Phone number is hardcoded here for privacy on the web, but included in the PDF CV
    phone = profile.get("phone", "+34 652 95 27 47")
    if phone:
        sy = _draw_sidebar_item(canvas, "Teléfono", phone, sx, sy, sw, styles)
        
    if profile.get("instagram"):
        ig = profile["instagram"]
        handle = ig.split("/")[-1] if "http" in ig else ig.replace("@", "")
        sy = _draw_sidebar_item(canvas, "Instagram", f"@{handle}", sx, sy, sw, styles)

    # Languages
    if profile.get("languages"):
        sy -= 2 * mm
        sy = _draw_sidebar_section(canvas, "IDIOMAS", sx, sy, sw, styles)
        for lang in profile["languages"]:
            text = f'{lang["lang"]} — {lang["level"]}'
            sy = _draw_sidebar_text(canvas, text, sx, sy, sw, styles)

    # Specialties
    if profile.get("specialties"):
        sy -= 2 * mm
        sy = _draw_sidebar_section(canvas, "ESPECIALIDADES", sx, sy, sw, styles)
        for spec in profile["specialties"]:
            # Split on em-dash
            parts = spec.split("—")
            if len(parts) == 2:
                sy = _draw_sidebar_text(canvas, f'<b>{parts[0].strip()}</b>', sx, sy, sw, styles, bold=True)
                sy = _draw_sidebar_text(canvas, parts[1].strip(), sx, sy, sw, styles)
                sy -= 1.5 * mm
            else:
                sy = _draw_sidebar_text(canvas, spec, sx, sy, sw, styles)

    # ── Main content ──
    mx = sidebar_w + 10 * mm  # main x
    mw = PAGE_W - mx - MARGIN  # main width
    my = PAGE_H - 18 * mm  # main start y

    # Name
    canvas.setFont("Playfair-Bold", 26)
    canvas.setFillColor(DARK)
    canvas.drawString(mx, my, profile.get("name", ""))
    my -= 8 * mm

    # Subtitle
    canvas.setFont("Inter-Light", 10)
    canvas.setFillColor(GOLD)
    canvas.drawString(mx, my, "CHEF INTERNACIONAL EN PASTELERÍA")
    my -= 4 * mm

    # Gold accent line
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    canvas.line(mx, my, mx + 40 * mm, my)
    my -= 6 * mm

    # Bio
    bio_style = ParagraphStyle("BioMain", fontName="Inter", fontSize=8.5, leading=13,
                               textColor=GRAY, alignment=TA_JUSTIFY)
    bio_para = Paragraph(profile.get("bio", ""), bio_style)
    bio_w, bio_h = bio_para.wrap(mw, 200 * mm)
    bio_para.drawOn(canvas, mx, my - bio_h)
    my -= bio_h + 8 * mm

    # Experience section
    if profile.get("experience"):
        my = _draw_main_heading(canvas, "EXPERIENCIA PROFESIONAL", mx, my, mw)
        
        for job in profile["experience"]:
            if my < 30 * mm:
                break  # Prevent overflow
            
            # Role
            canvas.setFont("Inter-SemiBold", 9.5)
            canvas.setFillColor(DARK)
            canvas.drawString(mx, my, job["role"])
            
            # Period (right-aligned)
            period_text = job.get("period", "")
            canvas.setFont("Inter", 8)
            canvas.setFillColor(GOLD)
            tw = canvas.stringWidth(period_text, "Inter", 8)
            canvas.drawString(mx + mw - tw, my, period_text)
            my -= 4.5 * mm

            # Company + Country
            canvas.setFont("Inter", 8)
            canvas.setFillColor(GRAY)
            meta = f'{job["company"]}  ·  {job.get("country", "")}'
            canvas.drawString(mx, my, meta)
            my -= 5 * mm

            # Duties
            for duty in job.get("duties", []):
                if my < 25 * mm:
                    break
                duty_style = ParagraphStyle("Duty", fontName="Inter", fontSize=7.5, leading=10.5,
                                           textColor=DARK, leftIndent=6)
                # Prefix with accent chevron
                duty_text = f'<font color="{GOLD.hexval()}">›</font>  {duty}'
                p = Paragraph(duty_text, duty_style)
                pw, ph = p.wrap(mw - 4, 100 * mm)
                p.drawOn(canvas, mx + 2, my - ph)
                my -= ph + 1 * mm
            
            my -= 3 * mm

    # Education / Titles
    if profile.get("titles") and my > 50 * mm:
        my = _draw_main_heading(canvas, "FORMACIÓN ACADÉMICA", mx, my, mw)
        
        for title in profile["titles"]:
            canvas.setFont("Inter-SemiBold", 9)
            canvas.setFillColor(DARK)
            name_text = title["name"]
            canvas.drawString(mx, my, name_text)
            
            # Period
            canvas.setFont("Inter", 8)
            canvas.setFillColor(GOLD)
            period = f'({title.get("period", "")})'
            tw = canvas.stringWidth(name_text, "Inter-SemiBold", 9)
            canvas.drawString(mx + tw + 3 * mm, my, period)
            my -= 4 * mm
            
            # Institution
            canvas.setFont("Inter", 8)
            canvas.setFillColor(GRAY)
            canvas.drawString(mx, my, title.get("institution", ""))
            my -= 7 * mm

    canvas.restoreState()


def _draw_sidebar_section(canvas, title, x, y, w, styles):
    """Draw a sidebar section heading with underline."""
    canvas.setFont("Playfair-SemiBold", 10)
    canvas.setFillColor(GOLD)
    canvas.drawString(x, y, title)
    y -= 3 * mm
    canvas.setStrokeColor(Color(1, 1, 1, 0.15))
    canvas.setLineWidth(0.5)
    canvas.line(x, y, x + w, y)
    y -= 5 * mm
    return y


def _draw_sidebar_item(canvas, label, value, x, y, w, styles):
    """Draw a label/value pair in the sidebar."""
    canvas.setFont("Inter-Light", 7)
    canvas.setFillColor(GOLD)
    canvas.drawString(x, y, label.upper())
    y -= 3.5 * mm
    
    # Handle long values by wrapping
    style = ParagraphStyle("SVal", fontName="Inter", fontSize=8, leading=11, textColor=BG_SIDEBAR_TEXT)
    p = Paragraph(value, style)
    pw, ph = p.wrap(w, 50 * mm)
    p.drawOn(canvas, x, y - ph)
    y -= ph + 3 * mm
    return y


def _draw_sidebar_text(canvas, text, x, y, w, styles, bold=False):
    """Draw a line of text in the sidebar."""
    font = "Inter-SemiBold" if bold else "Inter"
    color = WHITE if bold else BG_SIDEBAR_TEXT
    style = ParagraphStyle("ST", fontName=font, fontSize=8, leading=11, textColor=color)
    p = Paragraph(text, style)
    pw, ph = p.wrap(w, 50 * mm)
    p.drawOn(canvas, x, y - ph)
    y -= ph + 1 * mm
    return y


def _draw_main_heading(canvas, title, x, y, w):
    """Draw a section heading in the main content area."""
    canvas.setFont("Playfair-SemiBold", 12)
    canvas.setFillColor(GOLD)
    canvas.drawString(x, y, title)
    y -= 3 * mm
    canvas.setStrokeColor(LIGHT_GRAY)
    canvas.setLineWidth(0.5)
    canvas.line(x, y, x + w, y)
    y -= 6 * mm
    return y


# ─── Portfolio Pages ─────────────────────────────────────────────────────────

def build_portfolio_pages(data, styles):
    """Build portfolio pages as a list of flowables."""
    elements = []
    desserts = data.get("desserts", [])
    if not desserts:
        return elements

    # Title page header
    elements.append(Spacer(1, 15 * mm))
    elements.append(Paragraph("Portfolio Personal", styles["portfolio_title"]))
    
    # Gold line
    elements.append(HRFlowable(
        width="30%", thickness=1, color=GOLD,
        spaceAfter=5 * mm, spaceBefore=2 * mm,
        hAlign="CENTER"
    ))
    
    elements.append(Paragraph(
        "La pastelería es mucho más que una profesión: es una forma de arte donde la "
        "precisión se une con la creatividad. En esta selección presento mis trabajos, "
        "elaboraciones y técnicas que reflejan mi pasión por la repostería.",
        styles["portfolio_intro"]
    ))

    # Build dessert cards in pairs (2 per row)
    for i in range(0, len(desserts), 2):
        row_data = []
        for j in range(2):
            idx = i + j
            if idx < len(desserts):
                dessert = desserts[idx]
                cell = _build_dessert_cell(dessert, styles)
                row_data.append(cell)
            else:
                row_data.append("")

        col_w = (PAGE_W - 2 * MARGIN - 8 * mm) / 2
        table = Table([row_data], colWidths=[col_w, col_w], spaceBefore=4 * mm)
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(KeepTogether([table]))

    return elements


def _build_dessert_cell(dessert, styles):
    """Build a single dessert card as a list of flowables in a cell."""
    cell_elements = []
    
    # Image
    img_path = BASE_DIR / dessert.get("mainImage", "")
    if img_path.exists():
        img_w = 80 * mm
        img_h = 55 * mm
        try:
            img = Image(str(img_path), width=img_w, height=img_h)
            img.hAlign = "CENTER"
            cell_elements.append(img)
        except Exception:
            pass
    
    cell_elements.append(Spacer(1, 2 * mm))
    cell_elements.append(Paragraph(dessert.get("name", ""), styles["dessert_name"]))
    
    origin = dessert.get("origin", "")
    if origin:
        cell_elements.append(Paragraph(origin.upper(), styles["dessert_origin"]))
    
    desc = dessert.get("description", "")
    if desc:
        cell_elements.append(Paragraph(desc, styles["dessert_desc"]))
    
    return cell_elements


# ─── Main ────────────────────────────────────────────────────────────────────

def generate_pdf(output_path, cv_only=False, portfolio_only=False):
    """Generate the complete PDF."""
    print(f"📄 Generating PDF: {output_path}")
    
    # Load data
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    register_fonts()
    styles = create_styles()

    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as pdf_canvas

    c = pdf_canvas.Canvas(str(output_path), pagesize=A4)
    c.setTitle(f'{data["profile"].get("name", "CV")} — Curriculum Vitae')
    c.setAuthor(data["profile"].get("name", ""))
    c.setSubject("Curriculum Vitae & Portfolio")

    # Page 1: CV
    if not portfolio_only:
        draw_cv_page(c, None, data, styles)
        if not cv_only:
            c.showPage()

    # Portfolio pages
    if not cv_only:
        desserts = data.get("desserts", [])
        if desserts:
            if portfolio_only:
                pass  # First page already
            _draw_portfolio_pages(c, data, styles)

    c.save()
    print(f"✅ PDF saved: {output_path}")
    print(f"   Size: {os.path.getsize(output_path) / 1024:.1f} KB")


def _draw_portfolio_pages(canvas, data, styles):
    """Draw portfolio pages directly on canvas for full control."""
    desserts = data.get("desserts", [])
    if not desserts:
        return

    # Portfolio title page
    canvas.showPage() if not hasattr(canvas, '_portfolio_first') else None
    
    y = PAGE_H - 35 * mm
    
    # Title
    canvas.setFont("Playfair-Bold", 24)
    canvas.setFillColor(DARK)
    title = "Portfolio Personal"
    tw = canvas.stringWidth(title, "Playfair-Bold", 24)
    canvas.drawString((PAGE_W - tw) / 2, y, title)
    y -= 8 * mm

    # Gold line
    line_w = 50 * mm
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    canvas.line((PAGE_W - line_w) / 2, y, (PAGE_W + line_w) / 2, y)
    y -= 8 * mm

    # Intro paragraph
    intro_style = ParagraphStyle("Intro", fontName="Inter", fontSize=9.5, leading=14,
                                  textColor=GRAY, alignment=TA_CENTER)
    intro = Paragraph(
        "La pastelería es mucho más que una profesión: es una forma de arte donde la "
        "precisión se une con la creatividad. En esta selección presento mis trabajos, "
        "elaboraciones y técnicas que reflejan mi pasión por la repostería.",
        intro_style
    )
    iw, ih = intro.wrap(PAGE_W - 60 * mm, 100 * mm)
    intro.drawOn(canvas, 30 * mm, y - ih)
    y -= ih + 12 * mm

    # Draw desserts in 2-column grid
    col_w = (PAGE_W - 2 * MARGIN - 10 * mm) / 2
    img_target_h = 52 * mm
    
    for i, dessert in enumerate(desserts):
        col = i % 2
        
        # Calculate x position
        x = MARGIN + col * (col_w + 10 * mm)
        
        # New page if needed
        if col == 0 and y < 80 * mm:
            canvas.showPage()
            y = PAGE_H - 20 * mm

        card_y = y

        # Image
        img_path = BASE_DIR / dessert.get("mainImage", "")
        if img_path.exists():
            try:
                from PIL import Image as PILImage
                with PILImage.open(img_path) as pil_img:
                    orig_w, orig_h = pil_img.size
                
                aspect = orig_w / orig_h
                img_w = col_w - 4 * mm
                img_h = img_w / aspect
                if img_h > img_target_h:
                    img_h = img_target_h
                    img_w = img_h * aspect

                canvas.drawImage(str(img_path), x + 2 * mm, card_y - img_h,
                                 width=img_w, height=img_h,
                                 preserveAspectRatio=True, mask='auto')
                card_y -= img_h + 3 * mm
            except Exception as e:
                card_y -= 5 * mm
        
        # Name
        canvas.setFont("Playfair-SemiBold", 10)
        canvas.setFillColor(DARK)
        canvas.drawString(x + 2 * mm, card_y, dessert.get("name", ""))
        card_y -= 4 * mm

        # Origin
        origin = dessert.get("origin", "")
        if origin:
            canvas.setFont("Inter-Medium", 7)
            canvas.setFillColor(GOLD)
            canvas.drawString(x + 2 * mm, card_y, origin.upper())
            card_y -= 4 * mm

        # Description
        desc = dessert.get("description", "")
        if desc:
            desc_style = ParagraphStyle("D", fontName="Inter", fontSize=7.5, leading=10.5,
                                        textColor=GRAY)
            p = Paragraph(desc, desc_style)
            pw, ph = p.wrap(col_w - 6 * mm, 60 * mm)
            p.drawOn(canvas, x + 2 * mm, card_y - ph)
            card_y -= ph + 2 * mm

        # Update y for next row (only on right column)
        if col == 1:
            y = min(y, card_y) - 6 * mm
        elif i == len(desserts) - 1:
            # Last dessert and it's in left column
            y = card_y - 6 * mm


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate professional PDF CV & Portfolio")
    parser.add_argument("-o", "--output", default="cv_yuliana_diaz.pdf",
                        help="Output PDF filename (default: cv_yuliana_diaz.pdf)")
    parser.add_argument("--cv-only", action="store_true",
                        help="Generate only the CV page (no portfolio)")
    parser.add_argument("--portfolio-only", action="store_true",
                        help="Generate only the portfolio pages (no CV)")
    
    args = parser.parse_args()
    
    output = BASE_DIR / args.output
    generate_pdf(output, cv_only=args.cv_only, portfolio_only=args.portfolio_only)
