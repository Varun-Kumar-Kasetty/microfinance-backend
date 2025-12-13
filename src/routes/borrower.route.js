// src/routes/borrower.routes.js
const express = require("express");
const router = express.Router();

const {
  createBorrower,
  getAllBorrowers,
  getBorrowerByBID,
  updateBorrowerByBID,
  deleteBorrowerByBID,
  getBorrowerProfile,
} = require("../controllers/borrower.controller");

// Base: /api/borrowers

// CREATE
router.post("/", createBorrower);

// READ ALL (optional ?vid=1)
router.get("/", getAllBorrowers);

// READ ONE by BID
router.get("/:bid", getBorrowerByBID);

// PROFILE (borrower + loans)
router.get("/:bid/profile", getBorrowerProfile);

// UPDATE by BID
router.put("/:bid", updateBorrowerByBID);

// DELETE by BID
router.delete("/:bid", deleteBorrowerByBID);

module.exports = router;
