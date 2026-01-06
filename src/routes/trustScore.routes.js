const express = require("express");
const router = express.Router();

const {
  getBorrowerTrustScoreTimeline,
} = require("../controllers/trustScore.controller");

const borrowerAuth = require("../middleware/borrowerAuth");

// Borrower: view own trust score timeline
router.get(
  "/borrower/me",
  borrowerAuth,
  getBorrowerTrustScoreTimeline
);

// Admin / internal: view by BID
router.get(
  "/borrower/:bid",
  getBorrowerTrustScoreTimeline
);

module.exports = router;
