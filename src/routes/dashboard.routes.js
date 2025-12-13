const express = require("express");
const router = express.Router();

const {
  getMerchantDashboard,
  getBorrowerDashboard,
} = require("../controllers/dashboard.controller");

const auth = require("../middleware/auth"); // merchant JWT auth
const borrowerAuth = require("../middleware/borrowerAuth"); // ⬅ new

// Base: /api/dashboard

// MERCHANT DASHBOARD (for logged-in merchant)
router.get("/merchant", auth, getMerchantDashboard);

// BORROWER DASHBOARD by BID (old way - optional, can keep for admin)
router.get("/borrower/:bid", getBorrowerDashboard);

// BORROWER DASHBOARD for logged-in borrower (using token)
router.get("/borrower/me", borrowerAuth, async (req, res) => {
  // reuse existing controller logic by passing BID from token
  req.params.bid = req.borrower.BID;
  return getBorrowerDashboard(req, res);
});

module.exports = router;
