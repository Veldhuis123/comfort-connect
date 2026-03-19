import jsPDF from "jspdf";
import { EATON_COMPONENTS, type GroepenkastConfig } from "./eatonProducts";

export const generateGroepenverklaringPdf = async (config: GroepenkastConfig) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Groepenverklaring", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Conform NEN 1010 / NEN 3140", margin, 26);
  doc.text(`RV Installatie — ${new Date().toLocaleDateString("nl-NL")}`, pageWidth - margin, 26, { align: "right" });

  y = 45;

  // Project info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Projectgegevens", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const info = [
    ["Naam:", config.name],
    ["Klant:", config.customer || "—"],
    ["Adres:", config.address || "—"],
    ["Datum:", new Date(config.updatedAt).toLocaleDateString("nl-NL")],
    ["Referentie:", config.id],
  ];
  info.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 30, y);
    y += 5;
  });

  y += 5;

  // Table header
  const colX = [margin, margin + 8, margin + 48, margin + 100, margin + 130, margin + 150];
  const colLabels = ["Nr.", "Groep", "Component", "Artikelnr.", "A", "TE"];

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y - 4, contentWidth, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105); // slate-500
  colLabels.forEach((label, i) => doc.text(label, colX[i], y));
  y += 7;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  let groupNr = 1;
  config.rows.forEach((row) => {
    // Row header
    if (y > 265) { doc.addPage(); y = margin; }
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, contentWidth, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(row.label, margin + 2, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    row.components.forEach((comp) => {
      if (y > 270) { doc.addPage(); y = margin; }
      const eatonComp = EATON_COMPONENTS.find(e => e.id === comp.componentId);
      if (!eatonComp) return;

      doc.setFontSize(8);
      doc.text(String(groupNr), colX[0], y);
      doc.text(comp.label || "—", colX[1], y, { maxWidth: 40 });
      doc.text(eatonComp.name, colX[2], y, { maxWidth: 50 });
      doc.text(eatonComp.articleNumber, colX[3], y, { maxWidth: 28 });
      doc.text(eatonComp.amperage ? `${eatonComp.amperage}A` : "—", colX[4], y);
      doc.text(String(eatonComp.modules), colX[5], y);

      // Light line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 2, margin + contentWidth, y + 2);
      y += 6;
      groupNr++;
    });

    y += 2;
  });

  // Summary
  y += 5;
  if (y > 250) { doc.addPage(); y = margin; }
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 4, contentWidth, 20, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Samenvatting", margin + 3, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const totalComponents = config.rows.reduce((s, r) => s + r.components.length, 0);
  const totalModules = config.rows.reduce((sum, row) => 
    sum + row.components.reduce((s, c) => {
      const comp = EATON_COMPONENTS.find(e => e.id === c.componentId);
      return s + (comp?.modules || 0) * c.quantity;
    }, 0), 0);

  doc.text(`Aantal groepen: ${totalComponents}`, margin + 3, y);
  doc.text(`Totaal modules: ${totalModules} TE`, margin + 60, y);
  y += 5;
  doc.text(`Rijen: ${config.rows.length}`, margin + 3, y);

  // Notes
  if (config.notes) {
    y += 10;
    if (y > 255) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Opmerkingen", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(config.notes, contentWidth);
    doc.text(lines, margin, y);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`RV Installatie — Groepenverklaring — Pagina ${i} van ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  doc.save(`groepenverklaring-${config.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
};
