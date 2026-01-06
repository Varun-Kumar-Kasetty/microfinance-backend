const express = require("express");
const router = express.Router();

const {
  getMerchantDashboard,
} = require("../controllers/merchant.dashboard.controller");

const {
  getBorrowerDashboard,
} = require("../controllers/borrower.dashboard.controller");

const auth = require("../middleware/auth");
const borrowerAuth = require("../middleware/borrowerAuth");

// ================= DASHBOARD ROUTES =================

// MERCHANT DASHBOARD
router.get("/merchant", auth, getMerchantDashboard);


// BORROWER DASHBOARD (ADMIN / INTERNAL)
router.get("/borrower", borrowerAuth,getBorrowerDashboard);



module.exports = router;
