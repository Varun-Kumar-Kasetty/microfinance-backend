// src/routes/reports.routes.js

const express = require("express");
const router = express.Router();

const {
  getMerchantSummaryReport,
  getMerchantDailyCollections,
  getMerchantBorrowerReport,
} = require("../controllers/reports.controller");

const auth = require("../middleware/auth"); // merchant JWT

// Base: /api/reports

// MERCHANT SUMMARY
router.get("/merchant/summary", auth, getMerchantSummaryReport);

// MERCHANT DAILY COLLECTIONS (for charts)
router.get("/merchant/daily-collections", auth, getMerchantDailyCollections);

// MERCHANT BORROWER PERFORMANCE
router.get("/merchant/borrowers", auth, getMerchantBorrowerReport);

module.exports = router;
