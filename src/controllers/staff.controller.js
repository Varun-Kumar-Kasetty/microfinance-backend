const Staff = require("../models/staff.model");
const Borrower = require("../models/borrower.model");

// CREATE staff (merchant only)
exports.createStaff = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const { fullName, phoneNumber, role, area } = req.body;

    if (!fullName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "fullName and phoneNumber are required",
      });
    }

    const existing = await Staff.findOne({ phoneNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Staff with this phoneNumber already exists",
      });
    }

    const staff = await Staff.create({
      MID: Number(MID),
      fullName,
      phoneNumber,
      role: role || "collector",
      area: area || "",
    });

    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Create Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET all staff for current merchant
exports.getMyStaff = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const staffList = await Staff.find({ MID: Number(MID) }).lean();

    return res.status(200).json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    console.error("Get My Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE staff (merchant only, must own staff)
exports.updateStaff = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { sid } = req.params;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const staff = await Staff.findOne({ SID: Number(sid) });

    if (!staff || staff.MID !== Number(MID)) {
      return res.status(404).json({
        success: false,
        message: "Staff not found for this merchant",
      });
    }

    const { fullName, phoneNumber, role, area, isActive } = req.body;

    if (fullName !== undefined) staff.fullName = fullName;
    if (phoneNumber !== undefined) staff.phoneNumber = phoneNumber;
    if (role !== undefined) staff.role = role;
    if (area !== undefined) staff.area = area;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Update Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE staff (merchant only)
exports.deleteStaff = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { sid } = req.params;

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    const staff = await Staff.findOne({ SID: Number(sid) });

    if (!staff || staff.MID !== Number(MID)) {
      return res.status(404).json({
        success: false,
        message: "Staff not found for this merchant",
      });
    }

    await staff.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Staff deleted successfully",
    });
  } catch (error) {
    console.error("Delete Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ASSIGN borrowers to staff
exports.assignBorrowersToStaff = async (req, res) => {
  try {
    const MID = req.merchant?.MID;
    const { sid } = req.params;
    const { borrowerBIDs } = req.body; // array of BIDs

    if (!MID) {
      return res
        .status(401)
        .json({ success: false, message: "Merchant token missing" });
    }

    if (!Array.isArray(borrowerBIDs) || borrowerBIDs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "borrowerBIDs must be a non-empty array",
      });
    }

    const staff = await Staff.findOne({ SID: Number(sid) });

    if (!staff || staff.MID !== Number(MID)) {
      return res.status(404).json({
        success: false,
        message: "Staff not found for this merchant",
      });
    }

    // verify borrowers belong to this merchant
    const borrowers = await Borrower.find({
      BID: { $in: borrowerBIDs.map(Number) },
      VID: Number(MID),
    }).select("BID");

    const validBIDs = borrowers.map((b) => b.BID);

    staff.assignedBorrowers = validBIDs;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Borrowers assigned to staff successfully",
      data: {
        SID: staff.SID,
        assignedBorrowers: staff.assignedBorrowers,
      },
    });
  } catch (error) {
    console.error("Assign Borrowers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// STAFF – view their assigned borrowers
exports.getMyAssignedBorrowers = async (req, res) => {
  try {
    const { SID } = req.staff || {};

    if (!SID) {
      return res
        .status(401)
        .json({ success: false, message: "Staff token missing" });
    }

    const staff = await Staff.findOne({ SID }).lean();

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    const borrowers = await Borrower.find({
      BID: { $in: staff.assignedBorrowers || [] },
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        staff,
        borrowers,
      },
    });
  } catch (error) {
    console.error("Get My Assigned Borrowers Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
