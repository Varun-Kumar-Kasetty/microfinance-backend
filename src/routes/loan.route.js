const express = require("express");
const router = express.Router();

const {
  createLoan,
  getAllLoans,
  getLoanByLID,
  payLoanAmount,
  closeLoan,
} = require("../controllers/loan.controller");

const auth = require("../middleware/auth"); // JWT auth for merchants

// Base: /api/loans

// CREATE LOAN – merchant only
router.post("/", auth, createLoan);

// GET ALL LOANS (optional ?mid=&bid=&status=)
router.get("/", getAllLoans);

// GET SINGLE LOAN BY LID
router.get("/:lid", getLoanByLID);

// BORROWER PAYS SOME AMOUNT
// (you can keep this open or also protect with auth if you want)
router.post("/:lid/pay", payLoanAmount);

// OPTIONAL: directly close loan (merchant action)
router.put("/:lid/close", auth, closeLoan);

module.exports = router;
