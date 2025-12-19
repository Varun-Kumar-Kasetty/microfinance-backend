// src/routes/borrower.routes.js
const express = require("express");
const router = express.Router();

const borrowerAuth = require("../middleware/borrowerAuth");
const borrowerQrController = require("../controllers/borrowerQr.controller");

const merchantAuth = require("../middleware/merchantAuth");

const verifyBorrowerController = require("../controllers/verifyBorrower.controller");


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


router.get("/qr", borrowerAuth, borrowerQrController.generateBorrowerQr);



router.post("/verify", merchantAuth, verifyBorrowerController.verifyBorrower
);


module.exports = router;
