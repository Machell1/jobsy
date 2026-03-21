"""PDF generator for Jobsy contracts using reportlab.

Produces a professional, multi-page PDF with:
- Jobsy branded header
- Contract details summary
- Full scope of work
- Terms and conditions
- Signature blocks
- Footer with reference number and legal note
"""

from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageBreak,
    PageTemplate,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
JOBSY_GREEN = colors.HexColor("#1B5E20")
JOBSY_LIGHT_GREEN = colors.HexColor("#E8F5E9")
HEADER_BG = JOBSY_GREEN
TEXT_DARK = colors.HexColor("#212121")
TEXT_GREY = colors.HexColor("#757575")
LINE_COLOUR = colors.HexColor("#C8E6C9")


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------

def _build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ContractTitle",
            parent=base["Title"],
            fontSize=18,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=4 * mm,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "ContractSubtitle",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.white,
            alignment=TA_CENTER,
            fontName="Helvetica",
        ),
        "section_heading": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading2"],
            fontSize=13,
            textColor=JOBSY_GREEN,
            spaceBefore=8 * mm,
            spaceAfter=3 * mm,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "ContractBody",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            textColor=TEXT_DARK,
            alignment=TA_JUSTIFY,
            fontName="Helvetica",
        ),
        "detail_label": ParagraphStyle(
            "DetailLabel",
            parent=base["Normal"],
            fontSize=10,
            textColor=TEXT_GREY,
            fontName="Helvetica-Bold",
        ),
        "detail_value": ParagraphStyle(
            "DetailValue",
            parent=base["Normal"],
            fontSize=10,
            textColor=TEXT_DARK,
            fontName="Helvetica",
        ),
        "footer": ParagraphStyle(
            "FooterStyle",
            parent=base["Normal"],
            fontSize=7,
            textColor=TEXT_GREY,
            alignment=TA_CENTER,
            fontName="Helvetica-Oblique",
        ),
        "sig_label": ParagraphStyle(
            "SigLabel",
            parent=base["Normal"],
            fontSize=10,
            textColor=TEXT_DARK,
            fontName="Helvetica-Bold",
        ),
        "sig_line": ParagraphStyle(
            "SigLine",
            parent=base["Normal"],
            fontSize=10,
            textColor=TEXT_DARK,
            fontName="Helvetica",
        ),
    }


# ---------------------------------------------------------------------------
# Page callbacks
# ---------------------------------------------------------------------------

