const express = require("express");
const router = express.Router();

const {
  sendBorrowerOtp,
  verifyBorrowerOtp,
  getBorrowerMe,
} = require("../controllers/borrowerAuth.controller");

const borrowerAuth = require("../middleware/borrowerAuth");

// Base: /api/auth/borrower

// Send OTP
router.post("/send-otp", sendBorrowerOtp);

// Verify OTP + get token
router.post("/verify-otp", verifyBorrowerOtp);

// Get logged-in borrower profile
router.get("/me", borrowerAuth, getBorrowerMe);

module.exports = router;
