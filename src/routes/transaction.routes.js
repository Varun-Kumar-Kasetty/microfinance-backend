const express = require("express");
const router = express.Router();

const {
  getMerchantTransactions,
  getBorrowerTransactions,
  getLoanTransactions,
  createTransaction,
} = require("../controllers/transaction.controller");

const auth = require("../middleware/auth"); // merchant JWT
const borrowerAuth = require("../middleware/borrowerAuth"); // borrower JWT

// Base: /api/transactions

// MERCHANT – all txns for logged-in merchant
// Optional: ?bid=1&lid=2 to filter
router.get("/merchant", auth, getMerchantTransactions);

// MERCHANT – create transaction
router.post("/", auth, createTransaction);

// BORROWER – txns for borrower by BID (admin / internal)
router.get("/borrower/:bid", getBorrowerTransactions);

// BORROWER – txns for logged-in borrower
router.get("/borrower/me", borrowerAuth, (req, res) => {
  req.params.bid = req.borrower.BID;
  return getBorrowerTransactions(req, res);
});

// LOAN – all txns for a specific loan
router.get("/loan/:lid", getLoanTransactions);

module.exports = router;
