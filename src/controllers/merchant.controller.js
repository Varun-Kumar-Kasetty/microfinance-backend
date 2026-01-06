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

    // 1. Check if GSTIN already exists in DB
    const existingGstin = await Merchant.findOne({ GSTIN });
    if (existingGstin) {
      return res.status(400).json({
        success: false,
        message: "This GSTIN is already registered with another merchant",
      });
    }

    // 2️. Verify GSTIN via external API
    // const gstResult = await verifyGSTIN(GSTIN);
    // const gstResult = GSTIN;
    // if (!gstResult.valid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "GSTIN verification failed",
    //     reason: gstResult.reason,
    //   });
    // }

    // 3️. Create merchant, marking GST as verified + storing details
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

// PROFILE – merchant info and all its loans
exports.getMerchantProfile = async (req, res) => {
  try {
    const mid = req.merchant.MID; //this MID come from from auth middleware

    const merchant = await Merchant.findOne({ MID: mid });
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        merchantId: merchant.MID,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// SELF PROFILE – logged-in merchant (JWT based)
exports.getMerchantSelfProfile = async (req, res) => {
  try {
    const { MID } = req.merchant;

    const merchant = await Merchant.findOne({ MID });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    const totalLoans = await Loan.countDocuments({ MID });
    const activeLoans = await Loan.countDocuments({
      MID,
      status: { $ne: "closed" },
    });



    return res.status(200).json({
      success: true,
      data: {
        basic: {
          merchantName: merchant.fullName,          // ✅ FIXED
          storeName: merchant.storeName,
          email: merchant.email,
          phone: merchant.phoneNumber,              // ✅ FIXED
          merchantId: merchant.MID,
          memberSince: merchant.createdAt,
          verified: merchant.gstVerified,
        },
        stats: {
          totalLoans,
          activeLoans,
        },
        contact: {
          phone: merchant.phoneNumber,               // ✅ FIXED
          email: merchant.email,
        },
        business: {
          storeName: merchant.storeName,
          address: merchant.address || "",
          category: merchant.gstTradeName || "",     // ✅ BEST AVAILABLE FIELD
          gstNumber: merchant.GSTIN,
        },
      },
    });
  } catch (error) {
    console.error("Get Self Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// UPDATE SELF PROFILE with restricted fields
exports.updateMerchantSelfProfile = async (req, res) => {
  try {
    const { MID } = req.merchant;

    const { fullName, address } = req.body;
    const updates = {};

    if (fullName?.trim()) updates.fullName = fullName.trim();
    if (address?.trim()) updates.address = address.trim();

    const merchant = await Merchant.findOneAndUpdate(
      { MID },
      updates,
      { new: true, runValidators: true } // ✅ important
    );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        fullName: merchant.fullName,
        address: merchant.address,
      },
    });
  } catch (error) {
    console.error("Update Self Profile Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



exports.sendMerchantEmailOtp = async (req, res) => {
  try {
    const { MID } = req.merchant;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required",
      });
    }

    // check email already exists
    const emailExists = await Merchant.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const updatedMerchant = await Merchant.findOneAndUpdate(
      { MID },
      {
        otpCode: otp,
        otpExpiresAt: Date.now() + 5 * 60 * 1000,
        tempEmail: newEmail,
      },
      { new: true } // 🔥 MUST
    );


      console.log("Merchant OTP:", otp, "for email:", newEmail);

    // 🔔 REUSE YOUR EMAIL SERVICE HERE
    // sendEmail(newEmail, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent to new email",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.verifyMerchantEmailOtp = async (req, res) => {
  try {
    const { MID } = req.merchant;
    const { otp } = req.body;

    const merchant = await Merchant.findOne({ MID });

    console.log("VERIFY OTP DEBUG:", {
      MID,
      enteredOtp: otp,
      storedOtp: merchant?.otpCode,
      expiresAt: merchant?.otpExpiresAt,
      now: Date.now(),
      isExpired: merchant?.otpExpiresAt < Date.now(),
    });

    if (
      !merchant ||
      !merchant.otpCode ||
      String(merchant.otpCode) !== String(otp) ||
      merchant.otpExpiresAt < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    merchant.email = merchant.tempEmail;
    merchant.tempEmail = null;
    merchant.otpCode = null;
    merchant.otpExpiresAt = null;

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


