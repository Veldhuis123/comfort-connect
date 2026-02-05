const cron = require('node-cron');
const pool = require('../config/database');
const logger = require('./logger');
const { sendEquipmentExpiringNotification } = require('./email');

// =============================================
// Daily Equipment Calibration Check
// =============================================

async function checkEquipmentCalibration() {
  const startTime = Date.now();
  logger.info('CRON', 'Starting daily equipment calibration check');
  
  try {
    const daysAhead = 30; // Check 30 days ahead
    
    // Get equipment expiring within the specified days
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
    
    // Separate into expired and expiring soon
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expired = expiringEquipment.filter(eq => new Date(eq.calibration_valid_until) < today);
    const expiringSoon = expiringEquipment.filter(eq => new Date(eq.calibration_valid_until) >= today);
    
    logger.info('CRON', 'Found equipment requiring attention', {
      total: expiringEquipment.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length
    });
    
    // Send notification
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
// Initialize Cron Jobs
// =============================================

function initCronJobs() {
  // Daily equipment calibration check at 08:00
  cron.schedule('0 8 * * *', () => {
    checkEquipmentCalibration();
  }, {
    timezone: 'Europe/Amsterdam'
  });
  
  logger.info('CRON', 'Cron jobs initialized', {
    jobs: [
      { name: 'equipment-calibration-check', schedule: '0 8 * * * (daily at 08:00)' }
    ]
  });
  
  console.log('⏰ Cron jobs gestart: dagelijkse gereedschapskeuring check om 08:00');
}

// Export for manual triggering if needed
module.exports = {
  initCronJobs,
  checkEquipmentCalibration
};
