const jwt = require("jsonwebtoken");
const Merchant = require("../models/merchants.model");

const merchantAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const merchant = await Merchant.findOne({ MID: decoded.MID });

    if (!merchant) {
      return res.status(401).json({
        success: false,
        message: "Invalid merchant token",
      });
    }

    // attach merchant to request
    req.merchant = merchant;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized merchant",
    });
  }
};

module.exports = merchantAuth;
