const router = require("express").Router();
const borrowerAuth = require("../middleware/borrowerAuth");
const {
  sendEmailOtp,
  verifyEmailOtp,
} = require("../controllers/borrowerEmailOtp.controller");

router.post("/email/send-otp", borrowerAuth, sendEmailOtp);
router.post("/email/verify-otp", borrowerAuth, verifyEmailOtp);

module.exports = router;
