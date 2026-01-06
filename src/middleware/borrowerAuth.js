const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed",
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "borrower") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: borrower access only",
      });
    }

    if (!decoded.BID) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: borrower ID missing",
      });
    }

    // ✅ Standard borrower object (parallel to merchant)
    req.borrower = {
      BID: decoded.BID,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Borrower Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
