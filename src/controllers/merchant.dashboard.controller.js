// src/controllers/merchant.dashboard.controller.js

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

    // ---------- 1️⃣ LOAN AGGREGATION ----------
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
      loanStats.totalDisbursed - loanStats.totalReceived;

    // ---------- 2️⃣ BORROWER COUNT (DISTINCT) ----------
    const borrowerCountAgg = await Loan.aggregate([
      { $match: { MID } },
      { $group: { _id: "$BID" } },
      { $count: "count" },
    ]);

    const totalBorrowers = borrowerCountAgg[0]?.count || 0;

    // ---------- 3️⃣ TODAY COLLECTION (✅ FIXED) ----------
    const todayAgg = await Transaction.aggregate([
      {
        $match: {
          MID,
          type: "YOU_GOT", // 🔥 ONLY MONEY RECEIVED
          paidAt: { $gte: startToday, $lte: endToday }, // 🔥 CORRECT FIELD
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
    const overdueLoans = await Loan.find({
      MID,
      status: "active",
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // ---------- 6️⃣ NOTIFICATIONS ----------
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
          totalReceived: loanStats.totalReceived,
          outstandingAmount,
          todayCollection, // ✅ NOW CORRECT
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
