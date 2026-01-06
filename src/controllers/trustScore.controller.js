const Borrower = require("../models/borrower.model");
const TrustScoreEvent = require("../models/trustScoreEvent.model");

exports.getBorrowerTrustScoreTimeline = async (req, res) => {
  try {
    const BID =
      req.borrower?.BID ||
      Number(req.params?.bid);

    if (!BID || isNaN(BID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrower ID",
      });
    }

    const borrower = await Borrower.findOne(
      { BID },
      { trustScore: 1, fullName: 1 }
    ).lean();

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    const events = await TrustScoreEvent.find(
      { BID },
      {
        _id: 0,
        eventType: 1,
        points: 1,
        description: 1,
        loanId: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    const totalDelta = events.reduce(
      (sum, e) => sum + e.points,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        borrower: {
          BID,
          fullName: borrower.fullName,
        },
        trustScore: {
          base: 100,
          current: borrower.trustScore ?? 0,
          delta: totalDelta,
        },
        timeline: events,
      },
    });
  } catch (error) {
    console.error("Trust Score Timeline Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trust score timeline",
    });
  }
};
