const express = require("express");
const router = express.Router();

const {
  getMerchantTransactions,
  getBorrowerTransactions,
  getLoanTransactions,
  createTransaction,
  createLoanViaYouGave,
  getBorrowerTransactionsByMerchant
} = require("../controllers/transaction.controller");


// ✅ DEFAULT EXPORTS (functions)
const auth = require("../middleware/auth");
const borrowerAuth = require("../middleware/borrowerAuth");

// MERCHANT – all txns for logged-in merchant
router.get("/merchant", auth, getMerchantTransactions);

// MERCHANT – create transaction
router.post("/", auth, createTransaction);

// MERCHANT – YOU_GAVE
router.post("/you-gave", auth, createLoanViaYouGave);

// BORROWER – txns for borrower by BID (admin/internal)
router.get("/borrower/:bid", getBorrowerTransactions);

// BORROWER – logged-in borrower
router.get("/borrower/me", borrowerAuth, (req, res) => {
  req.params.bid = req.borrower.BID;
  return getBorrowerTransactions(req, res);
});

// LOAN – txns for a specific loan
router.get("/loan/:lid", getLoanTransactions);


router.get(
  "/borrower/me/merchant",
  borrowerAuth,
  getBorrowerTransactionsByMerchant
);

module.exports = router;
