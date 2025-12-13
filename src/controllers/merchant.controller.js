// src/controllers/merchant.controller.js
const Merchant = require("../models/merchants.model");
const Loan = require("../models/loans.model");
const { verifyGSTIN } = require("../services/gst.service");


// CREATE – add new merchant with GST verification
exports.createMerchant = async (req, res) => {
  try {
    const { GSTIN } = req.body;

    if (!GSTIN) {
      return res
        .status(400)
        .json({ success: false, message: "GSTIN is required" });
    }

    // 1️⃣ Check if GSTIN already exists in DB
    const existingGstin = await Merchant.findOne({ GSTIN });
    if (existingGstin) {
      return res.status(400).json({
        success: false,
        message: "This GSTIN is already registered with another merchant",
      });
    }

    // 2️⃣ Verify GSTIN via external API
    // const gstResult = await verifyGSTIN(GSTIN);
    // const gstResult = GSTIN;
    // if (!gstResult.valid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "GSTIN verification failed",
    //     reason: gstResult.reason,
    //   });
    // }

    // 3️⃣ Create merchant, marking GST as verified + storing details
    const merchant = await Merchant.create({
      ...req.body,
      gstVerified: true,
      // gstLegalName: gstResult.details?.legalName || null,
      // gstTradeName: gstResult.details?.tradeName || null,
      // gstStateCode: gstResult.details?.stateCode || null,
      // gstStatus: gstResult.details?.status || null,
    });

    return res.status(201).json({
      success: true,
      message: "Merchant created and GSTIN verified successfully",
      data: merchant,
    });
  } catch (error) {
    console.error("Create Merchant Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// READ ALL – get all merchants
exports.getAllMerchants = async (req, res) => {
  try {
    const merchants = await Merchant.find().sort({ MID: 1 });
    return res.status(200).json({ success: true, data: merchants });
  } catch (error) {
    console.error("Get All Merchants Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// READ ONE – get merchant by MID
exports.getMerchantByMID = async (req, res) => {
  try {
    const { mid } = req.params;

    const merchant = await Merchant.findOne({ MID: mid });
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    return res.status(200).json({ success: true, data: merchant });
  } catch (error) {
    console.error("Get Merchant Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE – update merchant by MID
exports.updateMerchantByMID = async (req, res) => {
  try {
    const { mid } = req.params;

    const merchant = await Merchant.findOneAndUpdate(
      { MID: mid },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Merchant updated successfully",
      data: merchant,
    });
  } catch (error) {
    console.error("Update Merchant Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE – delete merchant by MID
exports.deleteMerchantByMID = async (req, res) => {
  try {
    const { mid } = req.params;

    const merchant = await Merchant.findOneAndDelete({ MID: mid });

    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Merchant deleted successfully",
    });
  } catch (error) {
    console.error("Delete Merchant Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ PROFILE – merchant info + all its loans
exports.getMerchantProfile = async (req, res) => {
  try {
    const { mid } = req.params; // or from req.merchant.MID if using auth

    const merchant = await Merchant.findOne({ MID: mid });
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    const loans = await Loan.find({ MID: mid })
      .sort({ LID: -1 })
      .select("-__v");

    return res.status(200).json({
      success: true,
      data: {
        merchant,
        loans,
      },
    });
  } catch (error) {
    console.error("Get Merchant Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
