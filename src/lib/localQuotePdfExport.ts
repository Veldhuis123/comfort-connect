import jsPDF from "jspdf";
import logoImg from "@/assets/logo.png";
import { LocalQuote } from "./api";

export const generateLocalQuotePDF = async (quote: LocalQuote) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 15;

  // Helper functions
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("nl-NL");
  };

  const formatCurrency = (amount: number | string | null) => {
    if (amount === null) return "€0,00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `€${num.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Try to add logo
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", margin, yPos, 40, 20);
  } catch {
    // Logo loading failed, continue without logo
  }

  // Company info (right side)
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("RV Installatie", pageWidth - margin, yPos, { align: "right" });
  doc.text("info@rv-installatie.nl", pageWidth - margin, yPos + 5, { align: "right" });
  doc.text("06-13629947", pageWidth - margin, yPos + 10, { align: "right" });

  yPos = 45;

  // Header bar
  doc.setFillColor(0, 102, 204);
  doc.rect(0, yPos, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("OFFERTE", margin, yPos + 14);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(quote.quote_number || `#${quote.id}`, pageWidth - margin, yPos + 14, { align: "right" });

  yPos = 75;
  doc.setTextColor(0, 0, 0);

  // Customer info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Aan:", margin, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.text(quote.customer_name || "Onbekend", margin, yPos);
  
  if (quote.customer_address) {
    yPos += 5;
    const addressLines = quote.customer_address.split("\n");
    addressLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }
  
  if (quote.customer_email) {
    yPos += 2;
    doc.text(quote.customer_email, margin, yPos);
  }
  
  if (quote.customer_phone) {
    yPos += 5;
    doc.text(quote.customer_phone, margin, yPos);
  }

  // Quote info (right column)
  const infoX = 130;
  let infoY = 75;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Offertedatum:", infoX, infoY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(quote.quote_date), infoX + 35, infoY);
  
  infoY += 6;
  doc.setTextColor(100, 100, 100);
  doc.text("Geldig tot:", infoX, infoY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(quote.expiration_date), infoX + 35, infoY);

  yPos = Math.max(yPos, infoY) + 20;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  
  const col1 = margin + 3;
  const col2 = 110;
  const col3 = 130;
  const col4 = 155;
  const col5 = pageWidth - margin - 3;
  
  doc.text("Omschrijving", col1, yPos + 7);
  doc.text("Aantal", col2, yPos + 7, { align: "right" });
  doc.text("Prijs", col3, yPos + 7, { align: "right" });
  doc.text("BTW", col4, yPos + 7, { align: "right" });
  doc.text("Totaal", col5, yPos + 7, { align: "right" });

  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // Table rows
  if (quote.items && quote.items.length > 0) {
    quote.items.forEach((item, index) => {
      // Check for page break
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 8, "F");
      }

      doc.setFontSize(9);
      
      // Description (may need wrapping)
      const description = item.description || "Product";
      const maxDescWidth = 65;
      const descLines = doc.splitTextToSize(description, maxDescWidth);
      doc.text(descLines[0], col1, yPos);
      
      // Quantity
      const qty = `${item.quantity || 1} ${item.unit || "stuk"}`;
      doc.text(qty, col2, yPos, { align: "right" });
      
      // Price per unit
      doc.text(formatCurrency(item.price_per_unit), col3, yPos, { align: "right" });
      
      // VAT
      doc.text(`${item.vat_percentage || 21}%`, col4, yPos, { align: "right" });
      
      // Line total
      doc.text(formatCurrency(item.line_total_incl), col5, yPos, { align: "right" });

      yPos += 8;

      // Additional description lines
      if (descLines.length > 1) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        for (let i = 1; i < descLines.length; i++) {
          doc.text(descLines[i], col1, yPos);
          yPos += 5;
        }
        doc.setTextColor(0, 0, 0);
      }
    });
  }

  // Totals section
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const totalsX = 130;
  const totalsValueX = pageWidth - margin - 3;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotaal excl. BTW:", totalsX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(quote.subtotal_excl), totalsValueX, yPos, { align: "right" });

  yPos += 7;
  doc.setTextColor(100, 100, 100);
  doc.text("BTW:", totalsX, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(quote.vat_amount), totalsValueX, yPos, { align: "right" });

  yPos += 10;
  doc.setFillColor(0, 102, 204);
  doc.rect(totalsX - 5, yPos - 5, pageWidth - margin - totalsX + 8, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Totaal incl. BTW:", totalsX, yPos + 2);
  doc.text(formatCurrency(quote.total_incl), totalsValueX, yPos + 2, { align: "right" });

  yPos += 20;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Customer note
  if (quote.customer_note) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Opmerkingen:", margin, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(quote.customer_note, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }

  // Footer
  const footerY = 280;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "* Deze offerte is geldig tot de aangegeven vervaldatum. Prijzen zijn inclusief BTW tenzij anders vermeld.",
    margin,
    footerY
  );
  doc.text(
    "RV Installatie | KVK: [nummer] | BTW: [nummer] | info@rv-installatie.nl | 06-13629947",
    margin,
    footerY + 5
  );

  // Save the PDF
  const fileName = `offerte-${quote.quote_number || quote.id}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
