const express = require("express");
const router = express.Router();

const {
  createMerchant,
  getAllMerchants,
  getMerchantByMID,
  updateMerchantByMID,
  deleteMerchantByMID,
  getMerchantSelfProfile,
  updateMerchantSelfProfile,
  sendMerchantEmailOtp,
  verifyMerchantEmailOtp,
} = require("../controllers/merchant.controller");

const merchantAuth = require("../middleware/auth");

/*
|--------------------------------------------------------------------------
| SELF PROFILE (JWT BASED) – USED BY ANDROID APP
|--------------------------------------------------------------------------
| These MUST come BEFORE any :mid routes
*/

// GET logged-in merchant profile
router.get("/profile", merchantAuth, getMerchantSelfProfile);

// UPDATE logged-in merchant profile (restricted fields)
router.put("/profile", merchantAuth, updateMerchantSelfProfile);

// 🔒 EMAIL UPDATE (OTP FLOW)
router.post(
  "/profile/email/send-otp",
  merchantAuth,
  sendMerchantEmailOtp
);

router.post(
  "/profile/email/verify",
  merchantAuth,
  verifyMerchantEmailOtp
);

/*
|--------------------------------------------------------------------------
| ADMIN / INTERNAL ROUTES
|--------------------------------------------------------------------------
*/

// CREATE merchant
router.post("/", createMerchant);

// READ ALL merchants
router.get("/", getAllMerchants);

// READ merchant by MID
router.get("/:mid", getMerchantByMID);

// UPDATE merchant by MID
router.put("/:mid", updateMerchantByMID);

// DELETE merchant by MID
router.delete("/:mid", deleteMerchantByMID);

module.exports = router;
