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

    if (decoded.role !== "borrower") {
      return res
        .status(403)
        .json({ success: false, message: "Invalid token for borrower" });
    }

    // attach to request
    req.borrower = {
      BID: decoded.BID,
      phoneNumber: decoded.phoneNumber,
    };

    next();
  } catch (error) {
    console.error("Borrower Auth Middleware Error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
