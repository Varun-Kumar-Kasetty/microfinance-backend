const express = require("express");
const router = express.Router();

const {
  sendMerchantDailySummary,
  sendBorrowerDailyReminders,
} = require("../cron/dailySummary.cron");

// Manually trigger daily summary
router.get("/run/merchant", async (req, res) => {
  await sendMerchantDailySummary();
  res.json({ success: true, message: "Merchant summary cron triggered" });
});

// Manually trigger borrower reminders
router.get("/run/borrower", async (req, res) => {
  await sendBorrowerDailyReminders();
  res.json({ success: true, message: "Borrower reminder cron triggered" });
});

module.exports = router;
