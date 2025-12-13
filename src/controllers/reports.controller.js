// src/controllers/reports.controller.js

const Loan = require("../models/loans.model");
const Transaction = require("../models/transactions.model");
const Borrower = require("../models/borrower.model");

// Helper: parse date range from query (?from=YYYY-MM-DD&to=YYYY-MM-DD)
function getDateRange(fromStr, toStr, defaultDays = 30) {
  let from, to;

  if (fromStr) {
    from = new Date(fromStr);
    from.setHours(0, 0, 0, 0);
  }
  if (toStr) {
    to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
  }

  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    // default: last N days
    to = new Date();
    to.setHours(23, 59, 59, 999);
    from = new Date(to.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

// ----------------- MERCHANT SUMMARY REPORT -----------------
/**
 * GET /api/reports/merchant/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Needs merchant JWT
 */
exports.getMerchantSummaryReport = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { from: fromStr, to: toStr } = req.query;
    const { from, to } = getDateRange(fromStr, toStr, 30);
    const midNum = Number(MID);

    // 1) Loans created in range
    const loanAgg = await Loan.aggregate([
      {
        $match: {
          MID: midNum,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          loansCount: { $sum: 1 },
          totalDisbursed: { $sum: "$loanAmount" },
        },
      },
    ]);

    const loanStats = loanAgg[0] || {
      loansCount: 0,
      totalDisbursed: 0,
    };

    // 2) Transactions (collections) in range
    const txnAgg = await Transaction.aggregate([
      {
        $match: {
          MID: midNum,
          paidAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: "$amount" },
          paymentsCount: { $sum: 1 },
        },
      },
    ]);

    const txnStats = txnAgg[0] || {
      totalCollections: 0,
      paymentsCount: 0,
    };

    // 3) New borrowers added in range
    const newBorrowersCount = await Borrower.countDocuments({
      VID: midNum,
      createdAt: { $gte: from, $lte: to },
    });

    // 4) Overall outstanding as of now (all time)
    const overallLoanAgg = await Loan.aggregate([
      {
        $match: {
          MID: midNum,
        },
      },
      {
        $group: {
          _id: null,
          totalDisbursed: { $sum: "$loanAmount" },
          totalReceived: { $sum: "$totalPaid" },
        },
      },
    ]);

    const overall = overallLoanAgg[0] || {
      totalDisbursed: 0,
      totalReceived: 0,
    };

    const overallOutstanding =
      (overall.totalDisbursed || 0) - (overall.totalReceived || 0);

    // 5) Active vs closed loans (as of now)
    const activeCount = await Loan.countDocuments({
      MID: midNum,
      status: "active",
    });

    const closedCount = await Loan.countDocuments({
      MID: midNum,
      status: "closed",
    });

    return res.status(200).json({
      success: true,
      data: {
        range: {
          from,
          to,
        },
        summary: {
          loansCreated: loanStats.loansCount,
          totalDisbursedInRange: loanStats.totalDisbursed,
          totalCollectionsInRange: txnStats.totalCollections,
          paymentsCountInRange: txnStats.paymentsCount,
          newBorrowersInRange: newBorrowersCount,
        },
        overall: {
          totalDisbursed: overall.totalDisbursed,
          totalReceived: overall.totalReceived,
          outstanding: overallOutstanding,
          activeLoans: activeCount,
          closedLoans: closedCount,
        },
      },
    });
  } catch (error) {
    console.error("Merchant Summary Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- MERCHANT DAILY COLLECTIONS REPORT -----------------
/**
 * GET /api/reports/merchant/daily-collections?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns per-day sums for chart
 */
exports.getMerchantDailyCollections = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { from: fromStr, to: toStr } = req.query;
    const { from, to } = getDateRange(fromStr, toStr, 30);
    const midNum = Number(MID);

    const dailyAgg = await Transaction.aggregate([
      {
        $match: {
          MID: midNum,
          paidAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format as array of { date, total, count }
    const daily = dailyAgg.map((d) => ({
      date: d._id,
      total: d.total,
      count: d.count,
    }));

    return res.status(200).json({
      success: true,
      data: {
        range: { from, to },
        daily,
      },
    });
  } catch (error) {
    console.error("Merchant Daily Collections Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- MERCHANT BORROWER PERFORMANCE REPORT -----------------
/**
 * GET /api/reports/merchant/borrowers?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Top borrowers by collections in range
 */
exports.getMerchantBorrowerReport = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { from: fromStr, to: toStr, limit } = req.query;
    const { from, to } = getDateRange(fromStr, toStr, 30);
    const midNum = Number(MID);
    const topLimit = Number(limit) || 20;

    // Group transactions by borrower
    const agg = await Transaction.aggregate([
      {
        $match: {
          MID: midNum,
          paidAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$BID",
          totalPaid: { $sum: "$amount" },
          paymentsCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalPaid: -1 },
      },
      {
        $limit: topLimit,
      },
    ]);

    const borrowerIds = agg.map((a) => a._id);

    const borrowers = await Borrower.find({ BID: { $in: borrowerIds } })
      .select("BID fullName phoneNumber trustScore")
      .lean();

    const borrowerMap = {};
    borrowers.forEach((b) => {
      borrowerMap[b.BID] = b;
    });

    // Merge info
    const list = agg.map((row) => ({
      BID: row._id,
      totalPaid: row.totalPaid,
      paymentsCount: row.paymentsCount,
      borrower: borrowerMap[row._id] || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        range: { from, to },
        topBorrowers: list,
      },
    });
  } catch (error) {
    console.error("Merchant Borrower Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
