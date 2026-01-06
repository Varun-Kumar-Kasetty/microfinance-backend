const Transaction = require("../models/transactions.model");
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");
const { logActivity } = require("../utils/activityLogger");
const { createNotification } = require("../services/notification.service");

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

    // 1️⃣ Fetch transactions
    const txns = await Transaction.find(filter)
      .sort({ paidAt: -1 })
      .lean();

    // 2️⃣ Fetch borrowers (USE fullName)
    const borrowerBIDs = [...new Set(txns.map(t => t.BID))];

    const borrowers = await Borrower.find(
      { BID: { $in: borrowerBIDs } },
      { BID: 1, fullName: 1 }   // ✅ FIXED
    ).lean();

    // 3️⃣ Create BID → fullName map
    const borrowerMap = {};
    borrowers.forEach(b => {
      borrowerMap[b.BID] = b.fullName;  // ✅ FIXED
    });

    // 4️⃣ Attach borrowerName to each transaction
    const enrichedTxns = txns.map(txn => ({
      ...txn,
      borrowerName: borrowerMap[txn.BID] || null
    }));

    // 5️⃣ Total collected
    const loans = await Loan.find({ MID: Number(MID) }).lean();
    const totalCollected = loans.reduce(
      (sum, loan) => sum + (loan.totalPaid || 0),
      0
    );


    return res.status(200).json({
      success: true,
      data: enrichedTxns,
      totalCollected,
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

    const enrichedTxns = txns.map(txn => ({
      ...txn,
      borrowerName: borrower.fullName   // ✅ FIXED
    }));

    return res.status(200).json({
      success: true,
      data: enrichedTxns,
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

    const { BID, LID, amount, method, note, type } = req.body;

    if (!BID || !LID || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: "BID, LID, amount and type are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // 1️⃣ Fetch loan
    const loan = await Loan.findOne({
      LID: Number(LID),
      MID: Number(MID),
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    let newTotalPaid = loan.totalPaid;

    // 2️⃣ Apply transaction effect
    if (type === "YOU_GOT") {
      newTotalPaid += amount;
    } else if (type === "YOU_GAVE") {
      newTotalPaid -= amount;
      if (newTotalPaid < 0) newTotalPaid = 0;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    // 3️⃣ Calculate remaining
    const remainingAfterPayment = Math.max(
      loan.loanAmount - newTotalPaid,
      0
    );

    // 4️⃣ Update loan
    loan.totalPaid = newTotalPaid;
    loan.remainingAmount = remainingAfterPayment;
    await loan.save();

    // 5️⃣ Create transaction
    const txn = new Transaction({
      MID,
      BID,
      LID,
      amount,
      method: method || "cash",
      note: note || "",
      type,
      remainingAfterPayment,
    });

    await txn.save();

    // ================= ACTIVITY + NOTIFICATION =================
    await logActivity({
      merchantId: MID,
      borrowerId: BID,
      loanId: LID,
      type: "REPAYMENT",
      amount,
      description:
        type === "YOU_GOT"
          ? `Borrower paid ₹${amount}`
          : `Merchant gave ₹${amount}`,
      notifyMerchant: true,
      notifyBorrower: false,
    });

    if (type === "YOU_GOT") {
      await createNotification({
        targetType: "merchant",
        MID,
        BID,
        LID,
        type: "repayment",
        title: "Repayment Received 💰",
        message: `Borrower paid ₹${amount} towards loan LID ${LID}.`,
      });
    }

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


exports.createLoanViaYouGave = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { BID, amount, loanDurationDays, note } = req.body;

    if (!BID || !amount || !loanDurationDays) {
      return res.status(400).json({
        success: false,
        message: "BID, amount and loanDurationDays are required",
      });
    }

    if (loanDurationDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan duration",
      });
    }

    const borrower = await Borrower.findOne({ BID });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // 1️⃣ Create new loan
    const newLoan = new Loan({
      MID,
      BID,
      loanAmount: amount,
      totalPaid: 0,
      remainingAmount: amount,
      loanDurationDays,
      status: "active",
      createdAt: new Date(),
    });

    await newLoan.save();

    // 2️⃣ Create transaction snapshot
    const txn = new Transaction({
      MID,
      BID,
      LID: newLoan.LID,
      amount,
      method: "cash",
      note: note || "Loan given",
      remainingAfterPayment: amount,
      type: "YOU_GAVE",
    });

    await txn.save();

    // ================= ACTIVITY LOG =================
    await logActivity({
      merchantId: MID,
      borrowerId: BID,
      loanId: newLoan.LID,
      type: "LOAN_CREATED",
      amount,
      description: "Loan given (YOU_GAVE)",
      notifyMerchant: true,
      notifyBorrower: true,
    });

    // ================= NOTIFICATIONS =================

    // Merchant notification
    await createNotification({
      targetType: "merchant",
      MID,
      BID,
      LID: newLoan.LID,
      type: "loan_created",
      title: "Loan Given 💸",
      message: `You gave ₹${amount} to borrower BID ${BID}.`,
    });

    // Borrower notification
    await createNotification({
      targetType: "borrower",
      MID,
      BID,
      LID: newLoan.LID,
      type: "loan_created",
      title: "Loan Received",
      message: `You received ₹${amount} as a loan.`,
    });

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: {
        loan: newLoan,
        transaction: txn,
      },
    });

  } catch (error) {
    console.error("YOU_GAVE Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ----------------- BORROWER TRANSACTIONS BY MERCHANT -----------------
exports.getBorrowerTransactionsByMerchant = async (req, res) => {
  try {
    const borrower = req.borrower;
    const { mid } = req.query;

    if (!borrower?.BID) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const filter = {
      BID: borrower.BID,
      MID: Number(mid),
    };

    const txns = await Transaction.find(filter)
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: txns,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
