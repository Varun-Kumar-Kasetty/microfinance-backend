const Loan = require("../models/loans.model");
const Borrower = require("../models/borrower.model");
const Transaction = require("../models/transactions.model");
const TrustScoreEvent = require("../models/trustScoreEvent.model");
const { createNotification } = require("../services/notification.service");
const { runLoanFraudChecks } = require("../services/fraud.service");
const { logActivity } = require("../utils/activityLogger");
const Merchant = require("../models/merchants.model");
const { calculateTrustScore } = require("../utils/trustScore.util");

// ----------------- CREATE LOAN (merchant only) -----------------
exports.createLoan = async (req, res) => {
  try {
    const {
      BID,
      loanAmount,
      loanDurationDays,
      purpose,
      imagePath,
      startDate,
    } = req.body;

    const safeStartDate = startDate ? new Date(startDate) : new Date();

    const merchantMID = req.merchant?.MID;
    if (!merchantMID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: merchant not found in token",
      });
    }

    const borrower = await Borrower.findOne({ BID });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ⚠️ Cross-merchant warning (NO side effects)
    let crossMerchantWarning = null;
    if (borrower.VID && borrower.VID !== merchantMID) {
      crossMerchantWarning = {
        code: "CROSS_MERCHANT_BORROWER",
        message: "Borrower already has a relationship with another merchant",
        previousMerchantId: borrower.VID,
      };
    }

    // ================= CREATE LOAN =================
    const loan = await Loan.create({
      BID,
      MID: merchantMID,
      loanAmount,
      loanDurationDays,
      purpose,
      imagePath,
      startDate: safeStartDate,
      isVerified: borrower.isVerified,
      status: "active",
    });

    // ================= UPDATE BORROWER =================
    borrower.totalLoans = (borrower.totalLoans || 0) + 1;
    borrower.activeLoans = (borrower.activeLoans || 0) + 1;
    borrower.trustScore = Math.max((borrower.trustScore ?? 100) - 5, 0);
    await borrower.save();

    // ================= ACTIVITY + NOTIFICATIONS =================
    await logActivity({
      merchantId: merchantMID,
      borrowerId: borrower.BID,
      loanId: loan.LID,
      type: "LOAN_CREATED",
      amount: loanAmount,
      description: `Loan of ₹${loanAmount} created`,
      notifyMerchant: true,
      notifyBorrower: true,
    });

    // ================= TRUST SCORE EVENT =================
    await TrustScoreEvent.create({
      BID: borrower.BID,
      loanId: loan.LID,
      eventType: "LOAN_TAKEN",
      points: -5,
      description: "Loan taken. Temporary trust score reduction.",
    });

    await logActivity({
      merchantId: merchantMID,
      borrowerId: borrower.BID,
      loanId: loan.LID,
      type: "TRUST_SCORE_CHANGE",
      amount: -5,
      description: "Trust score reduced due to new loan",
      notifyMerchant: false,
      notifyBorrower: true,
    });

    // ================= FRAUD CHECKS =================
    const fraudAlerts = await runLoanFraudChecks(loan);

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      warning: crossMerchantWarning,
      data: { loan, fraudAlerts },
    });

  } catch (error) {
    console.error("Create Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ----------------- GET ALL LOANS -----------------
exports.getAllLoans = async (req, res) => {
  try {
    const { mid, bid, status } = req.query;
    const filter = {};

    if (mid) filter.MID = Number(mid);
    if (bid) filter.BID = Number(bid);
    if (status) filter.status = status;

    // 1️⃣ Fetch loans
    const loans = await Loan.find(filter)
      .sort({ LID: -1 })
      .lean(); // IMPORTANT

    if (loans.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2️⃣ Collect borrower IDs
    const borrowerIds = [
      ...new Set(loans.map((l) => l.BID).filter(Boolean)),
    ];

    // 3️⃣ Fetch borrowers
    const borrowers = await Borrower.find(
      { BID: { $in: borrowerIds } },
      { BID: 1, fullName: 1 }
    ).lean();

    // 4️⃣ Build borrower map
    const borrowerMap = {};
    borrowers.forEach((b) => {
      borrowerMap[b.BID] = b.fullName;
    });

    // 5️⃣ Attach borrowerName
    const enrichedLoans = loans.map((loan) => ({
      ...loan,
      borrowerName: borrowerMap[loan.BID] || "Unknown Borrower",
    }));

    return res.status(200).json({
      success: true,
      data: enrichedLoans,
    });
  } catch (error) {
    console.error("Get All Loans Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ----------------- MERCHANT LOAN SUMMARY -----------------
exports.getMerchantLoanSummary = async (req, res) => {
  try {
    const mid = Number(req.query.mid);
    if (!mid) {
      return res.status(400).json({ success: false, message: "MID required" });
    }

    const data = await Loan.aggregate([
      { $match: { MID: mid } },
      {
        $group: {
          _id: "$BID",
          totalLoanAmount: { $sum: "$loanAmount" },
          totalPaid: { $sum: "$totalPaid" },
          activeRemaining: {
            $sum: {
              $cond: [
                { $eq: ["$status", "active"] },
                { $subtract: ["$loanAmount", "$totalPaid"] },
                0
              ]
            }
          },
          lastLoanDate: { $max: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: "borrowers",
          localField: "_id",
          foreignField: "BID",
          as: "borrower"
        }
      },
      { $unwind: "$borrower" },
      {
        $project: {
          _id: 0,
          BID: "$_id",
          borrowerName: "$borrower.fullName",
          totalLoanAmount: 1,
          totalPaid: 1,
          activeRemaining: 1,
          lastLoanDate: 1
        }
      },
      { $sort: { lastLoanDate: -1 } }
    ]);

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};



// ----------------- GET SINGLE LOAN BY LID -----------------
exports.getLoanByLID = async (req, res) => {
  try {
    const { lid } = req.params;
    const loan = await Loan.findOne({ LID: lid });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.status(200).json({ success: true, data: loan });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- BORROWER / MERCHANT PAYS AMOUNT -----------------
exports.payLoanAmount = async (req, res) => {
  try {
    const { lid } = req.params;
    const { amount, note, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan || loan.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Invalid or closed loan",
      });
    }

    // 🔐 Borrower ownership check
    if (req.borrower && loan.BID !== req.borrower.BID) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to pay this loan",
      });
    }

    const borrower = await Borrower.findOne({ BID: loan.BID });

    const totalPaidBefore = loan.totalPaid || 0;
    const remainingBefore = loan.loanAmount - totalPaidBefore;

    if (amount > remainingBefore) {
      return res.status(400).json({
        success: false,
        message: `Max payable amount is ₹${remainingBefore}`,
      });
    }

    // ================= UPDATE LOAN =================
    loan.totalPaid = totalPaidBefore + amount;

    const remainingAfterPayment =
      loan.loanAmount - loan.totalPaid;

    loan.paymentHistory.push({
      amount,
      note: note || "",
      paidAt: new Date(),
      remainingAfterPayment,
    });

    let loanJustClosed = false;
    let wasOverdue = false;

    if (loan.dueDate && new Date() > new Date(loan.dueDate)) {
      wasOverdue = true;
    }

    if (remainingAfterPayment <= 0) {
      loan.status = "closed";
      loan.closedAt = new Date();
      loanJustClosed = true;
    }

    await loan.save();

    // ================= TRANSACTION =================
    const tx = await Transaction.create({
      LID: loan.LID,
      BID: loan.BID,
      MID: loan.MID,
      amount,
      method: method || "cash",
      note: note || "",
      paidAt: new Date(),
      remainingAfterPayment,
      type: "YOU_GOT",
    });

    // ================= ACTIVITY + NOTIFICATION =================
    await logActivity({
      merchantId: loan.MID,
      borrowerId: loan.BID,
      loanId: loan.LID,
      type: "REPAYMENT",
      amount,
      description: `Borrower paid ₹${amount} towards loan`,
      notifyMerchant: true,   // 🔔 merchant gets push + in-app
      notifyBorrower: false,
    });

    // ================= LOAN CLOSED LOGIC =================
    if (loanJustClosed && borrower) {
      await logActivity({
        merchantId: loan.MID,
        borrowerId: borrower.BID,
        loanId: loan.LID,
        type: "LOAN_CLOSED",
        amount: 0,
        description: "Loan fully repaid and closed",
        notifyMerchant: true,
        notifyBorrower: true,
      });

      borrower.activeLoans = Math.max(
        (borrower.activeLoans || 1) - 1,
        0
      );

      // ================= TRUST SCORE =================
      if (!wasOverdue) {
        const alreadyGiven = await TrustScoreEvent.findOne({
          loanId: loan.LID,
          eventType: "ON_TIME_PAYMENT",
        });

        if (!alreadyGiven) {
          await TrustScoreEvent.create({
            BID: borrower.BID,
            loanId: loan.LID,
            eventType: "ON_TIME_PAYMENT",
            points: +5,
            description: "Loan repaid on or before due date.",
          });

          borrower.trustScore = await calculateTrustScore(
            borrower.BID,
            borrower.trustScore || 100
          );
          await borrower.save();

          await logActivity({
            merchantId: loan.MID,
            borrowerId: borrower.BID,
            loanId: loan.LID,
            type: "TRUST_SCORE_RESTORED",
            amount: 5,
            description: "Trust score restored for on-time payment",
            notifyMerchant: false,
            notifyBorrower: true,
          });
        }
      }

      if (wasOverdue) {
        const recoveryUsed = await TrustScoreEvent.findOne({
          loanId: loan.LID,
          eventType: "LATE_PAYMENT_INCENTIVE",
        });

        if (!recoveryUsed) {
          const bonus = Math.floor(Math.random() * 10) + 1;

          await TrustScoreEvent.create({
            BID: borrower.BID,
            loanId: loan.LID,
            eventType: "LATE_PAYMENT_INCENTIVE",
            points: bonus,
            description: `Late payment incentive +${bonus}.`,
          });

          borrower.trustScore = await calculateTrustScore(
            borrower.BID,
            borrower.trustScore || 100
          );
          await borrower.save();

          await logActivity({
            merchantId: loan.MID,
            borrowerId: borrower.BID,
            loanId: loan.LID,
            type: "TRUST_SCORE_INCENTIVE",
            amount: bonus,
            description: `Late payment incentive +${bonus}`,
            notifyMerchant: false,
            notifyBorrower: true,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: { loan, transaction: tx },
    });

  } catch (error) {
    console.error("Pay Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};






// ----------------- CLOSE LOAN (merchant only) -----------------
exports.closeLoan = async (req, res) => {
  try {
    const { lid } = req.params;

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan || loan.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Invalid loan",
      });
    }

    const borrower = await Borrower.findOne({ BID: loan.BID });

    // ================= ACTIVITY + NOTIFICATION =================
    await logActivity({
      merchantId: loan.MID,
      borrowerId: borrower?.BID,
      loanId: loan.LID,
      type: "LOAN_CLOSED",
      amount: 0,
      description: "Loan closed manually by merchant",
      notifyMerchant: true,
      notifyBorrower: true,
    });

    // ================= UPDATE LOAN =================
    loan.status = "closed";
    loan.closedAt = new Date();
    loan.totalPaid = loan.loanAmount;

    await loan.save();

    return res.status(200).json({
      success: true,
      message: "Loan closed successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Close Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ----------------- BORROWER LOANS (GROUPED BY MERCHANT) -----------------
exports.getBorrowerLoansGroupedByMerchant = async (req, res) => {
  try {
    // borrower from token
    const borrower = await Borrower.findOne({ email: req.borrower?.email });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    const BID = borrower.BID;

    const data = await Loan.aggregate([
      {
        $match: {
          BID,
          status: { $ne: "closed" }, // only active loans
        },
      },
      {
        $group: {
          _id: "$MID",
          totalBorrowed: { $sum: "$loanAmount" },
          totalPaid: { $sum: "$totalPaid" },
          remainingAmount: {
            $sum: { $subtract: ["$loanAmount", "$totalPaid"] },
          },
          activeLoanCount: { $sum: 1 },
          startedOn: { $min: "$startDate" },
          nextPaymentDate: { $min: "$nextPaymentDate" },
        },
      },
      {
        $lookup: {
          from: "merchants",
          localField: "_id",
          foreignField: "MID",
          as: "merchant",
        },
      },
      { $unwind: "$merchant" },
      {
        $project: {
          _id: 0,
          MID: "$_id",
          merchantName: "$merchant.storeName",

          totalBorrowed: 1,
          totalPaid: 1,
          remainingAmount: 1,

          loanCount: "$activeLoanCount", // ✅ MATCH ANDROID

          startedOn: 1,
          nextPaymentDate: 1,
        },
      },

      { $sort: { nextPaymentDate: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Borrower Grouped Loans Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ----------------- BORROWER LOANS BY MERCHANT -----------------
exports.getBorrowerLoansByMerchant = async (req, res) => {
  try {
    const borrower = req.borrower;
    const { mid } = req.params;

    if (!borrower?.BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const MID = Number(mid);

    // 1️⃣ Fetch loans (RAW)
    const loans = await Loan.find(
      {
        BID: borrower.BID,
        MID,
      },
      {
        LID: 1,
        BID: 1,
        MID: 1,
        loanAmount: 1,
        totalPaid: 1,
        status: 1,
        startDate: 1,
        createdAt: 1,
        closedAt: 1,
      }
    )
      .sort({ createdAt: -1 }) // 🔑 always safe
      .lean();

    if (!loans.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // 2️⃣ Fetch merchant ONCE
    const merchant = await Merchant.findOne(
      { MID },
      { storeName: 1 }
    ).lean();

    const merchantName = merchant?.storeName || "Merchant";

    // 3️⃣ Normalize dates + attach merchantName
    const normalizedLoans = loans.map((loan) => ({
      ...loan,

      // 🔑 IMPORTANT FIX
      startDate: loan.startDate
        ? new Date(loan.startDate).toISOString()
        : new Date(loan.createdAt).toISOString(),

      createdAt: loan.createdAt
        ? new Date(loan.createdAt).toISOString()
        : null,

      closedAt: loan.closedAt
        ? new Date(loan.closedAt).toISOString()
        : null,

      merchantName,
    }));

    return res.status(200).json({
      success: true,
      data: normalizedLoans,
    });
  } catch (error) {
    console.error("Borrower Loans By Merchant Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
