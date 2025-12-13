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

// BORROWER – list their notifications (by BID)
exports.getBorrowerNotifications = async (req, res) => {
  try {
    const { bid } = req.params;

    const { unread } = req.query;
    const filter = { targetType: "borrower", BID: Number(bid) };

    if (unread === "true") {
      filter.isRead = false;
    }

    const notifs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: notifs });
  } catch (error) {
    console.error("Get Borrower Notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// MARK SINGLE NOTIFICATION AS READ
exports.markNotificationRead = async (req, res) => {
  try {
    const { nid } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { NID: Number(nid) },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
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
