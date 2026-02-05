import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoImg from "@/assets/logo.png";
import type { Installation } from "@/lib/installationsApi";

// Format date to Dutch format DD-MM-YYYY
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

// Format number with comma as decimal separator
const formatNumber = (num: number | null | undefined, decimals: number = 3): string => {
  if (num === null || num === undefined) return "-";
  return num.toFixed(decimals).replace(".", ",");
};

export const generateKenplaatPDF = async (
  installation: Installation,
  baseUrl: string
): Promise<void> => {
  // Create landscape A5-ish kenplaat (wider than tall)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [90, 155] // Slightly larger for better readability
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Background gradient effect
  doc.setFillColor(240, 247, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Diagonal accent
  doc.setFillColor(220, 235, 250);
  doc.triangle(pageWidth * 0.55, 0, pageWidth, 0, pageWidth, pageHeight, "F");
  
  // Border
  doc.setDrawColor(30, 60, 90);
  doc.setLineWidth(0.8);
  doc.rect(2, 2, pageWidth - 4, pageHeight - 4);
  doc.setLineWidth(0.3);
  doc.rect(3, 3, pageWidth - 6, pageHeight - 6);
  
  // === LEFT SIDE: Company info & QR ===
  const leftColumnWidth = 48;
  
  // Try to add logo
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", 6, 6, 36, 13);
  } catch {
    // Fallback: company name text
    doc.setFillColor(30, 60, 90);
    doc.roundedRect(6, 6, 36, 13, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("R.V. INSTALLATIE", 8, 14);
  }
  
  // Company details - using plain text without emoji
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  let y = 24;
  
  doc.text("Adres: Leverancieradres", 6, y);
  y += 4;
  doc.text("E: info@rv-installatie.nl", 6, y);
  y += 4;
  doc.text("T: 06-13629947", 6, y);
  y += 4;
  doc.text("W: www.rv-installatie.nl", 6, y);
  y += 8;
  
  // QR Code
  const qrUrl = `${baseUrl}/installatie/${installation.qr_code}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { 
    width: 200, 
    margin: 1,
    color: { dark: "#1e3a5a", light: "#ffffff" }
  });
  doc.addImage(qrCodeDataUrl, "PNG", 10, y, 28, 28);
  
  doc.setFontSize(5.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Scan voor installatie-info", 11, y + 31);
  
  // === RIGHT SIDE: Installation info ===
  const rightX = leftColumnWidth + 4;
  
  // Title with background
  doc.setFillColor(30, 60, 90);
  doc.roundedRect(rightX - 1, 5, pageWidth - rightX - 4, 10, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("KENPLAAT KOELINSTALLATIE", rightX + 2, 12);
  
  // F-gas verordening subtitle
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.text("Conform EU Verordening 517/2014 (F-gassen)", rightX + 2, 14);
  
  // Form fields
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  
  y = 22;
  const valueX = rightX + 38;
  const lineHeight = 7.5;
  const fieldWidth = pageWidth - valueX - 6;
  
  const drawField = (label: string, value: string, yPos: number, width: number = fieldWidth) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, rightX, yPos);
    
    // Draw input box
    doc.setDrawColor(120, 140, 160);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(valueX, yPos - 4, width, 5.5, 0.8, 0.8, "FD");
    
    // Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(value || "-", valueX + 1.5, yPos);
    doc.setFontSize(7);
  };
  
  // Identificatienummer (shortened UUID)
  const shortId = installation.qr_code ? installation.qr_code.substring(0, 18) + "..." : "-";
  drawField("Identificatienummer", shortId, y);
  y += lineHeight;
  
  // Leverancier
  drawField("Leverancier/Installateur", "R. Veldhuis Installatie", y);
  y += lineHeight;
  
  // Merk/Model (NEW - required info)
  const merkModel = `${installation.brand || ""} ${installation.model || ""}`.trim() || "-";
  drawField("Merk / Model", merkModel, y);
  y += lineHeight;
  
  // Type koelinstallatie
  const typeLabels: Record<string, string> = {
    "airco": "Airconditioning",
    "warmtepomp": "Warmtepomp",
    "koeling": "Koelinstallatie",
    "ventilatie": "Ventilatie",
    "overig": "Overig"
  };
  drawField("Type installatie", typeLabels[installation.installation_type] || installation.installation_type || "-", y);
  y += lineHeight;
  
  // Consistent column positions for two-column rows
  const col1ValueX = valueX;
  const col1ValueW = 20;
  const col2LabelX = col1ValueX + col1ValueW + 4; // Start label right after first value box + spacing
  const col2ValueX = col2LabelX + 22; // Label is about 22mm wide
  const col2ValueW = 18;
  
  // Row with refrigerant + GWP
  doc.setFont("helvetica", "bold");
  doc.text("Type koudemiddel", rightX, y);
  doc.setDrawColor(120, 140, 160);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col1ValueX, y - 4, col1ValueW, 5.5, 0.8, 0.8, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(installation.refrigerant_type || "-", col1ValueX + 1.5, y);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("GWP-waarde", col2LabelX, y);
  doc.setDrawColor(120, 140, 160);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col2ValueX, y - 4, col2ValueW, 5.5, 0.8, 0.8, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(String(installation.refrigerant_gwp || "-"), col2ValueX + 1.5, y);
  y += lineHeight;
  
  // Row with charge + CO2 equivalent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Vulling (kg)", rightX, y);
  doc.setDrawColor(120, 140, 160);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col1ValueX, y - 4, col1ValueW, 5.5, 0.8, 0.8, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const chargeKg = Number(installation.refrigerant_charge_kg) || 0;
  doc.text(formatNumber(chargeKg), col1ValueX + 1.5, y);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CO2-eq (ton)", col2LabelX, y);
  doc.setDrawColor(120, 140, 160);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col2ValueX, y - 4, col2ValueW, 5.5, 0.8, 0.8, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const gwp = Number(installation.refrigerant_gwp) || 0;
  const co2eq = (chargeKg * gwp) / 1000;
  doc.text(formatNumber(co2eq, 2), col2ValueX + 1.5, y);
  y += lineHeight;
  
  // Logboek aanwezig with proper checkboxes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Logboek aanwezig", rightX, y);
  
  // "Ja" checkbox - checked
  doc.setDrawColor(120, 140, 160);
  doc.setFillColor(255, 255, 255);
  doc.rect(valueX, y - 4, 4, 4, "FD");
  // Draw checkmark with lines instead of unicode
  doc.setDrawColor(30, 120, 60);
  doc.setLineWidth(0.5);
  doc.line(valueX + 0.8, y - 1.5, valueX + 1.8, y - 0.5);
  doc.line(valueX + 1.8, y - 0.5, valueX + 3.2, y - 3);
  doc.setLineWidth(0.3);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Ja", valueX + 5.5, y);
  
  // "Nee" checkbox - unchecked
  doc.setDrawColor(120, 140, 160);
  doc.rect(valueX + 14, y - 4, 4, 4);
  doc.text("Nee", valueX + 19.5, y);
  y += lineHeight;
  
  // Datum installatiecontrole
  drawField("Datum installatie", formatDate(installation.installation_date), y);
  y += lineHeight;
  
  // Serial number if available
  if (installation.serial_number) {
    drawField("Serienummer", installation.serial_number, y);
  }
  
  // Footer with required F-gas warning
  doc.setFillColor(255, 245, 230);
  doc.roundedRect(rightX - 1, pageHeight - 12, pageWidth - rightX - 4, 8, 1, 1, "F");
  doc.setDrawColor(200, 150, 50);
  doc.roundedRect(rightX - 1, pageHeight - 12, pageWidth - rightX - 4, 8, 1, 1, "S");
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 100, 0);
  doc.text("LET OP: Bevat gefluoreerde broeikasgassen", rightX + 2, pageHeight - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text("Onderhoud en buitengebruikstelling uitsluitend door gecertificeerde technici (F-gas)", rightX + 2, pageHeight - 5.5);
  
  // Save
  const fileName = `Kenplaat-${installation.name || installation.qr_code?.substring(0, 8)}.pdf`;
  doc.save(fileName);
};
