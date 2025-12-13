const Staff = require("../models/staff.model");
const jwt = require("jsonwebtoken");

// generate 6-digit OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// JWT for staff
const generateToken = (staff) => {
  return jwt.sign(
    {
      SID: staff.SID,
      MID: staff.MID,
      phoneNumber: staff.phoneNumber,
      role: "staff",
      staffRole: staff.role,
    },
    process.env.JWT_SECRET || "MY_SECRET_KEY",
    { expiresIn: "7d" }
  );
};

// STEP 1: send staff OTP (merchant triggers, or staff login screen)
exports.sendStaffOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "phoneNumber is required" });
    }

    const staff = await Staff.findOne({ phoneNumber });

    if (!staff || !staff.isActive) {
      return res.status(404).json({
        success: false,
        message: "Staff not found or inactive",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    staff.otpCode = otp;
    staff.otpExpiresAt = expiresAt;
    await staff.save();

    // later: integrate SMS service
    console.log("Staff OTP:", otp, "for phone:", phoneNumber);

    return res.status(200).json({
      success: true,
      message: "OTP sent to staff phone (check server log now)",
    });
  } catch (error) {
    console.error("Send Staff OTP Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// STEP 2: verify OTP and return staff token
exports.verifyStaffOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber and otp are required",
      });
    }

    const staff = await Staff.findOne({ phoneNumber });

    if (!staff || !staff.isActive) {
      return res.status(404).json({
        success: false,
        message: "Staff not found or inactive",
      });
    }

    if (!staff.otpCode || !staff.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No OTP requested or OTP expired. Please request again.",
      });
    }

    if (staff.otpExpiresAt < new Date()) {
      staff.otpCode = null;
      staff.otpExpiresAt = null;
      await staff.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request again.",
      });
    }

    if (staff.otpCode !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }

    staff.otpCode = null;
    staff.otpExpiresAt = null;
    await staff.save();

    const token = generateToken(staff);

    return res.status(200).json({
      success: true,
      message: "OTP verified. Staff login successful.",
      token,
      staff,
    });
  } catch (error) {
    console.error("Verify Staff OTP Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/staff/me
exports.getStaffMe = async (req, res) => {
  try {
    const { SID } = req.staff || {};
    if (!SID) {
      return res
        .status(401)
        .json({ success: false, message: "Staff token missing" });
    }

    const staff = await Staff.findOne({ SID }).lean();

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get Staff Me Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
