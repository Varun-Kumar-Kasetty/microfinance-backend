const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async ({ amount, receipt }) => {
  return razorpay.orders.create({
    amount: Math.round(amount * 100), // ₹ → paise
    currency: "INR",
    receipt,
  });
};

exports.verifySignature = (orderId, paymentId, signature) => {
  const crypto = require("crypto");
  const body = `${orderId}|${paymentId}`;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET.trim())
    .update(body)
    .digest("hex");



    console.log("EXPECTED SIGNATURE =>", expected);
    console.log("RECEIVED SIGNATURE =>", signature);
  return expected === signature;
};
