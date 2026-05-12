from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ANNEX_KEYWORDS = [
    "Annexe - Projets supplementaires (Portfolio)",
    "Tableau de synthese global des realisations",
]


def create_merged_appendix_pdf(path: Path):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    story = []

    title = Paragraph("<b>Annexe - Tableau de synthese global des realisations</b>", styles["Title"])
    intro = Paragraph(
        "Fusion du tableau principal et des projets supplementaires du portfolio. "
        "Cette vue unique recapitule les 8 projets avec leurs competences principales BTS SIO.",
        styles["BodyText"],
    )

    story.extend([title, Spacer(1, 0.35 * cm), intro, Spacer(1, 0.5 * cm)])

    rows = [
        ["N", "Intitule", "Contexte / Lieu", "Technologies", "Competences"],
        ["1", "Convertisseur XSY -> JSON (DDT)", "Encosyst alternance", "Python, JSON/XML", "B1.1, B1.3, B2.1, A1.4"],
        ["2", "Chronova (projets & taches salaries)", "Encosyst alternance", "Node.js, TS, PostgreSQL, Prisma", "B1.1, B1.2, B1.3, B2.2, A1.4, A1.5"],
        ["3", "Encosyst Website multilingue", "Encosyst alternance", "HTML, CSS, JS, i18n", "B1.1, B1.3, A1.3, A1.4"],
        ["4", "API REST securisee", "Projet perso GitHub", "Node.js, TS, Express, JWT", "B1.1, B2.2, B2.3, B3.2, C3.2"],
        ["5", "rickandMorty", "Projet perso", "JavaScript, API, Frontend", "B1.1, B1.3, B3.1, B3.2, A1.3"],
        ["6", "Street_bites", "Projet perso", "Node.js, Express, SQL", "B1.1, B1.2, B1.3, A1.4, A1.5"],
        ["7", "Spotilike", "Projet perso", "TypeScript, API, PostgreSQL", "B1.1, B1.3, B2.2, B2.3, C3.2, A1.4"],
        ["8", "Calendar", "Projet perso", "JavaScript, Frontend", "B1.1, B1.2, B1.3, B3.1, A1.5"],
    ]

    table = Table(
        rows,
        colWidths=[0.9 * cm, 5.5 * cm, 3.4 * cm, 4.2 * cm, 4.5 * cm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4e78")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c7d4e2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8fb")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        Paragraph(
            "<i>Note : l'association des competences est indicative et ajustable selon validation finale E5.</i>",
            styles["BodyText"],
        )
    )
    doc.build(story)


def remove_old_generated_annex_pages(reader: PdfReader) -> PdfWriter:
    writer = PdfWriter()
    for page in reader.pages:
        text = (page.extract_text() or "").strip()
        if any(keyword in text for keyword in ANNEX_KEYWORDS):
            continue
        writer.add_page(page)
    return writer


def main():
    base_pdf = Path(r"C:\Users\papar\Downloads\dossier_professionnel_E5_matthieu_lopes.pdf")
    appendix_pdf = Path(r"C:\Users\papar\Downloads\portfolio_matthieu_lopes\portfolio\scripts\e5_appendix_temp.pdf")
    cleaned_pdf = Path(r"C:\Users\papar\Downloads\portfolio_matthieu_lopes\portfolio\scripts\e5_cleaned_temp.pdf")
    output_pdf = Path(r"C:\Users\papar\Downloads\dossier_professionnel_E5_matthieu_lopes.pdf")

    create_merged_appendix_pdf(appendix_pdf)

    reader_main = PdfReader(str(base_pdf))
    cleaned_writer = remove_old_generated_annex_pages(reader_main)
    with cleaned_pdf.open("wb") as f:
        cleaned_writer.write(f)

    reader_clean = PdfReader(str(cleaned_pdf))
    reader_appendix = PdfReader(str(appendix_pdf))
    final_writer = PdfWriter()
    for page in reader_clean.pages:
        final_writer.add_page(page)
    for page in reader_appendix.pages:
        final_writer.add_page(page)

    with output_pdf.open("wb") as f:
        final_writer.write(f)

    appendix_pdf.unlink(missing_ok=True)
    cleaned_pdf.unlink(missing_ok=True)
    print(f"PDF fusionne mis a jour: {output_pdf}")


if __name__ == "__main__":
    main()
