const { mockPayment } = require("./mockPayment.controller");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("./payment.controller");

exports.payLoanRouter = async (req, res) => {
  const gateway = process.env.PAYMENT_GATEWAY || "mock";

  if (gateway === "mock") {
    return mockPayment(req, res);
  }

  return res.status(400).json({
    success: false,
    message: "Use Razorpay order + verify flow",
  });
};
