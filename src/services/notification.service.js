const Notification = require("../models/notifications.model");
const DeviceToken = require("../models/deviceToken.model");
const { getFirebaseAdmin } = require("../config/firebase");

/**
 * Send FCM push notification to a list of tokens
 */
async function sendPushToTokens(tokens, { title, message, data }) {
  if (!tokens || tokens.length === 0) return;

  try {
    const admin = getFirebaseAdmin();
    if (!admin || !admin.messaging) return;

    const payload = {
      notification: {
        title: title || "LendSafe Alert",
        body: message || "",
      },
      data: {
        ...(data || {}),
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload,
    });

    console.log(
      "FCM push sent:",
      response.successCount,
      "success,",
      response.failureCount,
      "failure"
    );

    // 🔥 AUTO-DEACTIVATE BAD TOKENS
    const failedTokens = [];

    response.responses.forEach((res, idx) => {
      if (!res.success) {
        failedTokens.push(tokens[idx]);
        console.error("FCM token failed:", res.error?.message);
      }
    });

    if (failedTokens.length > 0) {
      await DeviceToken.updateMany(
        { token: { $in: failedTokens } },
        { $set: { isActive: false } }
      );
      console.log("Deactivated", failedTokens.length, "invalid FCM tokens");
    }

  } catch (error) {
    console.error("FCM push error:", error);
  }
}


/**
 * Main notification creator used everywhere in app
 * - Saves in MongoDB
 * - Triggers FCM push to relevant device tokens
 */
async function createNotification({
  targetType, // "merchant" | "borrower" | "staff"
  MID,
  BID,
  LID,
  TID,
  type,
  title,
  message,
}) {
  try {
    const notif = await Notification.create({
      targetType,
      MID,
      BID,
      LID,
      TID,
      type: type || "info",
      title,
      message,
    });

    // Find device tokens for this user
    let tokens = [];

    if (targetType === "merchant" && MID) {
      const docs = await DeviceToken.find({
        userType: "merchant",
        MID: Number(MID),
        isActive: true,
      }).lean();
      tokens = docs.map((d) => d.token);
    } else if (targetType === "borrower" && BID) {
      const docs = await DeviceToken.find({
        userType: "borrower",
        BID: Number(BID),
        isActive: true,
      }).lean();
      tokens = docs.map((d) => d.token);
    } 

    // Send push notification if we have tokens
    if (tokens.length > 0) {
      await sendPushToTokens(tokens, {
        title,
        message,
        data: {
          type: type || "info",
          targetType: targetType || "",
          MID: MID ? String(MID) : "",
          BID: BID ? String(BID) : "",
          LID: LID ? String(LID) : "",
          TID: TID ? String(TID) : "",
          NID: notif.NID ? String(notif.NID) : "",
        },
      });
    } else {
      console.log(
        `No device tokens found for ${targetType} MID=${MID} BID=${BID}`
      );
    }

    return notif;
  } catch (error) {
    console.error("Notification create error:", error.message);
    // don't crash main flow because of notification failure
    return null;
  }
}

module.exports = { createNotification };
