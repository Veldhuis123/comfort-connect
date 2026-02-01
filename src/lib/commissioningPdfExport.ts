import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoImg from "@/assets/logo.png";
import type { CommissioningData } from "@/lib/installationTypes";

export const generateCommissioningPDF = async (
  data: CommissioningData,
  installationName: string
): Promise<{ doc: jsPDF; qrCodeDataUrl: string }> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Generate QR code - use URL if qr_code is provided, otherwise fall back to JSON
  let qrData: string;
  if (data.qr_code) {
    // URL-based QR code that links to the installation page
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rv-installatie.nl';
    qrData = `${baseUrl}/installatie/${data.qr_code}`;
  } else {
    // Fallback to JSON data (for preview before installation is saved)
    qrData = JSON.stringify({
      werkbon: data.werkbon_number,
      datum: data.commissioning_date,
      klant: data.customer_name,
      installatie: installationName,
      merk: data.brand,
      model: data.model_outdoor,
      koudemiddel: data.refrigerant_type,
      vulling: `${parseFloat(data.standard_charge || "0") + parseFloat(data.additional_charge || "0")} kg`,
    });
  }
  
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });

  // Try to add logo
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    doc.addImage(img, "PNG", pageWidth - 55, 8, 40, 20);
  } catch {
    // Logo loading failed
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Inbedrijfstelling Airconditioning Systeem", 15, 20);
  
  // Header info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let y = 35;
  
  // Datum en werkbonnummer
  doc.text(`Datum: ${data.date || "-"}`, 15, y);
  doc.text(`Werkbonnummer: ${data.werkbon_number || "-"}`, 110, y);
  y += 10;

  // Two column layout for company and customer
  doc.setFont("helvetica", "bold");
  doc.text("Bedrijfsgegevens", 15, y);
  doc.text("Klantgegevens", 110, y);
  y += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // Left column - Company
  doc.text(`Naam: ${data.company_name}`, 15, y);
  doc.text(`Naam: ${data.customer_name}`, 110, y);
  y += 4;
  doc.text(`Adres: ${data.company_address}`, 15, y);
  doc.text(`Contactpersoon: ${data.customer_contact}`, 110, y);
  y += 4;
  doc.text(`Postcode: ${data.company_postal}`, 15, y);
  doc.text(`Adres: ${data.customer_address}`, 110, y);
  y += 4;
  doc.text(`Plaats: ${data.company_city}`, 15, y);
  doc.text(`Postcode: ${data.customer_postal}`, 110, y);
  y += 4;
  doc.text(`Monteur: ${data.technician_name}`, 15, y);
  doc.text(`Plaats: ${data.customer_city}`, 110, y);
  y += 4;
  doc.text(`Certificaatnr: ${data.technician_certificate}`, 15, y);
  doc.text(`Telefoon: ${data.customer_phone}`, 110, y);
  y += 10;

  // Installatiegegevens
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Installatiegegevens", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  doc.text(`Merk installatie: ${data.brand}`, 15, y);
  y += 4;
  doc.text(`Modelnummer buitenunit: ${data.model_outdoor}`, 15, y);
  doc.text(`Serienummer buitenunit: ${data.serial_outdoor}`, 110, y);
  y += 4;
  doc.text(`Modelnummer binnenunit: ${data.model_indoor}`, 15, y);
  doc.text(`Serienummer binnenunit: ${data.serial_indoor}`, 110, y);
  y += 6;
  
  // Multi-split indien ingevuld
  if (data.model_indoor_2 || data.serial_indoor_2) {
    doc.setFont("helvetica", "italic");
    doc.text("Indien multisplit:", 15, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`Modelnummer binnenunit 2: ${data.model_indoor_2}`, 15, y);
    doc.text(`Serienummer binnenunit 2: ${data.serial_indoor_2}`, 110, y);
    y += 4;
  }
  if (data.model_indoor_3 || data.serial_indoor_3) {
    doc.text(`Modelnummer binnenunit 3: ${data.model_indoor_3}`, 15, y);
    doc.text(`Serienummer binnenunit 3: ${data.serial_indoor_3}`, 110, y);
    y += 4;
  }
  y += 4;

  // Koudemiddel gegevens en werkzaamheden
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Installatiegegevens", 15, y);
  doc.text("Werkzaamheden", 110, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  doc.text(`Installatienummer: ${data.installation_number}`, 15, y);
  doc.text(`${data.pressure_test_done ? "☑" : "☐"} Drukbeproeving`, 110, y);
  y += 4;
  doc.text(`Type koudemiddel: ${data.refrigerant_type}`, 15, y);
  doc.text(`${data.leak_test_done ? "☑" : "☐"} Lekdichtheidscontrole`, 110, y);
  y += 4;
  doc.text(`Standaard Inhoud: ${data.standard_charge} kg`, 15, y);
  doc.text(`${data.vacuum_done ? "☑" : "☐"} Vacumeren`, 110, y);
  y += 4;
  doc.text(`Bijvulling koudemiddel: ${data.additional_charge || "0"} kg`, 15, y);
  doc.text(`${data.leak_detection_done ? "☑" : "☐"} Lekdetectie`, 110, y);
  y += 4;
  doc.text(`Inbedrijfsteldatum: ${data.commissioning_date}`, 15, y);
  y += 8;

  // Vacumeerprocedure en Installatiecontrole
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Resultaten vacumeerprocedure", 15, y);
  doc.text("Installatie controle", 110, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  doc.text(`Bereikte vacuumdruk: ${data.vacuum_pressure} ${data.vacuum_pressure_unit}`, 15, y);
  doc.text(`Hoge druk: ${data.high_pressure_reading} bar`, 110, y);
  y += 4;
  doc.text(`Standtijd: ${data.vacuum_hold_time} ${data.vacuum_hold_unit}`, 15, y);
  doc.text(`Condensatietemperatuur: ${data.condensation_temp} °C`, 110, y);
  y += 4;
  doc.text("", 15, y);
  doc.text(`Persgastemperatuur: ${data.discharge_temp} °C`, 110, y);
  y += 6;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Resultaten drukbeproeving", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Lage druk: ${data.low_pressure_reading} bar`, 110, y);
  y += 5;
  
  doc.text(`Lage druk gedeelte: ${data.low_pressure_value} ${data.low_pressure_unit}`, 15, y);
  doc.text(`Verdampingstemperatuur: ${data.evaporation_temp} °C`, 110, y);
  y += 4;
  doc.text(`Hoge druk gedeelte: ${data.high_pressure_value} ${data.high_pressure_unit}`, 15, y);
  doc.text(`Zuiggastemperatuur: ${data.suction_temp} °C`, 110, y);
  y += 4;
  doc.text(`Standtijd: ${data.pressure_hold_time} ${data.pressure_hold_unit}`, 15, y);
  doc.text(`Buitentemperatuur: ${data.outdoor_temp} °C`, 110, y);
  y += 4;
  doc.text("", 15, y);
  doc.text(`Ruimtetemperatuur: ${data.indoor_temp} °C`, 110, y);
  y += 4;
  doc.text("", 15, y);
  doc.text(`Uitblaastemp. Binnenunit: ${data.outlet_temp} °C`, 110, y);
  y += 8;

  // Gereedschap
  if (data.tools && (data.tools.manometer_serial || data.tools.vacuum_pump_serial)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Gebruikte meetapparatuur", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    if (data.tools.manometer_serial) {
      doc.text(`Manometer: ${data.tools.manometer_brand} (SN: ${data.tools.manometer_serial})`, 15, y);
      y += 4;
    }
    if (data.tools.vacuum_pump_serial) {
      doc.text(`Vacuümpomp: ${data.tools.vacuum_pump_brand} (SN: ${data.tools.vacuum_pump_serial})`, 15, y);
      y += 4;
    }
    if (data.tools.leak_detector_serial) {
      doc.text(`Lekdetector: ${data.tools.leak_detector_brand} (SN: ${data.tools.leak_detector_serial})`, 15, y);
      y += 4;
    }
    if (data.tools.refrigerant_scale_serial) {
      doc.text(`Weegschaal: ${data.tools.refrigerant_scale_brand} (SN: ${data.tools.refrigerant_scale_serial})`, 15, y);
      y += 4;
    }
    y += 4;
  }

  // Opmerkingen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Opmerkingen", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  if (data.remarks) {
    const splitRemarks = doc.splitTextToSize(data.remarks, pageWidth - 30);
    doc.text(splitRemarks, 15, y);
    y += splitRemarks.length * 4 + 4;
  } else {
    doc.text("-", 15, y);
    y += 8;
  }

  // QR Code toevoegen
  doc.addImage(qrCodeDataUrl, "PNG", pageWidth - 45, y - 30, 30, 30);

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 275, pageWidth - 15, 275);
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text("Dit inbedrijfstellingsrapport is opgesteld conform BRL 100/200 richtlijnen.", 15, 280);
  doc.text(`R. Veldhuis Installatie | info@rv-installatie.nl | 06-13629947`, 15, 284);
  doc.text(`Gegenereerd op: ${new Date().toLocaleDateString("nl-NL")} ${new Date().toLocaleTimeString("nl-NL")}`, 15, 288);

  // Save PDF
  const fileName = `Inbedrijfstelling-${data.werkbon_number || installationName}-${data.commissioning_date}.pdf`;
  doc.save(fileName);

  return { doc, qrCodeDataUrl };
};
