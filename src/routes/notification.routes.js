const express = require("express");
const router = express.Router();

const {
  getMerchantNotifications,
  getBorrowerNotifications,
  markNotificationRead,
  markAllMerchantNotificationsRead,
  markAllBorrowerNotificationsRead,
} = require("../controllers/notification.controller");

const auth = require("../middleware/auth"); // merchant JWT
const borrowerAuth = require("../middleware/borrowerAuth"); // borrower JWT

// Base: /api/notifications

// MERCHANT – list notifications (optional ?unread=true)
router.get("/merchant", auth, getMerchantNotifications);

// MERCHANT – mark all as read
router.post("/merchant/mark-all-read", auth, markAllMerchantNotificationsRead);

// BORROWER – list notifications for logged-in borrower (🔥 MUST COME FIRST)
router.get("/borrower/me", borrowerAuth, (req, res) => {
  req.borrower = req.borrower; // already set by middleware
  return getBorrowerNotifications(req, res);
});

// BORROWER – list notifications by BID (admin/internal)
router.get("/borrower/:bid", getBorrowerNotifications);


// BORROWER – mark all as read
router.post(
  "/borrower/mark-all-read",
  borrowerAuth,
  markAllBorrowerNotificationsRead
);

// MARK SINGLE NOTIFICATION AS READ (shared, keep open or secure later)
router.patch("/:nid/read", markNotificationRead);


module.exports = router;
