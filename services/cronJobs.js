const cron = require('node-cron');
const itemModel = require('../models/item');
const userModel = require('../models/user');
const mailer = require('./mailer');

/**
 * Initialize cron jobs
 * Runs daily at 08:00 to check for expiring items
 */
function initCronJobs() {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily cleanup job at', new Date().toISOString());
    
    try {
      const items = await itemModel.findRecentItems(1000); // Get all items
      const now = new Date();
      
      for (const item of items) {
        if (!item.createdAt || item.status === 'resolved' || item.status === 'expired') {
          continue; // Skip if no creation date or already resolved/expired
        }
        
        const createdDate = new Date(item.createdAt);
        const ageInDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        
        // If item is 23 days old, send reminder email
        if (ageInDays === 23) {
          console.log(`[CRON] Sending expiry reminder for item ${item.id} (${item.name})`);
          
          if (item.ownerEmail) {
            const dashboardLink = process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : 'https://lost2found.example.com/dashboard';
            await mailer.sendExpiryReminderNotification(
              item.ownerEmail,
              item.name,
              dashboardLink
            );
          }
        }
        
        // If item is 30+ days old, archive it and send final notification
        if (ageInDays >= 30 && item.status !== 'expired') {
          console.log(`[CRON] Archiving item ${item.id} (${item.name})`);
          
          // Update item status
          await itemModel.updateItemStatus(item.id, 'expired');
          
          // Send archive notification
          if (item.ownerEmail) {
            await mailer.sendPostArchivedNotification(
              item.ownerEmail,
              item.name
            );
          }
        }
      }
      
      console.log('[CRON] Daily cleanup job completed');
    } catch (error) {
      console.error('[CRON] Error during daily cleanup job:', error);
    }
  });
  
  console.log('[CRON] Cron jobs initialized');
}

module.exports = { initCronJobs };
