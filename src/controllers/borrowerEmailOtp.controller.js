const Borrower = require("../models/borrower.model");
const sendEmail = require("../services/emailService"); // your nodemailer util

// In-memory OTP (later you can move to DB / Redis)
const emailOtpStore = new Map();

exports.sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const BID = req.borrower?.BID;

    if (!email || !BID) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    emailOtpStore.set(BID, { otp, email, expires: Date.now() + 5 * 60 * 1000 });



    console.log("Borrower OTP:", otp, "for email:", email);


    // await sendOtpEmail(email, otp);

    // await sendEmail({
    //   to: email,
    //   subject: "Verify your email – LendSafe",
    //   text: `Your verification code is ${otp}. Valid for 5 minutes.`,
    // });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const BID = req.borrower?.BID;

    const record = emailOtpStore.get(BID);

    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    await Borrower.updateOne(
      { BID },
      { email: record.email, emailVerified: true }
    );

    emailOtpStore.delete(BID);

    res.json({ success: true, message: "Email verified" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
