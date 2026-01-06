const express = require("express");
const router = express.Router();

const borrowerAuth = require("../middleware/borrowerAuth");

const {
  sendBorrowerOtp,
  verifyBorrowerOtp,
} = require("../controllers/borrowerAuth.controller");

const {
  registerBorrower,
  getBorrowerAccount,
  updateBorrowerAccount,
} = require("../controllers/borrowerRegister.controller");

// Borrower self lifecycle
router.post("/register", registerBorrower);

// Auth
router.post("/send-otp", sendBorrowerOtp);
router.post("/verify-otp", verifyBorrowerOtp);

// Account (self)
router.get("/account", borrowerAuth, getBorrowerAccount);
router.put("/account", borrowerAuth, updateBorrowerAccount);

module.exports = router;
