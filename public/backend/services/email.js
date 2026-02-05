const nodemailer = require('nodemailer');

// Create transporter with detailed logging
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.transip.email',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false', // Default to true for TransIP
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Enable debug logging
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
  };

  console.log('📧 SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? config.auth.user.substring(0, 5) + '...' : 'NOT SET',
    pass: config.auth.pass ? '***SET***' : 'NOT SET'
  });

  return nodemailer.createTransport(config);
};

// Send email
const sendEmail = async ({ to, subject, html, text }) => {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP not configured: SMTP_USER or SMTP_PASS missing');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const transporter = createTransporter();
    
    // Verify connection first
    console.log('📧 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'R. Veldhuis Installatie <info@rv-installatie.nl>',
      to,
      subject,
      html,
      text,
    };

    console.log('📧 Sending email to:', to, 'Subject:', subject);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.code, '-', error.message);
    console.error('❌ Full error:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
const templates = {
  newQuoteNotification: (quote) => {
    const rooms = typeof quote.rooms === 'string' ? JSON.parse(quote.rooms) : quote.rooms;
    const roomsList = rooms.map((r, i) => 
      `<li>${r.name || `Ruimte ${i + 1}`}: ${r.size}m² (${r.type})</li>`
    ).join('');

    return {
      subject: `🆕 Nieuwe Offerteaanvraag #${quote.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #1e3a5f; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { font-weight: bold; width: 150px; color: #666; }
            .info-value { flex: 1; }
            .highlight { background: #3b82f6; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .highlight-price { font-size: 28px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🆕 Nieuwe Offerteaanvraag</h1>
              <p>Aanvraag #${quote.id}</p>
            </div>
            
            <div class="content">
              ${quote.customer_name || quote.customer_email || quote.customer_phone ? `
              <div class="section">
                <div class="section-title">👤 Klantgegevens</div>
                ${quote.customer_name ? `<div class="info-row"><span class="info-label">Naam:</span><span class="info-value">${quote.customer_name}</span></div>` : ''}
                ${quote.customer_email ? `<div class="info-row"><span class="info-label">E-mail:</span><span class="info-value"><a href="mailto:${quote.customer_email}">${quote.customer_email}</a></span></div>` : ''}
                ${quote.customer_phone ? `<div class="info-row"><span class="info-label">Telefoon:</span><span class="info-value"><a href="tel:${quote.customer_phone}">${quote.customer_phone}</a></span></div>` : ''}
              </div>
              ` : ''}
              
              <div class="section">
                <div class="section-title">🏠 Ruimtes</div>
                <ul>${roomsList}</ul>
                <div class="info-row"><span class="info-label">Totaal oppervlak:</span><span class="info-value"><strong>${quote.total_size} m²</strong></span></div>
                <div class="info-row"><span class="info-label">Benodigd vermogen:</span><span class="info-value"><strong>${parseFloat(quote.total_capacity).toFixed(1)} kW</strong></span></div>
              </div>
              
              ${quote.selected_airco_name ? `
              <div class="section">
                <div class="section-title">❄️ Geselecteerde Airco</div>
                <div class="info-row"><span class="info-label">Merk:</span><span class="info-value">${quote.selected_airco_brand || '-'}</span></div>
                <div class="info-row"><span class="info-label">Model:</span><span class="info-value">${quote.selected_airco_name}</span></div>
              </div>
              ` : ''}
              
              ${quote.estimated_price ? `
              <div class="highlight">
                <div>Indicatieprijs</div>
                <div class="highlight-price">€${parseFloat(quote.estimated_price).toLocaleString('nl-NL')},-</div>
              </div>
              ` : ''}
              
              <div class="section">
                <div class="section-title">📋 Extra Details</div>
                <div class="info-row"><span class="info-label">Kleur leidingen:</span><span class="info-value">${quote.pipe_color || 'Wit'}</span></div>
                ${quote.pipe_length ? `<div class="info-row"><span class="info-label">Leidinglengte:</span><span class="info-value">${quote.pipe_length}m</span></div>` : ''}
                ${quote.additional_notes ? `<div class="info-row"><span class="info-label">Opmerkingen:</span><span class="info-value">${quote.additional_notes}</span></div>` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" class="button">
                  Bekijk in Dashboard →
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>Dit is een automatisch gegenereerde e-mail van R. Veldhuis Installatie</p>
              <p>Ontvangen op: ${new Date().toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nieuwe Offerteaanvraag #${quote.id}

KLANTGEGEVENS
${quote.customer_name ? `Naam: ${quote.customer_name}` : ''}
${quote.customer_email ? `E-mail: ${quote.customer_email}` : ''}
${quote.customer_phone ? `Telefoon: ${quote.customer_phone}` : ''}

RUIMTES
Totaal: ${quote.total_size} m²
Benodigd vermogen: ${parseFloat(quote.total_capacity).toFixed(1)} kW

${quote.selected_airco_name ? `
GESELECTEERDE AIRCO
${quote.selected_airco_brand} ${quote.selected_airco_name}
` : ''}

${quote.estimated_price ? `Indicatieprijs: €${parseFloat(quote.estimated_price).toLocaleString('nl-NL')},-` : ''}

Kleur leidingen: ${quote.pipe_color || 'Wit'}
${quote.pipe_length ? `Leidinglengte: ${quote.pipe_length}m` : ''}
${quote.additional_notes ? `Opmerkingen: ${quote.additional_notes}` : ''}

---
R. Veldhuis Installatie
${new Date().toLocaleString('nl-NL')}
      `
    };
  },

  newContactNotification: (message) => {
    return {
      subject: `📩 Nieuw Contactbericht van ${message.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .info-row { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #666; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .button-green { background: #22c55e; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Nieuw Contactbericht</h1>
            </div>
            
            <div class="content">
              <div class="info-row"><span class="info-label">Van:</span> ${message.name}</div>
              <div class="info-row"><span class="info-label">E-mail:</span> <a href="mailto:${message.email}">${message.email}</a></div>
              ${message.phone ? `<div class="info-row"><span class="info-label">Telefoon:</span> <a href="tel:${message.phone}">${message.phone}</a></div>` : ''}
              ${message.subject ? `<div class="info-row"><span class="info-label">Onderwerp:</span> ${message.subject}</div>` : ''}
              
              <div class="message-box">
                <strong>Bericht:</strong>
                <p>${message.message.replace(/\n/g, '<br>')}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="mailto:${message.email}" class="button">Beantwoorden via E-mail</a>
                ${message.phone ? `<a href="tel:${message.phone}" class="button button-green">Bellen</a>` : ''}
              </div>
            </div>
            
            <div class="footer">
              <p>Ontvangen op: ${new Date().toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nieuw Contactbericht

Van: ${message.name}
E-mail: ${message.email}
${message.phone ? `Telefoon: ${message.phone}` : ''}
${message.subject ? `Onderwerp: ${message.subject}` : ''}

Bericht:
${message.message}

---
Ontvangen op: ${new Date().toLocaleString('nl-NL')}
      `
    };
  },

  newReviewNotification: (review) => {
    const stars = '⭐'.repeat(review.rating);
    return {
      subject: `🆕 Nieuwe Review van ${review.name} - ${stars}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .stars { font-size: 24px; text-align: center; margin: 15px 0; }
            .review-box { background: white; padding: 20px; border-left: 4px solid #fbbf24; margin: 20px 0; font-style: italic; }
            .info-row { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #666; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .pending { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; text-align: center; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🆕 Nieuwe Review Ontvangen</h1>
              <p>Wacht op goedkeuring</p>
            </div>
            
            <div class="content">
              <div class="stars">${stars}</div>
              
              <div class="info-row"><span class="info-label">Van:</span> ${review.name}</div>
              <div class="info-row"><span class="info-label">Plaats:</span> ${review.location}</div>
              <div class="info-row"><span class="info-label">Dienst:</span> ${review.service}</div>
              
              <div class="review-box">
                "${review.review_text}"
              </div>
              
              <div class="pending">
                ⚠️ Deze review is nog niet zichtbaar op de website en moet eerst worden goedgekeurd.
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" class="button">
                  Bekijk & Goedkeuren →
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>Ontvangen op: ${new Date().toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nieuwe Review Ontvangen

${stars}

Van: ${review.name}
Plaats: ${review.location}
Dienst: ${review.service}

"${review.review_text}"

---
⚠️ Deze review wacht op goedkeuring.
Ga naar het admin panel om te controleren en publiceren.

Ontvangen op: ${new Date().toLocaleString('nl-NL')}
      `
    };
  }
};

// Send notification for new quote
const sendQuoteNotification = async (quote) => {
  const to = process.env.EMAIL_TO || 'info@rv-installatie.nl';
  const template = templates.newQuoteNotification(quote);
  return sendEmail({ to, ...template });
};

// Send notification for new contact message
const sendContactNotification = async (message) => {
  const to = process.env.EMAIL_TO || 'info@rv-installatie.nl';
  const template = templates.newContactNotification(message);
  return sendEmail({ to, ...template });
};

// Send notification for new review
const sendReviewNotification = async (review) => {
  const to = process.env.EMAIL_TO || 'info@rv-installatie.nl';
  const template = templates.newReviewNotification(review);
  return sendEmail({ to, ...template });
};

module.exports = {
  sendEmail,
  sendQuoteNotification,
  sendContactNotification,
  sendReviewNotification,
  templates
};
