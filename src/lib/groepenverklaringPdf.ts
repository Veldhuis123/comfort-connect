import jsPDF from "jspdf";
import QRCode from "qrcode";
import { EATON_COMPONENTS, type GroepenkastConfig } from "./eatonProducts";

export const generateGroepenverklaringPdf = async (config: GroepenkastConfig) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // ---------- HEADER (logo + brand) ----------
  // Logo mark (rounded square in dark blue)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, margin, 12, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RV", margin + 6, margin + 7.8, { align: "center" });

  // Brand name
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("R. Veldhuis", margin + 16, margin + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Installatie  ·  Elektra & Klimaat", margin + 16, margin + 11);

  // Right side: doc type + date
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GROEPENVERKLARING", pageWidth - margin, margin + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })}`,
    pageWidth - margin,
    margin + 11,
    { align: "right" }
  );

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 16, pageWidth - margin, margin + 16);

  // ---------- TITLE ----------
  let y = margin + 26;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(config.name, margin, y);

  if (config.address || config.customer) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    const subtitle = config.address || config.customer || "";
    doc.text(subtitle, margin, y + 6);
    y += 6;
  }

  y += 14;

  // ---------- DETAILS BLOCK ----------
  const totalGroups = config.rows.reduce((s, r) => s + r.components.length, 0);
  const totalModules = config.rows.reduce(
    (sum, row) =>
      sum +
      row.components.reduce((s, c) => {
        const comp = EATON_COMPONENTS.find((e) => e.id === c.componentId);
        return s + (comp?.modules || 0) * c.quantity;
      }, 0),
    0
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Algemene gegevens", margin, y);
  y += 5;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y - 1, pageWidth - margin, y - 1);
  y += 3;

  const details: [string, string][] = [
    ["Klant", config.customer || "—"],
    ["Locatie", config.address || "—"],
    ["Aantal groepen", String(totalGroups)],
    ["Modules (TE)", String(totalModules)],
    ["Laatst bijgewerkt", new Date(config.updatedAt).toLocaleDateString("nl-NL")],
    ["Referentie", config.id.slice(0, 12)],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const colW = contentWidth / 2;
  details.forEach((row, i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const x = margin + col * colW;
    const ly = y + rowIdx * 6;
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], x, ly);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], x + 32, ly, { maxWidth: colW - 34 });
    doc.setFont("helvetica", "normal");
  });
  y += Math.ceil(details.length / 2) * 6 + 8;

  // ---------- TABLE ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Geïnstalleerde groepen (${totalGroups})`, margin, y);
  y += 5;

  // Table columns: # | Omschrijving | Amp. | Fase(n) | Kar.
  const cols = [
    { label: "#", x: margin + 2, w: 12, align: "left" as const },
    { label: "Omschrijving", x: margin + 14, w: 90, align: "left" as const },
    { label: "Amp.", x: margin + 110, w: 20, align: "left" as const },
    { label: "Fase(n)", x: margin + 135, w: 20, align: "left" as const },
    { label: "Kar.", x: margin + 160, w: 14, align: "left" as const },
  ];

  // Header row
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  cols.forEach((c) => doc.text(c.label, c.x, y + 4.8));
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  let groupNr = 1;
  config.rows.forEach((row) => {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    // Subtle row label band
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(row.label.toUpperCase(), margin + 2, y + 3.8);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    row.components.forEach((comp, idx) => {
      if (y > pageHeight - 55) {
        doc.addPage();
        y = margin;
      }
      const eatonComp = EATON_COMPONENTS.find((e) => e.id === comp.componentId);
      if (!eatonComp) return;

      const rowH = 7;

      // Determine display values
      const nr = comp.label?.match(/^[A-Z]?\d+/) ? comp.label.split(/\s/)[0] : String(groupNr);
      const omschrijving = comp.label?.replace(/^[A-Z]?\d+\s*/, "") || eatonComp.name;
      const amp = eatonComp.amperage ? `${eatonComp.amperage}A` : "—";
      const fasen = eatonComp.poles ? `${eatonComp.poles}P` : "1P";
      const kar = eatonComp.characteristic || (amp !== "—" ? "B" : "—");

      doc.setFontSize(9);
      doc.setTextColor(56, 161, 187); // teal/sky accent for #
      doc.setFont("helvetica", "bold");
      doc.text(nr, cols[0].x, y + 4.6);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(omschrijving, cols[1].x, y + 4.6, { maxWidth: cols[1].w - 2 });

      doc.setTextColor(15, 23, 42);
      doc.text(amp, cols[2].x, y + 4.6);
      doc.text(fasen, cols[3].x, y + 4.6);

      // Karakteristiek as colored letter
      doc.setTextColor(56, 161, 187);
      doc.setFont("helvetica", "bold");
      doc.text(kar, cols[4].x, y + 4.6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      // Light separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, pageWidth - margin, y + rowH);

      y += rowH;
      groupNr++;
    });
  });

  // ---------- NOTES ----------
  if (config.notes) {
    y += 6;
    if (y > pageHeight - 70) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Opmerkingen", margin, y);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(config.notes, contentWidth - 40);
    doc.text(lines, margin, y);
  }

  // ---------- FOOTER + QR (on every page) ----------
  const qrUrl = `${typeof window !== "undefined" ? window.location.origin : "https://rv-installatie.nl"}/installatie/groepenkast-${config.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 256,
    margin: 0,
    color: { dark: "#0f172a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

    // Left: company info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("R. Veldhuis Installatie", margin, pageHeight - 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Hollandergraven 10, 7676 EC Westerhaar", margin, pageHeight - 18);
    doc.text("06-13629947  ·  info@rv-installatie.nl", margin, pageHeight - 14);
    doc.text("rv-installatie.nl", margin, pageHeight - 10);

    // Center: page number
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Pagina ${i} van ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });

    // Right: QR code (only on last page for clarity)
    if (i === pageCount) {
      const qrSize = 22;
      const qrX = pageWidth - margin - qrSize;
      const qrY = pageHeight - 28 + 3;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Scan voor digitale", qrX - 1, qrY + 6, { align: "right" });
      doc.text("groepenverklaring", qrX - 1, qrY + 9, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("& meterkast info", qrX - 1, qrY + 12, { align: "right" });
    }
  }

  doc.save(`groepenverklaring-${config.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
};
