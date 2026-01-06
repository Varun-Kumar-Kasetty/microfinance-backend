const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");
const Transaction = require("../models/transactions.model");
const Notification = require("../models/notifications.model");
const Merchant = require("../models/merchants.model");

// ---------------- DATE FORMAT HELPER ----------------
function formatDateOnly(date) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD
}

// ================= BORROWER DASHBOARD =================
exports.getBorrowerDashboard = async (req, res) => {
  try {
    // ==================================================
    // 1️⃣ RESOLVE BORROWER ID
    // ==================================================
    const BID = req.borrower?.BID || Number(req.params?.bid);

    if (!BID || isNaN(BID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrower ID",
      });
    }

    const borrower = await Borrower.findOne({ BID }).lean();
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ==================================================
    // 2️⃣ LOAN SUMMARY
    // ==================================================
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
          totalPaid: { $sum: { $ifNull: ["$totalPaid", 0] } },
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

    const outstandingAmount = stats.totalBorrowed - stats.totalPaid;

    // ==================================================
    // 3️⃣ FETCH LOANS (NO populate – numeric MID)
    // ==================================================
    const rawActiveLoans = await Loan.find({
      BID,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    const rawCompletedLoans = await Loan.find({
      BID,
      status: "closed",
    })
      .sort({ closedAt: -1 })
      .lean();

    // ==================================================
    // 4️⃣ FETCH MERCHANT NAMES MANUALLY
    // ==================================================
    const merchantIds = [
      ...new Set(
        [...rawActiveLoans, ...rawCompletedLoans]
          .map((l) => l.MID)
          .filter(Boolean)
      ),
    ];

    const merchants = await Merchant.find(
      { MID: { $in: merchantIds } },
      { MID: 1, storeName: 1, fullName: 1 }
    ).lean();

    const merchantMap = {};
    merchants.forEach((m) => {
      merchantMap[m.MID] = m.storeName || m.fullName || null;
    });

    // ==================================================
    // 5️⃣ MAP ACTIVE LOANS
    // ==================================================
    const activeLoans = rawActiveLoans.map((loan) => {
      const remainingAmount =
        loan.remainingAmount ??
        ((loan.loanAmount || 0) - (loan.totalPaid || 0));

      let nextPayment = null;
      if (remainingAmount > 0) {
        nextPayment = {
          amount: remainingAmount,
          dueDate: formatDateOnly(loan.dueDate),
        };
      }

      return {
        ...loan,

        // 🔥 FORCE correct merchant name
        merchantName: merchantMap[loan.MID] ?? null,

        // 🔥 ENSURE borrower placeholder is gone
        borrowerName: undefined,

        startDate: loan.startDate || loan.createdAt,
        remainingAmount,
        nextPayment,
      };
    });


    // ==================================================
    // 6️⃣ MAP COMPLETED LOANS
    // ==================================================
    const completedLoans = rawCompletedLoans.map((loan) => ({
      ...loan,
      merchantName: merchantMap[loan.MID] || null,
      startDate: loan.startDate || loan.createdAt, // ✅ FIXED
      remainingAmount: 0,
      nextPayment: null,
    }));

    // ==================================================
    // 7️⃣ RECENT TRANSACTIONS
    // ==================================================
    const recentTransactions = await Transaction.find({ BID })
      .sort({ paidAt: -1 })
      .limit(10)
      .lean();

    // ==================================================
    // 8️⃣ NOTIFICATIONS
    // ==================================================
    const recentNotifications = await Notification.find({
      targetType: "borrower",
      BID,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // ==================================================
    // 9️⃣ TRUST SCORE
    // ==================================================
    const trustValue = borrower.trustScore ?? 0;

    const trustScore = {
      score: trustValue,
      max: 100,
      level:
        trustValue >= 85
          ? "Excellent"
          : trustValue >= 70
          ? "Good"
          : trustValue >= 50
          ? "Average"
          : "Low",
    };

    // ==================================================
    // 🔟 RESPONSE
    // ==================================================
    return res.status(200).json({
      success: true,
      data: {
        borrower: {
          BID: borrower.BID,
          borrowerUID: borrower.borrowerUID,
          fullName: borrower.fullName,
          phoneNumber: borrower.phoneNumber,
          profilePhoto: borrower.profilePhoto,
        },
        summary: {
          totalLoans: stats.totalLoans,
          activeLoans: stats.activeLoans,
          closedLoans: stats.closedLoans,
          totalBorrowed: stats.totalBorrowed,
          totalPaid: stats.totalPaid,
          outstandingAmount,
        },
        trustScore,
        activeLoans,
        completedLoans,
        recentTransactions,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error("Borrower Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch borrower dashboard",
    });
  }
};
