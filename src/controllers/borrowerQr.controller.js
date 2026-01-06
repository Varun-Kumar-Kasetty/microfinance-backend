const crypto = require("crypto");
const Borrower = require("../models/borrower.model");
const BorrowerQrToken = require("../models/borrowerQrToken.model");

/**
 * =========================================
 * GET PERMANENT BORROWER QR (MENU USE)
 * =========================================
 * - Generated once
 * - Never expires
 * - Reusable
 * - Used in Borrower Menu → My QR Code
 */
exports.getPermanentBorrowerQr = async (req, res) => {
  try {
    const borrowerBID = req.borrower?.BID;

    if (!borrowerBID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const borrower = await Borrower.findOne(
      { BID: borrowerBID },        // ✅ correct query
      {
        borrowerUID: 1,
        fullName: 1,
        permanentQrToken: 1,
      }
    );

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    if (!borrower.permanentQrToken) {
      return res.status(500).json({
        success: false,
        message: "Permanent QR not generated",
      });
    }

    return res.status(200).json({
      success: true,
      qrType: "PERMANENT",
      qrToken: borrower.permanentQrToken,
      borrowerUID: borrower.borrowerUID,
      fullName: borrower.fullName,
    });
  } catch (error) {
    console.error("Get permanent QR error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch permanent QR",
    });
  }
};


/**
 * =========================================
 * GENERATE TEMPORARY BORROWER QR (SECURE)
 * =========================================
 * - Valid for 60 seconds
 * - One-time use
 * - Stored in borrower_qr_tokens
 * - Optional (future secure flows)
 */
exports.generateTemporaryBorrowerQr = async (req, res) => {
  try {
    const borrowerUID = req.borrower?.BID;


    if (!borrowerUID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const borrower = await Borrower.findOne({ borrowerUID });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // Secure random token
    const token = crypto.randomBytes(24).toString("hex");

    // Token valid for 60 seconds
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await BorrowerQrToken.create({
      borrowerUID,
      token,
      expiresAt,
      used: false,
    });

    return res.status(200).json({
      success: true,
      qrType: "TEMPORARY",
      qrData: {
        token,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Temporary QR generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate temporary QR",
    });
  }
};
