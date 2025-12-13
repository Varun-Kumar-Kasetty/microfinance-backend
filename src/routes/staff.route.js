const express = require("express");
const router = express.Router();

const {
  createStaff,
  getMyStaff,
  updateStaff,
  deleteStaff,
  assignBorrowersToStaff,
  getMyAssignedBorrowers,
} = require("../controllers/staff.controller");

const auth = require("../middleware/auth"); // merchant auth
const staffAuth = require("../middleware/staffAuth"); // staff auth

// Base: /api/staff

// MERCHANT: create staff
router.post("/", auth, createStaff);

// MERCHANT: list my staff
router.get("/", auth, getMyStaff);

// MERCHANT: update staff
router.put("/:sid", auth, updateStaff);

// MERCHANT: delete staff
router.delete("/:sid", auth, deleteStaff);

// MERCHANT: assign borrowers to staff
router.post("/:sid/assign-borrowers", auth, assignBorrowersToStaff);

// STAFF: view my assigned borrowers
router.get("/me/borrowers", staffAuth, getMyAssignedBorrowers);

module.exports = router;
