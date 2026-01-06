const Borrower = require("../models/borrower.model");

/**
 * ===============================
 * BORROWER SELF REGISTRATION
 * ===============================
 */

exports.registerBorrower = async (req, res) => {
  try {
    const borrower = await Borrower.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Borrower registered successfully",
      data: borrower,
    });

  } catch (error) {
    console.error("Register Borrower Error:", error);

    // 🔴 DUPLICATE KEY ERROR
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];

      let message = "Duplicate value";

      if (field === "phoneNumber") {
        message = "Phone number already registered";
      } else if (field === "email") {
        message = "Email already registered";
      } else if (field === "aadhaarNumber") {
        message = "Aadhaar number already registered";
      }

      return res.status(409).json({
        success: false,
        message,
        field, // 👈 critical for frontend
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * ===============================
 * GET BORROWER ACCOUNT (SELF)
 * ===============================
 */
exports.getBorrowerAccount = async (req, res) => {
  try {
    const BID = req.borrower?.BID;

    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const borrower = await Borrower.findOne({ BID }).lean();

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // Remove sensitive/internal fields
    delete borrower.otpCode;
    delete borrower.otpExpiresAt;
    delete borrower.__v;
    delete borrower._id;

    return res.status(200).json({
      success: true,
      data: borrower,
    });
  } catch (error) {
    console.error("Get Borrower Account Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ===============================
 * UPDATE BORROWER ACCOUNT (SELF)
 * ===============================
 * Only minor editable fields
 */
exports.updateBorrowerAccount = async (req, res) => {
  try {
    const BID = req.borrower?.BID;

    if (!BID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ Allowed fields ONLY
    const allowedUpdates = [
      "fullName",
      "email",
      "location",
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const updatedBorrower = await Borrower.findOneAndUpdate(
      { BID },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updatedBorrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    delete updatedBorrower.otpCode;
    delete updatedBorrower.otpExpiresAt;
    delete updatedBorrower.__v;
    delete updatedBorrower._id;

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: updatedBorrower,
    });
  } catch (error) {
    console.error("Update Borrower Account Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
