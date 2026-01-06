const Borrower = require("../models/borrower.model");

exports.uploadProfilePhoto = async (req, res) => {
  try {
    const BID = req.borrower?.BID;

    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // ✅ PUBLIC RELATIVE PATH
    const photoPath = `/uploads/borrowers/${req.file.filename}`;

    await Borrower.updateOne(
      { BID },
      { $set: { profilePhoto: photoPath } }
    );

    return res.status(200).json({
      success: true,
      photoPath, // 🔥 THIS IS WHAT FRONTEND NEEDS
    });
  } catch (err) {
    console.error("Upload photo error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

