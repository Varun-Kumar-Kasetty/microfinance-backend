const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.split(" ")[1]
      : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "MY_SECRET_KEY"
    );

    // MUST be merchant
    if (decoded.role && decoded.role !== "merchant") {
      return res.status(403).json({
        success: false,
        message: "Invalid token for merchant",
      });
    }

    req.merchant = {
      MID: decoded.MID,
      phoneNumber: decoded.phoneNumber,
    };

    next();
  } catch (error) {
    console.error("Merchant Auth Middleware Error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
