// src/controllers/dashboard.controller.js

const Merchant = require("../models/merchants.model");
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");
const Transaction = require("../models/transactions.model");
const Notification = require("../models/notifications.model");

// helper to get start & end of today
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ----------------- MERCHANT DASHBOARD -----------------
exports.getMerchantDashboard = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }
    const midNum = Number(MID);

    const { start: startToday, end: endToday } = getTodayRange();

    // 1) Loan stats for this merchant
    const loanAgg = await Loan.aggregate([
      { $match: { MID: midNum } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          closedLoans: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
          totalDisbursed: { $sum: "$loanAmount" },
          totalReceived: { $sum: "$totalPaid" },
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
      (loanStats.totalDisbursed || 0) - (loanStats.totalReceived || 0);

    // 2) Borrower count for this merchant
    const totalBorrowers = await Borrower.countDocuments({ VID: midNum });

    // 3) Today collection (from transactions)
    const todayAgg = await Transaction.aggregate([
      {
        $match: {
          MID: midNum,
          paidAt: { $gte: startToday, $lte: endToday },
        },
      },
      {
        $group: {
          _id: null,
          todayCollection: { $sum: "$amount" },
        },
      },
    ]);

    const todayCollection =
      (todayAgg[0] && todayAgg[0].todayCollection) || 0;

    // 4) Recent transactions
    const recentTransactions = await Transaction.find({ MID: midNum })
      .sort({ paidAt: -1 })
      .limit(5)
      .lean();

    // 5) Overdue loans
    const now = new Date();
    const activeLoans = await Loan.find({
      MID: midNum,
      status: "active",
    })
      .select("LID BID loanAmount totalPaid loanDurationDays createdAt")
      .lean();

    const overdueLoans = activeLoans
      .map((loan) => {
        const dueDate = new Date(
          loan.createdAt.getTime() +
            loan.loanDurationDays * 24 * 60 * 60 * 1000
        );
        return { ...loan, dueDate };
      })
      .filter((loan) => loan.dueDate < now)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5);

    // 6) Recent notifications for merchant
    const recentNotifications = await Notification.find({
      targetType: "merchant",
      MID: midNum,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 7) Merchant basic info
    const merchant = await Merchant.findOne({ MID: midNum })
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
          totalReceived: loanStats.totalReceived,
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- BORROWER DASHBOARD -----------------
exports.getBorrowerDashboard = async (req, res) => {
  try {
    const { bid } = req.params;
    const bidNum = Number(bid);

    const borrower = await Borrower.findOne({ BID: bidNum }).lean();
    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    // 1) Loan stats for this borrower
    const loanAgg = await Loan.aggregate([
      { $match: { BID: bidNum } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          closedLoans: {
            $sum: {
              $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
            },
          },
          totalBorrowed: { $sum: "$loanAmount" },
          totalPaid: { $sum: "$totalPaid" },
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
      (stats.totalBorrowed || 0) - (stats.totalPaid || 0);

    // 2) Active loans list
    const activeLoans = await Loan.find({
      BID: bidNum,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    // 3) Recent transactions for borrower
    const recentTransactions = await Transaction.find({ BID: bidNum })
      .sort({ paidAt: -1 })
      .limit(10)
      .lean();

    // 4) Recent notifications for borrower
    const recentNotifications = await Notification.find({
      targetType: "borrower",
      BID: bidNum,
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
          totalPaid: stats.totalPaid,
          outstandingAmount,
        },
        activeLoans,
        recentTransactions,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error("Borrower Dashboard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