def _header_footer(canvas, doc, contract_id: str, security_number: str = ""):
    """Draw running header bar, security watermark pattern, and footer on every page."""
    width, height = A4
    canvas.saveState()

    # ── Security watermark pattern ──────────────────────────────────────────
    # Diagonal repeating pattern of the 7-digit security number across the
    # entire page.  Uses very light grey at an angle to be visible but not
    # obstruct content.  The irregular spacing and rotation make it extremely
    # difficult to replicate or remove via image editing.
    if security_number:
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#E0E0E0"))  # very light grey
        canvas.setFillAlpha(0.08)  # near-transparent
        canvas.setFont("Helvetica-Bold", 28)

        watermark_text = f"JOBSY-{security_number}"
        # Create a dense diagonal grid of watermarks
        for y_offset in range(-100, int(height) + 100, 85):
            for x_offset in range(-100, int(width) + 100, 200):
                canvas.saveState()
                canvas.translate(x_offset, y_offset)
                canvas.rotate(35)  # diagonal angle
                canvas.drawString(0, 0, watermark_text)
                canvas.restoreState()

        canvas.restoreState()

    # ── Header bar ──────────────────────────────────────────────────────────
    canvas.setFillColor(HEADER_BG)
    canvas.rect(0, height - 28 * mm, width, 28 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawCentredString(width / 2, height - 14 * mm, "JOBSY SERVICE CONTRACT")

    # Security number prominently in header
    if security_number:
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawCentredString(
            width / 2, height - 20 * mm,
            f"Security No: JOBSY-{security_number}",
        )
        canvas.setFont("Helvetica", 7)
        canvas.drawCentredString(
            width / 2, height - 24.5 * mm,
            f"Contract Ref: {contract_id[:8]}...{contract_id[-4:]}",
        )
    else:
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(
            width / 2, height - 21 * mm, f"Contract ID: {contract_id}"
        )

    # ── Footer ──────────────────────────────────────────────────────────────
    canvas.setFont("Helvetica-Oblique", 7)
    canvas.setFillColor(TEXT_GREY)
    security_note = f"  |  Security No: JOBSY-{security_number}" if security_number else ""
    canvas.drawCentredString(
        width / 2,
        12 * mm,
        "Generated by Jobsy Platform  |  Electronic Transactions Act, 2006 of Jamaica  |  "
        f"Page {doc.page}{security_note}",
    )

    canvas.restoreState()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_contract_pdf(contract_data: dict[str, Any]) -> bytes:
    """Generate a professional contract PDF and return the raw bytes.

    ``contract_data`` keys:
        id, title, scope_of_work, terms_and_conditions, agreed_amount,
        currency, start_date, estimated_end_date, location_text, parish,
        hirer_id, provider_id, hirer_name, provider_name, generated_at,
        security_number (7-digit unique contract security marker)
    """
    buf = io.BytesIO()
    styles = _build_styles()

    contract_id = contract_data.get("id", "N/A")
    security_number = contract_data.get("security_number", "")

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=32 * mm,
        bottomMargin=20 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=contract_data.get("title", "Jobsy Service Contract"),
        author="Jobsy Platform",
    )

    story: list[Any] = []

    # ----- Title spacer (space below the running header) -------------------
    story.append(Spacer(1, 4 * mm))

    # ----- Contract details table ------------------------------------------
    story.append(Paragraph("CONTRACT DETAILS", styles["section_heading"]))
    story.append(
        HRFlowable(
            width="100%", thickness=1, color=LINE_COLOUR, spaceAfter=3 * mm
        )
    )

    amount_str = (
        f"{contract_data.get('currency', 'JMD')} "
        f"{float(contract_data.get('agreed_amount', 0)):,.2f}"
    )
    start_str = str(contract_data.get("start_date") or "To be agreed")
    end_str = str(contract_data.get("estimated_end_date") or "To be agreed")
    location_str = contract_data.get("location_text") or "N/A"
    parish_str = contract_data.get("parish") or "N/A"

    detail_rows = [
        ["Security Number", f"JOBSY-{security_number}" if security_number else "N/A"],
        ["Title", contract_data.get("title", "")],
        ["Client (Hirer)", contract_data.get("hirer_name", contract_data.get("hirer_id", ""))],
        ["Service Provider", contract_data.get("provider_name", contract_data.get("provider_id", ""))],
        ["Agreed Amount", amount_str],
        ["Start Date", start_str],
        ["Estimated Completion", end_str],
        ["Location", location_str],
        ["Parish", parish_str],
    ]

    detail_table = Table(
        [[Paragraph(r[0], styles["detail_label"]), Paragraph(str(r[1]), styles["detail_value"])]
         for r in detail_rows],
        colWidths=[45 * mm, None],
        hAlign="LEFT",
    )
    detail_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("BACKGROUND", (0, 0), (-1, -1), JOBSY_LIGHT_GREEN),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE_COLOUR),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE_COLOUR),
            ]
        )
    )
    story.append(detail_table)

    # ----- Scope of work ---------------------------------------------------
    story.append(Paragraph("SCOPE OF WORK", styles["section_heading"]))
    story.append(
        HRFlowable(width="100%", thickness=1, color=LINE_COLOUR, spaceAfter=3 * mm)
    )
    scope_text = contract_data.get("scope_of_work", "")
    for para in scope_text.split("\n\n"):
        cleaned = para.strip().replace("\n", "<br/>")
        if cleaned:
            story.append(Paragraph(cleaned, styles["body"]))
            story.append(Spacer(1, 2 * mm))

    # ----- Terms and conditions --------------------------------------------
    story.append(Paragraph("TERMS AND CONDITIONS", styles["section_heading"]))
    story.append(
        HRFlowable(width="100%", thickness=1, color=LINE_COLOUR, spaceAfter=3 * mm)
    )
    terms_text = contract_data.get("terms_and_conditions", "")
    for para in terms_text.split("\n\n"):
        cleaned = para.strip().replace("\n", "<br/>")
        if cleaned:
            story.append(Paragraph(cleaned, styles["body"]))
            story.append(Spacer(1, 2 * mm))

    # ----- Signature blocks ------------------------------------------------
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("SIGNATURES", styles["section_heading"]))
    story.append(
        HRFlowable(width="100%", thickness=1, color=LINE_COLOUR, spaceAfter=6 * mm)
    )

    hirer_label = contract_data.get("hirer_name", contract_data.get("hirer_id", ""))
    provider_label = contract_data.get("provider_name", contract_data.get("provider_id", ""))

    sig_data = [
        [
            Paragraph("<b>Client (Hirer)</b>", styles["sig_label"]),
            Paragraph("", styles["body"]),
            Paragraph("<b>Service Provider</b>", styles["sig_label"]),
        ],
        [
            Paragraph(hirer_label, styles["sig_line"]),
            Paragraph("", styles["body"]),
            Paragraph(provider_label, styles["sig_line"]),
        ],
        [
            Paragraph("", styles["body"]),
            Paragraph("", styles["body"]),
            Paragraph("", styles["body"]),
        ],
        [
            Paragraph("Signature: _______________________", styles["sig_line"]),
            Paragraph("", styles["body"]),
            Paragraph("Signature: _______________________", styles["sig_line"]),
        ],
        [
            Paragraph("Date: _______________________", styles["sig_line"]),
            Paragraph("", styles["body"]),
            Paragraph("Date: _______________________", styles["sig_line"]),
        ],
    ]

    sig_table = Table(sig_data, colWidths=[70 * mm, 20 * mm, 70 * mm], hAlign="LEFT")
    sig_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(sig_table)

    # ----- Build PDF -------------------------------------------------------
    def on_page(canvas, doc):
        _header_footer(canvas, doc, contract_id, security_number)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    return buf.getvalue()
