const logger = require('./logger');

/**
 * Send WhatsApp notification via CallMeBot
 * Setup: 
 * 1. Save +34 644 71 84 38 in your contacts
 * 2. Send "I allow callmebot to send me messages" to that number
 * 3. You'll receive your API key
 * 4. Add CALLMEBOT_PHONE and CALLMEBOT_APIKEY to .env
 */
const sendWhatsAppNotification = async (message) => {
  const phone = process.env.CALLMEBOT_PHONE;
  const apiKey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apiKey) {
    logger.warn('WHATSAPP', 'CallMeBot niet geconfigureerd - CALLMEBOT_PHONE of CALLMEBOT_APIKEY ontbreekt');
    return false;
  }

  try {
    // CallMeBot API - URL encode the message
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;

    const response = await fetch(url);
    
    if (response.ok) {
      logger.info('WHATSAPP', 'Notificatie verzonden', { messageLength: message.length });
      return true;
    } else {
      const text = await response.text();
      logger.error('WHATSAPP', 'Verzenden mislukt', { status: response.status, response: text });
      return false;
    }
  } catch (error) {
    logger.error('WHATSAPP', 'Fout bij verzenden', { error: error.message });
    return false;
  }
};

/**
 * Send notification for new review submission
 */
const notifyNewReview = async (review) => {
  const stars = '⭐'.repeat(review.rating);
  const message = `🆕 Nieuwe review ontvangen!

${stars}
Van: ${review.name} (${review.location})
Dienst: ${review.service}

"${review.review_text.substring(0, 200)}${review.review_text.length > 200 ? '...' : ''}"

👉 Controleer en publiceer via het admin panel`;

  return sendWhatsAppNotification(message);
};

module.exports = {
  sendWhatsAppNotification,
  notifyNewReview,
};
