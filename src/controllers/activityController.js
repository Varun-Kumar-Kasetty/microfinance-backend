const Activity = require("../models/Activity");

// GET /api/merchant/recent-activities
exports.getRecentActivities = async (req, res) => {
  try {
    const merchantId = req.user.MID; // from JWT middleware

    const activities = await Activity.find({ merchantId })
      .sort({ createdAt: -1 })
      .limit(10);

    const formatted = activities.map(item => ({
      borrowerName: item.borrowerName,
      action:
        item.type === "REPAYMENT"
          ? "Repayment"
          : item.type === "LOAN_CREATED"
          ? "Loan Created"
          : "Loan Closed",
      amount: item.amount,
      timeAgo: timeAgo(item.createdAt)
    }));

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load recent activities"
    });
  }
};

// Helper: time ago
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;

  return `${Math.floor(seconds / 86400)} days ago`;
}
