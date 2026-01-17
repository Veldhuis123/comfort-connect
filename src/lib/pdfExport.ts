import jsPDF from "jspdf";
import logoImg from "@/assets/logo.png";

export interface PDFOptions {
  title: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export const createPDFBase = async (options: PDFOptions): Promise<{ doc: jsPDF; yPos: number }> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Try to add logo
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", 15, 10, 40, 20);
  } catch {
    // Logo loading failed, continue without logo
  }

  // Header
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 35, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, 20, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Datum: ${new Date().toLocaleDateString("nl-NL")}`, pageWidth - 50, 50);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  let yPos = 75;

  // Customer info
  if (options.customerName || options.customerEmail || options.customerPhone) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Klantgegevens", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (options.customerName) {
      doc.text(`Naam: ${options.customerName}`, 20, yPos);
      yPos += 6;
    }
    if (options.customerEmail) {
      doc.text(`E-mail: ${options.customerEmail}`, 20, yPos);
      yPos += 6;
    }
    if (options.customerPhone) {
      doc.text(`Telefoon: ${options.customerPhone}`, 20, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  return { doc, yPos };
};

export const addPDFFooter = (doc: jsPDF) => {
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "* Prijzen zijn indicatief en kunnen afwijken afhankelijk van de situatie ter plaatse.",
    20,
    280
  );
  doc.text("RV Installatie | info@rv-installatie.nl | 06-13629947", 20, 286);
};

export const savePDF = (doc: jsPDF, prefix: string, customerName?: string) => {
  const fileName = `${prefix}-${customerName ? customerName.replace(/\s+/g, "-") : "RV-Installatie"}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
