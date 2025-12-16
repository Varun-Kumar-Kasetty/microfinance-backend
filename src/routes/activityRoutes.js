const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const authMiddleware = require("../middleware/auth");

// Recent Activities
router.get(
  "/merchant/recent-activities",
  authMiddleware,
  activityController.getRecentActivities
);

module.exports = router;
