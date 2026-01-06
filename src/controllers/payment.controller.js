const Loan = require("../models/loans.model");
const { payLoanAmount } = require("./loan.controller");

console.log(
  "SECRET LENGTH =>",
  process.env.RAZORPAY_KEY_SECRET?.length
);


exports.mockPayment = async (req, res) => {
  try {
    const borrower = req.borrower;
    const { lid } = req.params;
    const { amount, method } = req.body;

    if (!borrower?.BID) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const loan = await Loan.findOne({ LID: Number(lid) });
    if (!loan || loan.status !== "active") {
      return res.status(400).json({ success: false, message: "Invalid loan" });
    }

    // 🔐 Ownership check
    if (loan.BID !== borrower.BID) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const remaining = loan.loanAmount - loan.totalPaid;
    if (amount <= 0 || amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Max payable amount is ₹${remaining}`,
      });
    }

    // 🔁 Simulate payment success
    req.params.lid = lid;
    req.body = {
      amount,
      method: method || "mock",
      note: "Mock payment success",
    };

    return payLoanAmount(req, res);

  } catch (e) {
    console.error("Mock Payment Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};


const { createOrder, verifySignature } = require("../services/razorpay.service");

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    console.log("CREATE ORDER BODY =>", req.body);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const order = await createOrder({
      amount,
      receipt: `rcpt_${Date.now()}`,
    });

    console.log(
      "RAZORPAY ORDER =>",
      JSON.stringify(order, null, 2)
    );

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });

  } catch (err) {
    console.error("RAZORPAY CREATE ORDER ERROR =>", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: err.message,
    });
  }
};


exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const borrower = req.borrower;
    const { orderId, paymentId, signature, amount, lid, method } = req.body;

    if (!borrower?.BID) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("VERIFY BODY =>", req.body);
console.log("SECRET =>", process.env.RAZORPAY_KEY_SECRET?.slice(0, 6));

console.log("VERIFY RAW =>", {
  orderId,
  paymentId,
  signature,
});

    const isValid = verifySignature(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid payment" });
    }

    console.log("SIGN BODY =>", `${orderId}|${paymentId}`);

    // 🔑 Inject required fields for loan repayment
    req.params.lid = lid;
    req.body = {
      amount,                 // RUPEES
      method: method || "upi",
      note: `Razorpay payment ${paymentId}`,
    };

    // ✅ THIS IS WHAT WAS MISSING
    return payLoanAmount(req, res);

  } catch (err) {
    console.error("Verify Razorpay Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


