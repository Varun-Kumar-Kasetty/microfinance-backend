// src/controllers/borrower.controller.js
const Borrower = require("../models/borrower.model");
const Loan = require("../models/loans.model");

// CREATE – add new borrower
exports.createBorrower = async (req, res) => {
  try {
    const borrower = await Borrower.create(req.body);

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

// READ ALL – optionally filter by VID (merchant)
exports.getAllBorrowers = async (req, res) => {
  try {
    const filter = {};

    if (req.query.vid) {
      filter.VID = Number(req.query.vid);
    }

    const borrowers = await Borrower.find(filter).sort({ BID: 1 });

    return res.status(200).json({ success: true, data: borrowers });
  } catch (error) {
    console.error("Get All Borrowers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// READ ONE – get borrower by BID
exports.getBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOne({ BID: bid });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    return res.status(200).json({ success: true, data: borrower });
  } catch (error) {
    console.error("Get Borrower Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE – update borrower by BID
exports.updateBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOneAndUpdate(
      { BID: bid },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Borrower updated successfully",
      data: borrower,
    });
  } catch (error) {
    console.error("Update Borrower Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE – delete borrower by BID
exports.deleteBorrowerByBID = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOneAndDelete({ BID: bid });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Borrower deleted successfully",
    });
  } catch (error) {
    console.error("Delete Borrower Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ PROFILE – borrower info + all its loans
exports.getBorrowerProfile = async (req, res) => {
  try {
    const { bid } = req.params;

    const borrower = await Borrower.findOne({ BID: bid });
    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
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
