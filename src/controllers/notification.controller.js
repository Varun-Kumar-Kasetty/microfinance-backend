const Notification = require("../models/notifications.model");

// MERCHANT – list their notifications
exports.getMerchantNotifications = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    const { unread } = req.query;
    const filter = { targetType: "merchant", MID: Number(MID) };

    if (unread === "true") {
      filter.isRead = false;
    }

    const notifs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: notifs });
  } catch (error) {
    console.error("Get Merchant Notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BORROWER – list their notifications (from token)
exports.getBorrowerNotifications = async (req, res) => {
  try {
    const BID = req.borrower?.BID;
    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: borrower token missing",
      });
    }

    const { unread } = req.query;
    const filter = { targetType: "borrower", BID: Number(BID) };

    if (unread === "true") {
      filter.isRead = false;
    }

    const notifs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: notifs,
    });
  } catch (error) {
    console.error("Get Borrower Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.markNotificationRead = async (req, res) => {
  try {
    const { nid } = req.params;

    let filter = { NID: Number(nid) };

    // 🔐 Merchant ownership
    if (req.merchant?.MID) {
      filter.targetType = "merchant";
      filter.MID = Number(req.merchant.MID);
    }

    // 🔐 Borrower ownership
    if (req.borrower?.BID) {
      filter.targetType = "borrower";
      filter.BID = Number(req.borrower.BID);
    }

    const notif = await Notification.findOneAndUpdate(
      filter,
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notif,
    });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// MARK ALL AS READ FOR CURRENT MERCHANT
exports.markAllMerchantNotificationsRead = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant token missing" });
    }

    await Notification.updateMany(
      { targetType: "merchant", MID: Number(MID), isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All merchant notifications marked as read",
    });
  } catch (error) {
    console.error("Mark All Merchant Notifications Read Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// MARK ALL AS READ FOR CURRENT BORROWER
exports.markAllBorrowerNotificationsRead = async (req, res) => {
  try {
    const BID = req.borrower?.BID;
    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: borrower token missing",
      });
    }

    await Notification.updateMany(
      { targetType: "borrower", BID: Number(BID), isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All borrower notifications marked as read",
    });
  } catch (error) {
    console.error("Mark All Borrower Notifications Read Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
