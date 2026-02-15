const cron = require('node-cron');
const pool = require('../config/database');
const logger = require('./logger');
const { sendEquipmentExpiringNotification } = require('./email');
const { getWascoScraper } = require('./wasco');

// =============================================
// Daily Equipment Calibration Check
// =============================================

async function checkEquipmentCalibration() {
  const startTime = Date.now();
  logger.info('CRON', 'Starting daily equipment calibration check');
  
  try {
    const daysAhead = 30;
    
    const [expiringEquipment] = await pool.query(`
      SELECT * FROM equipment 
      WHERE is_active = 1 
        AND calibration_valid_until IS NOT NULL
        AND calibration_valid_until <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY calibration_valid_until ASC
    `, [daysAhead]);
    
    if (expiringEquipment.length === 0) {
      logger.info('CRON', 'No equipment expiring within 30 days', {
        duration: Date.now() - startTime
      });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expired = expiringEquipment.filter(eq => new Date(eq.calibration_valid_until) < today);
    const expiringSoon = expiringEquipment.filter(eq => new Date(eq.calibration_valid_until) >= today);
    
    logger.info('CRON', 'Found equipment requiring attention', {
      total: expiringEquipment.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length
    });
    
    const result = await sendEquipmentExpiringNotification(expiringEquipment);
    
    logger.info('CRON', 'Equipment calibration check completed', {
      success: result.success,
      notified: expiringEquipment.length,
      duration: Date.now() - startTime
    });
    
  } catch (err) {
    logger.error('CRON', 'Error in equipment calibration check', {
      error: err.message,
      stack: err.stack,
      duration: Date.now() - startTime
    });
  }
}

// =============================================
// Weekly Wasco Price Sync
// =============================================

async function syncWascoPrices() {
  const startTime = Date.now();
  logger.info('CRON', 'Starting weekly Wasco price sync');

  try {
    // Get all mappings
    const [mappings] = await pool.query(
      'SELECT product_id, wasco_article_number FROM wasco_mappings'
    );

    if (mappings.length === 0) {
      logger.info('CRON', 'No Wasco mappings found, skipping sync');
      return;
    }

    const scraper = getWascoScraper();
    const results = await scraper.syncProducts(pool, mappings);

    // Update last_synced_at for successful syncs
    for (const detail of results.details) {
      if (detail.status === 'updated') {
        await pool.query(
          `UPDATE wasco_mappings SET 
            last_synced_at = NOW(),
            last_bruto_price = ?,
            last_netto_price = ?
          WHERE product_id = ?`,
          [detail.brutoPrice, detail.nettoPrice, detail.productId]
        );
      }
    }

    logger.info('CRON', 'Wasco price sync completed', {
      total: results.total,
      updated: results.updated,
      failed: results.failed,
      duration: Date.now() - startTime
    });

  } catch (err) {
    logger.error('CRON', 'Error in Wasco price sync', {
      error: err.message,
      stack: err.stack,
      duration: Date.now() - startTime
    });
  }
}

// =============================================
// Initialize Cron Jobs
// =============================================

function initCronJobs() {
  // Daily equipment calibration check at 08:00
  cron.schedule('0 8 * * *', () => {
    checkEquipmentCalibration();
  }, {
    timezone: 'Europe/Amsterdam'
  });

  // Weekly Wasco price sync on Monday at 06:00
  cron.schedule('0 6 * * 1', () => {
    syncWascoPrices();
  }, {
    timezone: 'Europe/Amsterdam'
  });
  
  logger.info('CRON', 'Cron jobs initialized', {
    jobs: [
      { name: 'equipment-calibration-check', schedule: '0 8 * * * (daily at 08:00)' },
      { name: 'wasco-price-sync', schedule: '0 6 * * 1 (weekly Monday at 06:00)' }
    ]
  });
  
  console.log('⏰ Cron jobs gestart: dagelijkse gereedschapskeuring check om 08:00');
  console.log('⏰ Cron jobs gestart: wekelijkse Wasco prijssync op maandag om 06:00');
}

// Export for manual triggering if needed
module.exports = {
  initCronJobs,
  checkEquipmentCalibration,
  syncWascoPrices
};
