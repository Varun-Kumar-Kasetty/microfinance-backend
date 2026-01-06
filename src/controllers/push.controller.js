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
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    let resolvedUserType = userType;
    let MID = null;
    let BID = null;
    let SID = null;

    // 🔐 Prefer auth if available
    if (req.merchant?.MID) {
      resolvedUserType = "merchant";
      MID = Number(req.merchant.MID);
    } else if (req.borrower?.BID) {
      resolvedUserType = "borrower";
      BID = Number(req.borrower.BID);
    } else if (req.staff?.SID) {
      resolvedUserType = "staff";
      SID = Number(req.staff.SID);
    }

    // 🟡 FALLBACK TO BODY (THIS WAS MISSING)
    if (!resolvedUserType) {
      resolvedUserType = userType || "unknown";
    }

    if (resolvedUserType === "merchant" && req.body.MID) {
      MID = Number(req.body.MID);
    }

    if (resolvedUserType === "borrower" && req.body.BID) {
      BID = Number(req.body.BID);
    }

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
      { upsert: true, new: true }
    );

    console.log("✅ DEVICE TOKEN SAVED:", doc);

    return res.status(200).json({
      success: true,
      message: "Device token registered",
      data: doc,
    });
  } catch (error) {
    console.error("❌ PUSH REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
