const Borrower = require("../models/borrower.model");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../services/emailService");

// ===============================
// Helpers
// ===============================

// 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// JWT for borrower
const generateToken = (borrower) => {
  return jwt.sign(
    {
      BID: borrower.BID,
      email: borrower.email,
      role: "borrower",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ===============================
// STEP 1: SEND OTP (EMAIL)
// ===============================
exports.sendBorrowerOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const borrower = await Borrower.findOne({ email });

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found with this email",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    borrower.otpCode = otp;
    borrower.otpExpiresAt = expiresAt;
    await borrower.save();


    console.log("Borrower OTP:", otp, "for email:", email);

    // await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Send Borrower OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// ===============================
// STEP 2: VERIFY OTP (EMAIL)
// ===============================
exports.verifyBorrowerOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const borrower = await Borrower.findOne({ email });

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    if (!borrower.otpCode || !borrower.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP requested or OTP expired. Please request again.",
      });
    }

    if (borrower.otpExpiresAt < new Date()) {
      borrower.otpCode = null;
      borrower.otpExpiresAt = null;
      await borrower.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request again.",
      });
    }

    if (borrower.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP verified → clear OTP
    borrower.otpCode = null;
    borrower.otpExpiresAt = null;
    await borrower.save();

    const token = generateToken(borrower);

    return res.status(200).json({
      success: true,
      message: "OTP verified. Login successful.",
      token,
      borrower: {
        BID: borrower.BID,
        borrowerUID: borrower.borrowerUID,
        fullName: borrower.fullName,
        email: borrower.email,
      },
    });

  } catch (error) {
    console.error("Verify Borrower OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

// ===============================
// STEP 3: GET CURRENT BORROWER
// ===============================
exports.getBorrowerMe = async (req, res) => {
  try {
    const BID = req.borrower?.BID;

    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: borrower token missing",
      });
    }

    const borrower = await Borrower.findOne({ BID }).lean();

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: borrower,
    });

  } catch (error) {
    console.error("Get Borrower Me Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch borrower profile",
    });
  }
};
