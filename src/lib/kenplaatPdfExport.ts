import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoImg from "@/assets/logo.png";
import type { Installation } from "@/lib/installationsApi";

export const generateKenplaatPDF = async (
  installation: Installation,
  baseUrl: string
): Promise<void> => {
  // Create landscape A5-ish kenplaat (wider than tall)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [85, 150] // Custom size for kenplaat
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Background gradient effect
  doc.setFillColor(240, 247, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Diagonal accent
  doc.setFillColor(220, 235, 250);
  doc.triangle(pageWidth * 0.6, 0, pageWidth, 0, pageWidth, pageHeight, "F");
  
  // Border
  doc.setDrawColor(100, 130, 160);
  doc.setLineWidth(0.5);
  doc.rect(2, 2, pageWidth - 4, pageHeight - 4);
  
  // === LEFT SIDE: Company info & QR ===
  const leftColumnWidth = 45;
  
  // Try to add logo
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", 5, 5, 35, 12);
  } catch {
    // Fallback: draw logo placeholder
    doc.setFillColor(76, 175, 80);
    doc.roundedRect(5, 5, 35, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("RV Installatie", 7, 12);
  }
  
  // Company details
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  let y = 22;
  
  // Icons are simulated with unicode symbols
  doc.text("📍 Adres hier", 5, y);
  y += 4;
  doc.text("✉ info@rv-installatie.nl", 5, y);
  y += 4;
  doc.text("📞 06-13629947", 5, y);
  y += 4;
  doc.text("🌐 www.rv-installatie.nl", 5, y);
  y += 6;
  
  // QR Code
  const qrUrl = `${baseUrl}/installatie/${installation.qr_code}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { width: 150, margin: 1 });
  doc.addImage(qrCodeDataUrl, "PNG", 8, y, 25, 25);
  
  doc.setFontSize(5);
  doc.text("Bezoek website", 12, y + 28);
  
  // === RIGHT SIDE: Installation info ===
  const rightX = leftColumnWidth + 5;
  
  // Title
  doc.setFillColor(30, 60, 90);
  doc.setTextColor(30, 60, 90);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("KENPLAAT KOELINSTALLATIE", rightX, 12);
  
  // Form fields
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  
  y = 22;
  const fieldWidth = pageWidth - rightX - 8;
  const valueX = rightX + 40;
  const lineHeight = 8;
  
  const drawField = (label: string, value: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, rightX, yPos);
    
    // Draw input box
    doc.setDrawColor(150, 150, 150);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(valueX, yPos - 4, fieldWidth - 40, 5, 1, 1, "FD");
    
    // Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(value || "", valueX + 1, yPos - 0.5);
    doc.setFontSize(7);
  };
  
  drawField("Identificatienummer", installation.qr_code || "", y);
  y += lineHeight;
  drawField("Leverancier/Installateur", "R. Veldhuis Installatie", y);
  y += lineHeight;
  drawField("Type koelinstallatie", installation.installation_type || "Airco", y);
  y += lineHeight;
  
  // Double fields row
  doc.setFont("helvetica", "bold");
  doc.text("Type koudemiddel", rightX, y);
  doc.setDrawColor(150, 150, 150);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(valueX, y - 4, 20, 5, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(installation.refrigerant_type || "R32", valueX + 1, y - 0.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("GWP-waarde", valueX + 25, y);
  doc.setDrawColor(150, 150, 150);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(valueX + 48, y - 4, 15, 5, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(String(installation.refrigerant_gwp || "675"), valueX + 49, y - 0.5);
  y += lineHeight;
  
  // Charge and CO2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Nominale vulling (kg)", rightX, y);
  doc.setDrawColor(150, 150, 150);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(valueX, y - 4, 20, 5, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const chargeKg = installation.refrigerant_charge_kg || 0;
  doc.text(String(chargeKg), valueX + 1, y - 0.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CO₂equivalent", valueX + 25, y);
  doc.setDrawColor(150, 150, 150);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(valueX + 48, y - 4, 15, 5, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const co2eq = ((chargeKg * (installation.refrigerant_gwp || 675)) / 1000).toFixed(2);
  doc.text(co2eq, valueX + 49, y - 0.5);
  y += lineHeight;
  
  // Logboek aanwezig
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Logboek aanwezig", rightX, y);
  
  // Checkboxes
  doc.setDrawColor(150, 150, 150);
  doc.rect(valueX, y - 4, 4, 4);
  doc.text("Ja", valueX + 6, y - 0.5);
  doc.rect(valueX + 15, y - 4, 4, 4);
  doc.text("Nee", valueX + 21, y - 0.5);
  
  // Check "Ja" by default
  doc.setFont("helvetica", "normal");
  doc.text("✓", valueX + 0.5, y - 0.5);
  y += lineHeight;
  
  // Datum installatiecontrole
  doc.setFont("helvetica", "bold");
  doc.text("Datum installatiecontrole", rightX, y);
  doc.setDrawColor(150, 150, 150);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(valueX, y - 4, fieldWidth - 40, 5, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(installation.installation_date || new Date().toISOString().split("T")[0], valueX + 1, y - 0.5);
  
  // Footer
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Bevat gefluoreerde broeikasgassen.", pageWidth - 8, pageHeight - 4, { align: "right" });
  
  // Save
  const fileName = `Kenplaat-${installation.name || installation.qr_code}.pdf`;
  doc.save(fileName);
};
