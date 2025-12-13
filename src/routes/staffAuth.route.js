const express = require("express");
const router = express.Router();

const {
  sendStaffOtp,
  verifyStaffOtp,
  getStaffMe,
} = require("../controllers/staffAuth.controller");

const staffAuth = require("../middleware/staffAuth");

// Base: /api/auth/staff

// Send OTP to staff phone
router.post("/send-otp", sendStaffOtp);

// Verify OTP + get token
router.post("/verify-otp", verifyStaffOtp);

// Get logged-in staff profile
router.get("/me", staffAuth, getStaffMe);

module.exports = router;
