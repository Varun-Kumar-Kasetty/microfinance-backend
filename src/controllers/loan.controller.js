const Loan = require("../models/loans.model");
const Borrower = require("../models/borrower.model");
const Transaction = require("../models/transactions.model");
const { createNotification } = require("../services/notification.service");
const { runLoanFraudChecks } = require("../services/fraud.service");

// ----------------- CREATE LOAN (merchant only) -----------------
exports.createLoan = async (req, res) => {
  try {
    const { BID, loanAmount, loanDurationDays, purpose, imagePath } = req.body;

    const merchantMID = req.merchant?.MID;
    if (!merchantMID) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: merchant not found in token" });
    }

    const borrower = await Borrower.findOne({ BID });

    if (!borrower) {
      return res
        .status(404)
        .json({ success: false, message: "Borrower not found" });
    }

    // borrower must belong to this merchant
    if (borrower.VID !== merchantMID) {
      return res.status(403).json({
        success: false,
        message: "You cannot create loan for another merchant's borrower",
      });
    }

    const loan = await Loan.create({
      BID,
      MID: merchantMID,
      loanAmount,
      loanDurationDays,
      purpose,
      imagePath,
    });

    borrower.totalLoans = (borrower.totalLoans || 0) + 1;
    borrower.activeLoans = (borrower.activeLoans || 0) + 1;
    await borrower.save();

    // 🔔 Notifications

    // To borrower – new loan
    await createNotification({
      targetType: "borrower",
      BID: borrower.BID,
      MID: merchantMID,
      LID: loan.LID,
      type: "loan_created",
      title: "New Loan Created",
      message: `A new loan of ₹${loanAmount} has been created for you with duration ${loanDurationDays} days.`,
    });

    // To merchant – you added a loan
    await createNotification({
      targetType: "merchant",
      MID: merchantMID,
      BID: borrower.BID,
      LID: loan.LID,
      type: "loan_created",
      title: "Loan Added for Borrower",
      message: `Loan of ₹${loanAmount} created for borrower BID ${borrower.BID}.`,
    });

    // 🕵️ Run fraud checks for this new loan
    const fraudAlerts = await runLoanFraudChecks(loan);

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: {
        loan,
        fraudAlerts,
      },
    });
  } catch (error) {
    console.error("Create Loan Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// ----------------- GET ALL LOANS -----------------
exports.getAllLoans = async (req, res) => {
  try {
    const { mid, bid, status } = req.query;
    const filter = {};

    if (mid) filter.MID = Number(mid);
    if (bid) filter.BID = Number(bid);
    if (status) filter.status = status; // "active" | "closed"

    const loans = await Loan.find(filter).sort({ LID: -1 });

    return res.status(200).json({ success: true, data: loans });
  } catch (error) {
    console.error("Get All Loans Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- GET SINGLE LOAN BY LID -----------------
exports.getLoanByLID = async (req, res) => {
  try {
    const { lid } = req.params;

    const loan = await Loan.findOne({ LID: lid });

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    return res.status(200).json({ success: true, data: loan });
  } catch (error) {
    console.error("Get Loan Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// ----------------- BORROWER PAYS SOME AMOUNT -----------------
exports.payLoanAmount = async (req, res) => {
  try {
    const { lid } = req.params;
    const { amount, note, method } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount is required" });
    }

    const loan = await Loan.findOne({ LID: lid });

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    if (loan.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Loan is already closed",
      });
    }

    // Update loan payment info
    loan.totalPaid = (loan.totalPaid || 0) + amount;
    loan.paymentHistory.push({
      amount,
      note: note || "",
    });

    // Create transaction
    const tx = await Transaction.create({
      LID: loan.LID,
      BID: loan.BID,
      MID: loan.MID,
      amount,
      method: method || "cash",
      note: note || "",
      paidAt: new Date(),
    });

    // Check for closing
    let loanJustClosed = false;
    if (loan.totalPaid >= loan.loanAmount) {
      loan.status = "closed";
      loan.closedAt = new Date();
      loanJustClosed = true;

      const borrower = await Borrower.findOne({ BID: loan.BID });
      if (borrower) {
        borrower.activeLoans = Math.max((borrower.activeLoans || 1) - 1, 0);
        await borrower.save();
      }
    }

    await loan.save();

    // 🔔 Notifications

    // To merchant – borrower paid
    await createNotification({
      targetType: "merchant",
      MID: loan.MID,
      BID: loan.BID,
      LID: loan.LID,
      TID: tx.TID,
      type: "payment_received",
      title: "Payment Received",
      message: `Borrower BID ${loan.BID} paid ₹${amount} for loan LID ${loan.LID}.`,
    });

    // To borrower – payment done
    await createNotification({
      targetType: "borrower",
      BID: loan.BID,
      MID: loan.MID,
      LID: loan.LID,
      TID: tx.TID,
      type: "payment_made",
      title: "Payment Successful",
      message: `You paid ₹${amount} towards your loan LID ${loan.LID}.`,
    });

    // Optional extra notification when loan fully closed
    if (loanJustClosed) {
      await createNotification({
        targetType: "borrower",
        BID: loan.BID,
        MID: loan.MID,
        LID: loan.LID,
        type: "payment_made",
        title: "Loan Closed",
        message: "Congratulations! Your loan has been fully repaid and closed.",
      });

      await createNotification({
        targetType: "merchant",
        MID: loan.MID,
        BID: loan.BID,
        LID: loan.LID,
        type: "payment_received",
        title: "Loan Closed by Borrower",
        message: `Borrower BID ${loan.BID} has fully repaid loan LID ${loan.LID}.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        loan,
        transaction: tx,
      },
    });
  } catch (error) {
    console.error("Pay Loan Amount Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};



// ----------------- CLOSE LOAN (optional direct close) -----------------
exports.closeLoan = async (req, res) => {
  try {
    const { lid } = req.params;

    const loan = await Loan.findOne({ LID: lid });

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    if (loan.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Loan is already closed",
      });
    }

    loan.status = "closed";
    loan.closedAt = new Date();
    if (!loan.totalPaid || loan.totalPaid < loan.loanAmount) {
      loan.totalPaid = loan.loanAmount; // assume fully paid on close
    }

    await loan.save();

    const borrower = await Borrower.findOne({ BID: loan.BID });
    if (borrower) {
      borrower.activeLoans = Math.max((borrower.activeLoans || 1) - 1, 0);
      await borrower.save();
    }

    return res.status(200).json({
      success: true,
      message: "Loan closed successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Close Loan Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
