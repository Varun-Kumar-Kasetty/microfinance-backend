const crypto = require("crypto");
const Borrower = require("../models/borrower.model");
const BorrowerQrToken = require("../models/borrowerQrToken.model");

exports.generateBorrowerQr = async (req, res) => {
  try {
    const borrowerUID = req.user.borrowerUID; 
    // req.user should come from borrower auth middleware

    const borrower = await Borrower.findOne({ borrowerUID });
    if (!borrower) {
      return res.status(404).json({ message: "Borrower not found" });
    }

    // Generate secure random token
    const token = crypto.randomBytes(24).toString("hex");

    // Token valid for 60 seconds
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await BorrowerQrToken.create({
      borrowerUID,
      token,
      expiresAt,
    });

    return res.status(200).json({
      success: true,
      qrData: {
        borrowerUID,
        token,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({ message: "Failed to generate QR" });
  }
};
