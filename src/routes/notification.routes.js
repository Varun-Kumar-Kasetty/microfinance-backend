const express = require("express");
const router = express.Router();

const {
  getMerchantNotifications,
  getBorrowerNotifications,
  markNotificationRead,
  markAllMerchantNotificationsRead,
} = require("../controllers/notification.controller");

const auth = require("../middleware/auth"); // merchant JWT
const borrowerAuth = require("../middleware/borrowerAuth"); // borrower JWT

// Base: /api/notifications

// MERCHANT – list notifications (optional ?unread=true)
router.get("/merchant", auth, getMerchantNotifications);

// MERCHANT – mark all as read
router.post("/merchant/mark-all-read", auth, markAllMerchantNotificationsRead);

// BORROWER – list notifications by BID (for admin or internal use)
router.get("/borrower/:bid", getBorrowerNotifications);

// BORROWER – list notifications for logged-in borrower
router.get("/borrower/me", borrowerAuth, (req, res) => {
  req.params.bid = req.borrower.BID;
  return getBorrowerNotifications(req, res);
});

// MARK SINGLE NOTIFICATION AS READ (shared, keep open or secure later)
router.post("/:nid/read", markNotificationRead);

module.exports = router;
