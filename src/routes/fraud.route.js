const express = require("express");
const router = express.Router();

const {
  getMerchantFraudAlerts,
  getBorrowerFraudInfo,
  resolveFraudAlert,
} = require("../controllers/fraud.controller");

const auth = require("../middleware/auth"); // merchant JWT

// Base: /api/fraud

// MERCHANT – list alerts (optional: ?unresolved=true&severity=high)
router.get("/merchant", auth, getMerchantFraudAlerts);

// MERCHANT – fraud summary for a borrower
router.get("/borrower/:bid", auth, getBorrowerFraudInfo);

// MERCHANT – resolve a specific fraud alert
router.post("/:faid/resolve", auth, resolveFraudAlert);

module.exports = router;
