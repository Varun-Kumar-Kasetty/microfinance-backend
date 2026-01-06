const Loan = require("../models/loans.model");
const { payLoanAmount } = require("./loan.controller");

exports.mockPayment = async (req, res) => {
  try {
    const borrower = req.borrower;
    const { lid } = req.params;
    const { amount, method } = req.body;

    if (!borrower?.BID) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan || loan.status !== "active") {
      return res.status(400).json({ success: false, message: "Invalid loan" });
    }

    if (loan.BID !== borrower.BID) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const remaining = loan.loanAmount - loan.totalPaid;
    if (amount <= 0 || amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Max payable amount is ₹${remaining}`,
      });
    }

    // 🔁 simulate success
    req.params.lid = lid;
    req.body = {
      amount,
      method: method || "mock",
      note: "Mock payment success",
    };

    return payLoanAmount(req, res);

  } catch (e) {
    console.error("Mock Payment Error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};
