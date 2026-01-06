const express = require("express");
const router = express.Router();

const {
  registerDeviceToken,
  unregisterDeviceToken,
} = require("../controllers/push.controller");

// We can allow all three auth types
const merchantAuth = require("../middleware/auth");
const borrowerAuth = require("../middleware/borrowerAuth");
const staffAuth = require("../middleware/staffAuth");

// Base: /api/push

// Register device token
// Try merchant → borrower → staff auth; if none, still works with body userType+MID/BID/SID
// routes/push.routes.js
router.post("/register", registerDeviceToken);



// Unregister token
router.post("/unregister", unregisterDeviceToken);

module.exports = router;
