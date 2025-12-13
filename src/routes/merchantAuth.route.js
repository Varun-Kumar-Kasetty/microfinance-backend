const express = require("express");
const router = express.Router();
const {
  sendMerchantOtp,
  verifyMerchantOtp,
} = require("../controllers/merchantAuth.controller");

// POST /api/auth/merchant/send-otp
router.post("/send-otp", sendMerchantOtp);

// POST /api/auth/merchant/verify-otp
router.post("/verify-otp", verifyMerchantOtp);

module.exports = router;
