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

// View all activities (merchant)
router.get(
  "/merchant/all",
  auth,
  activityController.getAllActivities
);


module.exports = router;
