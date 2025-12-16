const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const auth = require("../middleware/auth");

// Recent Activities
router.get(
  "/merchant/recent",
  auth,
  activityController.getRecentActivities
);

module.exports = router;
