const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "MY_SECRET_KEY"
    );

    // OPTIONAL: role validation (safe even if role not present)
    if (decoded.role && decoded.role !== "merchant") {
      return res.status(403).json({
        success: false,
        message: "Invalid token for merchant",
      });
    }

    // ✅ STANDARDIZED USER OBJECT
    req.user = {
      MID: decoded.MID,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role || "merchant",
    };

    // ✅ OPTIONAL: merchant alias (backward compatibility)
    req.merchant = req.user;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
