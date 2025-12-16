const Merchant = require("../models/merchants.model");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../services/emailService");

// 🔹 Helper: generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🔹 Helper: create JWT token
const generateToken = (merchant) => {
  return jwt.sign(
    { MID: merchant.MID, email: merchant.email },
    process.env.JWT_SECRET || "MY_SECRET_KEY",
    { expiresIn: "7d" }
  );
};

// ===============================
// 🔹 STEP 1: SEND OTP TO EMAIL
// ===============================
exports.sendMerchantOtp = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "email is required" });
    }

    email = email.trim().toLowerCase();

    const merchant = await Merchant.findOne({ email });

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    merchant.otpCode = otp;
    merchant.otpExpiresAt = expiresAt;
    await merchant.save();

    // ✅ SEND EMAIL
    await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to email",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
    });
  }
};
// ===============================
// 🔹 STEP 2: VERIFY OTP & LOGIN
// ===============================
exports.verifyMerchantOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const merchant = await Merchant.findOne({ email });

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    // No OTP requested
    if (!merchant.otpCode || !merchant.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP requested or OTP expired. Please request again.",
      });
    }

    // Expired OTP
    if (merchant.otpExpiresAt < new Date()) {
      merchant.otpCode = null;
      merchant.otpExpiresAt = null;
      await merchant.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request again.",
      });
    }

    // Invalid OTP
    if (merchant.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP valid → clear & login
    merchant.otpCode = null;
    merchant.otpExpiresAt = null;
    await merchant.save();

    const token = generateToken(merchant);

    return res.status(200).json({
      success: true,
      message: "OTP verified. Login successful.",
      token,
      merchant,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
