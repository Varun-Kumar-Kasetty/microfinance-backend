const express = require("express");
const router = express.Router();

const {
  createLoan,
  getAllLoans,
  getLoanByLID,
  payLoanAmount,
  closeLoan,
  getMerchantLoanSummary,
  getBorrowerLoansGroupedByMerchant,
  getBorrowerLoansByMerchant
} = require("../controllers/loan.controller");

const auth = require("../middleware/auth"); // JWT auth for merchants

const borrowerAuth = require("../middleware/borrowerAuth"); // JWT auth for borrowers
// Base: /api/loans

// CREATE LOAN – merchant only
router.post("/create", auth, createLoan);

// GET ALL LOANS (optional ?mid=&bid=&status=)
router.get("/getloans", getAllLoans);

// GET SINGLE LOAN BY LID
router.get("/:lid", getLoanByLID);

// BORROWER PAYS SOME AMOUNT
// (you can keep this open or also protect with auth if you want)
router.post("/:lid/pay", payLoanAmount);

// OPTIONAL: directly close loan (merchant action)
router.put("/:lid/close", auth, closeLoan);

router.get("/merchant-summary", auth, getMerchantLoanSummary);

router.get(
  "/borrower/grouped-loans",
  borrowerAuth, getBorrowerLoansGroupedByMerchant
);

router.get(
  "/borrower/merchant/:mid",
  borrowerAuth,
  getBorrowerLoansByMerchant
);


module.exports = router;
