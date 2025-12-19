const Borrower = require("../models/borrower.model");
const BorrowerQrToken = require("../models/borrowerQrToken.model");

exports.verifyBorrower = async (req, res) => {
  try {
    const { borrowerUID, qrToken } = req.body;

    // ❌ No input
    if (!borrowerUID && !qrToken) {
      return res.status(400).json({
        message: "Borrower UID or QR token required",
      });
    }

    let borrower;

    // 🔍 CASE 1: QR TOKEN VERIFICATION
    if (qrToken) {
      const tokenDoc = await BorrowerQrToken.findOne({
        token: qrToken,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!tokenDoc) {
        return res.status(400).json({
          message: "Invalid or expired QR token",
        });
      }

      borrower = await Borrower.findOne({
        borrowerUID: tokenDoc.borrowerUID,
      });

      if (!borrower) {
        return res.status(404).json({
          message: "Borrower not found",
        });
      }

      // Mark token as used
      tokenDoc.used = true;
      await tokenDoc.save();
    }

    // 🔍 CASE 2: MANUAL BORROWER UID
    if (!borrower && borrowerUID) {
      borrower = await Borrower.findOne({ borrowerUID });

      if (!borrower) {
        return res.status(404).json({
          message: "Borrower not found",
        });
      }
    }

    // ✅ VERIFIED RESPONSE (SAFE DATA ONLY)
    return res.status(200).json({
      success: true,
      borrower: {
        borrowerUID: borrower.borrowerUID,
        fullName: borrower.fullName,
        phoneNumber: borrower.phoneNumber, // optional, can mask later
        trustScore: borrower.trustScore,
        totalLoans: borrower.totalLoans,
        activeLoans: borrower.activeLoans,
        city: borrower.city,
        state: borrower.state,
      },
    });
  } catch (error) {
    console.error("Verify borrower error:", error);
    res.status(500).json({
      message: "Failed to verify borrower",
    });
  }
};
