const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send OTP email
 */
const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"LendSafe" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your LendSafe Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>LendSafe OTP Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 4px;">${otp}</h1>
        <p>This OTP is valid for <b>5 minutes</b>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <small>— LendSafe Team</small>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
