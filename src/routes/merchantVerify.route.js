const express = require("express");
const router = express.Router();

const { verifyBorrower } = require("../controllers/verifyBorrower.controller");

/**
 * Merchant → Verify Borrower
 * - Permanent QR
 * - Temporary QR
 * - Manual Borrower UID
 */
router.post("/verify", verifyBorrower);

module.exports = router;
