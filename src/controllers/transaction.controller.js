const Transaction = require("../models/transactions.model");
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");

// =====================================================
// MERCHANT – view all transactions of their borrowers
// (STEP 1 FIX APPLIED HERE)
// =====================================================
exports.getMerchantTransactions = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: merchant token missing",
      });
    }

    const { bid, lid } = req.query;
    const filter = { MID: Number(MID) };

    if (bid) filter.BID = Number(bid);
    if (lid) filter.LID = Number(lid);

    // 1️⃣ Fetch transactions (NO aggregation math here)
    const txns = await Transaction.find(filter)
      .sort({ paidAt: -1 })
      .lean();

    // 2️⃣ Fetch loans for this merchant
    const loans = await Loan.find({ MID: Number(MID) }).lean();

    // 3️⃣ Calculate total collected (SOURCE OF TRUTH)
    const totalCollected = loans.reduce(
      (sum, loan) => sum + (loan.totalPaid || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: txns,
      totalCollected, // ✅ USED BY TRANSACTION PAGE
    });
  } catch (error) {
    console.error("Get Merchant Transactions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// BORROWER – view their own payment history (by BID)
// (UNCHANGED)
// =====================================================
exports.getBorrowerTransactions = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOne({ BID: Number(bid) });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    const txns = await Transaction.find({ BID: Number(bid) })
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: txns,
    });
  } catch (error) {
    console.error("Get Borrower Transactions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// CREATE TRANSACTION (Merchant adds payment)
// (UNCHANGED – handled via loan payment controller)
// =====================================================
exports.createTransaction = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: merchant token missing",
      });
    }

    const { BID, LID, amount, method, note } = req.body;

    if (!BID || !LID || !amount) {
      return res.status(400).json({
        success: false,
        message: "BID, LID and amount are required",
      });
    }

    const txn = new Transaction({
      MID,
      BID,
      LID,
      amount,
      method: method || "cash",
      note: note || "",
    });

    await txn.save();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: txn,
    });
  } catch (error) {
    console.error("Create Transaction Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// PER-LOAN – history for a specific loan
// (UNCHANGED)
// =====================================================
exports.getLoanTransactions = async (req, res) => {
  try {
    const { lid } = req.params;

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    const txns = await Transaction.find({ LID: Number(lid) })
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: txns,
    });
  } catch (error) {
    console.error("Get Loan Transactions Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
