const Borrower = require("../models/borrower.model");
const BorrowerQrToken = require("../models/borrowerQrToken.model");
const Loan = require("../models/loans.model");

exports.verifyBorrower = async (req, res) => {
  try {
    const { borrowerUID, qrToken } = req.body;

    // -----------------------------
    // BASIC INPUT VALIDATION
    // -----------------------------
    if (!borrowerUID && !qrToken) {
      return res.status(400).json({
        success: false,
        message: "Borrower UID or QR token required",
      });
    }

    let borrower = null;
    let verifiedVia = "MANUAL_ENTRY";

    // =================================================
    // CASE 1: PERMANENT QR (LSQR-xxxx)
    // =================================================
    if (qrToken && qrToken.startsWith("LSQR-")) {
      borrower = await Borrower.findOne({ permanentQrToken: qrToken });

      if (!borrower) {
        return res.status(400).json({
          success: false,
          message: "Invalid borrower QR",
        });
      }

      verifiedVia = "PERMANENT_QR";
    }

    // =================================================
    // CASE 2: TEMPORARY QR
    // =================================================
    if (!borrower && qrToken) {
      const tokenDoc = await BorrowerQrToken.findOne({
        token: qrToken,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!tokenDoc) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired QR token",
        });
      }

      borrower = await Borrower.findOne({
        borrowerUID: tokenDoc.borrowerUID,
      });

      if (!borrower) {
        return res.status(404).json({
          success: false,
          message: "Borrower not found",
        });
      }

      // Invalidate temp QR after use
      tokenDoc.used = true;
      await tokenDoc.save();

      verifiedVia = "TEMPORARY_QR";
    }

    // =================================================
    // CASE 3: MANUAL BORROWER UID
    // =================================================
    if (!borrower && borrowerUID) {
      borrower = await Borrower.findOne({ borrowerUID });

      if (!borrower) {
        return res.status(404).json({
          success: false,
          message: "Borrower not found",
        });
      }

      verifiedVia = "MANUAL_ENTRY";
    }

    // -----------------------------
    // FINAL SAFETY CHECK
    // -----------------------------
    if (!borrower) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify borrower",
      });
    }

    // =================================================
    // LOAN AGGREGATION (CROSS-MERCHANT)
    // =================================================
    const loans = await Loan.find({ BID: borrower.BID });

    const totalLoans = loans.length;

    const activeLoans = loans.filter(
      (l) => l.status === "active"
    ).length;

    const clearedLoans = loans.filter(
      (l) => l.status === "closed" && l.totalPaid >= l.loanAmount
    ).length;

    const overdueLoans = loans.filter(
      (l) => l.status === "active" && l.isOverdue === true
    ).length;

    // =================================================
    // INFO-ONLY RISK & WARNINGS (NO BLOCKING)
    // =================================================
    let riskLevel = "LOW"; // LOW | MEDIUM | HIGH
    const warnings = [];

    if (totalLoans === 0) {
      warnings.push("New borrower");
    }

    if (borrower.trustScore < 60) {
      riskLevel = "MEDIUM";
      warnings.push("Low trust score");
    }

    if (overdueLoans > 0) {
      riskLevel = "HIGH";
      warnings.push(`${overdueLoans} overdue loan(s)`);
    }

    // =================================================
    // SAFE RESPONSE FOR MERCHANT UI
    // =================================================
    return res.status(200).json({
      success: true,
      verifiedVia,

      data: {
        BID: borrower.BID,
        borrowerUID: borrower.borrowerUID,
        fullName: borrower.fullName,
        phoneNumber: borrower.phoneNumber, // mask in frontend if needed
        location: borrower.location || "Unknown",

        trustScore: borrower.trustScore,
        riskLevel,

        loanStats: {
          total: totalLoans,
          cleared: clearedLoans,
          active: activeLoans,
          overdue: overdueLoans,
        },

        warnings,
        isNewBorrower: totalLoans === 0,
      },
    });
  } catch (error) {
    console.error("Verify borrower error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify borrower",
    });
  }
};
