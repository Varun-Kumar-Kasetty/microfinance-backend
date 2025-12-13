const Transaction = require("../models/transactions.model");
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");

// MERCHANT – view all transactions of their borrowers
exports.getMerchantTransactions = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const { bid, lid } = req.query;
    const filter = { MID: Number(MID) };

    if (bid) filter.BID = Number(bid);
    if (lid) filter.LID = Number(lid);

    const txns = await Transaction.find(filter)
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: txns,
    });
  } catch (error) {
    console.error("Get Merchant Transactions Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BORROWER – view their own payment history (by BID)
exports.getBorrowerTransactions = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOne({ BID: Number(bid) });
    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PER-LOAN – history for a specific loan
exports.getLoanTransactions = async (req, res) => {
  try {
    const { lid } = req.params;

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
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
    return res.status(500).json({ success: false, message: error.message });
  }
};
