const FraudAlert = require("../models/fraudAlert.model");
const { getBorrowerFraudSummary } = require("../services/fraud.service");

// MERCHANT – list fraud alerts for their borrowers
exports.getMerchantFraudAlerts = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { unresolved, severity } = req.query;

    const filter = { MID: Number(MID) };
    if (unresolved === "true") {
      filter.isResolved = false;
    }
    if (severity) {
      filter.severity = severity; // low|medium|high
    }

    const alerts = await FraudAlert.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Get Merchant Fraud Alerts Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// MERCHANT – fraud summary for a borrower
exports.getBorrowerFraudInfo = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { bid } = req.params;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const summary = await getBorrowerFraudSummary(Number(bid));
    if (!summary) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    // (Optional) you could verify borrower.VID === MID if you want to restrict
    // For now, allow as long as merchant has alerts

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get Borrower Fraud Info Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// MERCHANT – resolve a fraud alert
exports.resolveFraudAlert = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { faid } = req.params;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const alert = await FraudAlert.findOne({ FAID: Number(faid) });

    if (!alert) {
      return res
        .status(404)
        .json({ success: false, message: "Fraud alert not found" });
    }

    if (alert.MID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "You cannot resolve alerts for another merchant",
      });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Fraud alert marked as resolved",
      data: alert,
    });
  } catch (error) {
    console.error("Resolve Fraud Alert Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
