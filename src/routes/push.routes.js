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
router.post(
  "/register",
  (req, res, next) => {
    // simple middleware chain to attach whichever auth passes
    const middlewares = [merchantAuth, borrowerAuth, staffAuth];
    let index = 0;

    function runNext(err) {
      if (err) {
        // ignore error, try next auth
      }
      const mw = middlewares[index++];
      if (!mw) return next(); // all done
      mw(req, res, runNext);
    }

    runNext();
  },
  registerDeviceToken
);

// Unregister token
router.post("/unregister", unregisterDeviceToken);

module.exports = router;
