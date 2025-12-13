const DeviceToken = require("../models/deviceToken.model");

/**
 * Register / update a device token
 * - For merchant: use merchant JWT; same for borrower/staff
 * - Or send userType + MID/BID/SID from body (fallback)
 */
exports.registerDeviceToken = async (req, res) => {
  try {
    const { token, platform, appVersion, userType } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token is required" });
    }

    let resolvedUserType = userType;
    let MID = null;
    let BID = null;
    let SID = null;

    // Prefer auth info if available
    if (req.merchant && req.merchant.MID) {
      resolvedUserType = "merchant";
      MID = Number(req.merchant.MID);
    } else if (req.borrower && req.borrower.BID) {
      resolvedUserType = "borrower";
      BID = Number(req.borrower.BID);
    } else if (req.staff && req.staff.SID) {
      resolvedUserType = "staff";
      SID = Number(req.staff.SID);
      MID = Number(req.staff.MID || 0);
    } else {
      // fallback: take from body
      if (!userType) {
        return res.status(400).json({
          success: false,
          message: "userType is required if no auth token",
        });
      }
      if (userType === "merchant") MID = Number(req.body.MID);
      if (userType === "borrower") BID = Number(req.body.BID);
      if (userType === "staff") SID = Number(req.body.SID);
    }

    if (!resolvedUserType) {
      return res.status(400).json({
        success: false,
        message: "Could not resolve user type",
      });
    }

    // Upsert by token
    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      {
        token,
        userType: resolvedUserType,
        MID,
        BID,
        SID,
        platform: platform || "android",
        appVersion: appVersion || "",
        isActive: true,
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Device token registered",
      data: doc,
    });
  } catch (error) {
    console.error("Register Device Token Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unregister device token (on logout / uninstall)
 */
exports.unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "FCM token is required" });
    }

    await DeviceToken.findOneAndUpdate(
      { token },
      { isActive: false },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Device token unregistered",
    });
  } catch (error) {
    console.error("Unregister Device Token Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
