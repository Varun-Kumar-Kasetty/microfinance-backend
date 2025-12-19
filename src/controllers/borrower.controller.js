// src/controllers/borrower.controller.js

const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");

/**
 * ===============================
 * CREATE BORROWER (merchant only)
 * ===============================
 */


exports.createBorrower = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: merchant token missing",
      });
    }

    // attach merchant ownership
    const borrower = await Borrower.create({
      ...req.body,
      VID: Number(MID), // ✅ CRITICAL FIX
    });

    return res.status(201).json({
      success: true,
      message: "Borrower created successfully",
      data: borrower,
    });
  } catch (error) {
    console.error("Create Borrower Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ===============================
 * READ ALL BORROWERS (merchant)
 * ===============================
 */
exports.getAllBorrowers = async (req, res) => {
  try {
    const filter = {};

    // if merchant token exists → restrict to merchant
    if (req.merchant?.MID) {
      filter.VID = Number(req.merchant.MID);
    }

    // optional admin filter
    if (req.query.vid) {
      filter.VID = Number(req.query.vid);
    }

    const borrowers = await Borrower.find(filter).sort({ BID: 1 });

    return res.status(200).json({
      success: true,
      data: borrowers,
    });
  } catch (error) {
    console.error("Get All Borrowers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===============================
 * READ ONE BORROWER (merchant)
 * ===============================
 */
exports.getBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;
    const MID = req.merchant?.MID;

    const borrower = await Borrower.findOne({ BID: bid });

    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ownership check
    if (MID && borrower.VID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this borrower",
      });
    }

    return res.status(200).json({
      success: true,
      data: borrower,
    });
  } catch (error) {
    console.error("Get Borrower Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===============================
 * UPDATE BORROWER (merchant)
 * ===============================
 */
exports.updateBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;
    const MID = req.merchant?.MID;

    const borrower = await Borrower.findOne({ BID: bid });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ownership check
    if (MID && borrower.VID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update another merchant's borrower",
      });
    }

    const updated = await Borrower.findOneAndUpdate(
      { BID: bid },
      req.body,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Borrower updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Borrower Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ===============================
 * DELETE BORROWER (merchant)
 * ===============================
 */
exports.deleteBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;
    const MID = req.merchant?.MID;

    const borrower = await Borrower.findOne({ BID: bid });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ownership check
    if (MID && borrower.VID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete another merchant's borrower",
      });
    }

    await Borrower.deleteOne({ BID: bid });

    return res.status(200).json({
      success: true,
      message: "Borrower deleted successfully",
    });
  } catch (error) {
    console.error("Delete Borrower Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===============================
 * BORROWER PROFILE (merchant)
 * ===============================
 */
exports.getBorrowerProfile = async (req, res) => {
  try {
    const { bid } = req.params;
    const MID = req.merchant?.MID;

    const borrower = await Borrower.findOne({ BID: bid });
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower not found",
      });
    }

    // ownership check
    if (MID && borrower.VID !== Number(MID)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this borrower",
      });
    }

    const loans = await Loan.find({ BID: bid }).sort({ LID: -1 });

    return res.status(200).json({
      success: true,
      data: {
        borrower,
        loans,
      },
    });
  } catch (error) {
    console.error("Get Borrower Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
