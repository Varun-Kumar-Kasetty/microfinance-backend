const crypto = require("crypto");
const Borrower = require("../models/borrower.model");
const nodemailer = require("nodemailer");

// TEMP STORE (use Redis in future)
const emailOtpStore = new Map();

/* ================= SEND EMAIL OTP ================= */
exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const BID = req.borrower?.BID;

    if (!BID || !email) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    emailOtpStore.set(BID, {
      otp,
      email,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"LendSafe" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      text: `Your verification code is ${otp}`,
    });

    return res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("Send Email OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/* ================= VERIFY EMAIL OTP ================= */
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const BID = req.borrower?.BID;

    const record = emailOtpStore.get(BID);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not requested",
      });
    }

    if (record.expiresAt < Date.now()) {
      emailOtpStore.delete(BID);
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ Update email
    await Borrower.updateOne(
      { BID },
      { $set: { email: record.email } }
    );

    emailOtpStore.delete(BID);

    return res.json({
      success: true,
      message: "Email verified and updated",
    });
  } catch (error) {
    console.error("Verify Email OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};
