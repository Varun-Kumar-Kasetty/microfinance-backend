const express = require("express");
const router = express.Router();
const borrowerAuth = require("../middleware/borrowerAuth");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/payment.controller");
const { payLoanRouter } = require("../controllers/paymentRouter.controller");

// 🔁 Unified Pay (MOCK only for now)
router.post(
  "/loans/:lid/pay",
  borrowerAuth,
  payLoanRouter
);

router.post(
  "/razorpay/create-order",
  borrowerAuth,
  createRazorpayOrder
);

router.post(
  "/razorpay/verify",
  borrowerAuth,
  verifyRazorpayPayment
);


module.exports = router;
