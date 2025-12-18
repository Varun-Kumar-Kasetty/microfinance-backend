// src/controllers/dashboard.controller.js

const Merchant = require("../models/merchants.model");
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");
const Transaction = require("../models/transactions.model");
const Notification = require("../models/notifications.model");

// ---------------- HELPER ----------------
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ================= MERCHANT DASHBOARD =================
exports.getMerchantDashboard = async (req, res) => {
  try {
    const MID = Number(req.merchant?.MID);
    if (!MID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: merchant token missing",
      });
    }

    const { start: startToday, end: endToday } = getTodayRange();

    // ---------- 1️⃣ LOAN AGGREGATION (SOURCE OF TRUTH) ----------
    const loanAgg = await Loan.aggregate([
      { $match: { MID } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          closedLoans: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
          totalDisbursed: { $sum: "$loanAmount" },
          totalReceived: { $sum: "$totalPaid" }, // ✅ FIXED
        },
      },
    ]);

    const loanStats = loanAgg[0] || {
      totalLoans: 0,
      activeLoans: 0,
      closedLoans: 0,
      totalDisbursed: 0,
      totalReceived: 0,
    };

    const outstandingAmount =
      loanStats.totalDisbursed - loanStats.totalReceived;

    // ---------- 2️⃣ BORROWER COUNT ----------
    const totalBorrowers = await Borrower.countDocuments({ VID: MID });

        // ---------- 3️⃣ TODAY COLLECTION (TRANSACTIONS ONLY) ----------
        const todayAgg = await Transaction.aggregate([
      {
        $match: {
          MID,
          createdAt: { $gte: startToday, $lte: endToday },
        },
      },
      {
        $group: {
          _id: null,
          todayCollection: { $sum: "$amount" },
        },
      },
    ]);

    const todayCollection = todayAgg[0]?.todayCollection || 0;



    // ---------- 4️⃣ RECENT TRANSACTIONS ----------
    const recentTransactions = await Transaction.find({ MID })
      .sort({ paidAt: -1 })
      .limit(5)
      .lean();

    // ---------- 5️⃣ OVERDUE LOANS ----------
    const now = new Date();

    const overdueLoans = await Loan.find({
      MID,
      status: "active",
      dueDate: { $lt: now },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // ---------- 6️⃣ RECENT NOTIFICATIONS ----------
    const recentNotifications = await Notification.find({
      targetType: "merchant",
      MID,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // ---------- 7️⃣ MERCHANT INFO ----------
    const merchant = await Merchant.findOne({ MID })
      .select("MID fullName storeName phoneNumber gstVerified")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        merchant,
        summary: {
          totalBorrowers,
          totalLoans: loanStats.totalLoans,
          activeLoans: loanStats.activeLoans,
          closedLoans: loanStats.closedLoans,
          totalDisbursed: loanStats.totalDisbursed,
          totalReceived: loanStats.totalReceived, // ✅ CORRECT
          outstandingAmount,
          todayCollection,
        },
        overdueLoans,
        recentTransactions,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error("Merchant Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= BORROWER DASHBOARD =================
exports.getBorrowerDashboard = async (req, res) => {
  try {
    const BID = Number(req.params.bid);

    const borrower = await Borrower.findOne({ BID }).lean();
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ---------- 1️⃣ BORROWER LOAN AGG ----------
    const loanAgg = await Loan.aggregate([
      { $match: { BID } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          closedLoans: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
          totalBorrowed: { $sum: "$loanAmount" },
          totalPaid: { $sum: "$totalPaid" }, // ✅ FIXED
        },
      },
    ]);

    const stats = loanAgg[0] || {
      totalLoans: 0,
      activeLoans: 0,
      closedLoans: 0,
      totalBorrowed: 0,
      totalPaid: 0,
    };

    const outstandingAmount =
      stats.totalBorrowed - stats.totalPaid;

    // ---------- 2️⃣ ACTIVE LOANS ----------
    const activeLoans = await Loan.find({
      BID,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    // ---------- 3️⃣ RECENT TRANSACTIONS ----------
    const recentTransactions = await Transaction.find({ BID })
      .sort({ paidAt: -1 })
      .limit(10)
      .lean();

    // ---------- 4️⃣ RECENT NOTIFICATIONS ----------
    const recentNotifications = await Notification.find({
      targetType: "borrower",
      BID,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        borrower,
        summary: {
          totalLoans: stats.totalLoans,
          activeLoans: stats.activeLoans,
          closedLoans: stats.closedLoans,
          totalBorrowed: stats.totalBorrowed,
          totalPaid: stats.totalPaid, // ✅ CORRECT
          outstandingAmount,
        },
        activeLoans,
        recentTransactions,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error("Borrower Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
