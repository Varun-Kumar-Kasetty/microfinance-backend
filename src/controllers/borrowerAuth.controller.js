const Borrower = require("../models/borrower.model");
const jwt = require("jsonwebtoken");

// 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// JWT for borrower
const generateToken = (borrower) => {
  return jwt.sign(
    {
      BID: borrower.BID,
      phoneNumber: borrower.phoneNumber,
      role: "borrower",
    },
    process.env.JWT_SECRET || "MY_SECRET_KEY",
    { expiresIn: "7d" }
  );
};

// STEP 1: send OTP to borrower phone
exports.sendBorrowerOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "phoneNumber is required" });
    }

    const borrower = await Borrower.findOne({ phoneNumber });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    borrower.otpCode = otp;
    borrower.otpExpiresAt = expiresAt;
    await borrower.save();

    // Later: integrate SMS service here
    console.log("Borrower OTP:", otp, "for phone:", phoneNumber);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully (check server log for now)",
    });
  } catch (error) {
    console.error("Send Borrower OTP Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// STEP 2: verify OTP, return JWT
exports.verifyBorrowerOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber and otp are required",
      });
    }

    const borrower = await Borrower.findOne({ phoneNumber });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }

    // OTP OK → clear it, issue token
    borrower.otpCode = null;
    borrower.otpExpiresAt = null;
    await borrower.save();

    const token = generateToken(borrower);

    return res.status(200).json({
      success: true,
      message: "OTP verified. Login successful.",
      token,
      borrower,
    });
  } catch (error) {
    console.error("Verify Borrower OTP Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// STEP 3: get current borrower profile from token
exports.getBorrowerMe = async (req, res) => {
  try {
    const BID = req.borrower?.BID;

    if (!BID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: borrower token missing" });
    }

    const borrower = await Borrower.findOne({ BID }).lean();

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    return res.status(200).json({
      success: true,
      data: borrower,
    });
  } catch (error) {
    console.error("Get Borrower Me Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
