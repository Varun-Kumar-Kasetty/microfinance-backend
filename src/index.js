PORT = 8686;
require("dotenv").config();

const Razorpay = require("razorpay");


const express = require('express');
const connectDB = require('./config/db');
const multer = require("multer");
const cron = require("node-cron");

const missedDueDateCron = require("./cron/missedDueDate.cron");
const weeklyOverduePenaltyCron = require("./cron/weeklyOverduePenalty.cron");

const app = express();
app.use(express.json());
const path = require("path");

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);


const { getFirebaseAdmin } = require("./config/firebase");
getFirebaseAdmin();

connectDB();

app.get("/api/test/ping", (req, res) => {
  console.log("🔥 PING HIT FROM ANDROID");
  res.json({ success: true });
});



app.use("/api/merchants", require("./routes/merchant.routes")); // used
app.use("/api/auth/merchant", require("./routes/merchantAuth.route")); // used
app.use("/api/auth/borrower", require("./routes/borrowerAuth.route")); // used

app.use("/api/borrower", require("./routes/borrowerEmail.route"));// used


app.use("/api/borrower", require("./routes/borrowerQr.route")); // used
app.use("/api/verify", require("./routes/merchantVerify.route")); //used

app.use("/api/dashboard", require("./routes/dashboard.routes"));  // used

app.use("/api", require("./routes/activityRoutes"));  // used

app.use("/api/transactions", require("./routes/transaction.routes")); // used


app.use("/api/loans", require("./routes/loan.route"));  // used

app.use("/api/aadhaar/free", require("./routes/aadhaarFree.routes"));

app.use("/api/community", require("./routes/community.route"));  
 
app.use("/api/notifications", require("./routes/notification.routes"));  

app.use("/api/pay", require("./routes/payment.routes"));  // used

app.use("/api/push", require('./routes/push.routes'));

app.use("/api/trust-score", require("./routes/trustScore.routes")); // used


app.use("/api/staff", require("./routes/staff.route"));  
app.use("/api/geo", require('./routes/geo.routes'));  
app.use("/api/fraud", require('./routes/fraud.route'));  
app.use("/api/reports", require('./routes/reports.routes'));  
app.use("/api/test/cron", require('./routes/testCron.routes'));  
  



app.get("/", (req, res) => {
  res.send("LendSafe API running...");
});

app.listen(8686, "0.0.0.0", () => {
  console.log(`The server is running at Port: ${PORT}.`);
});


require("./cron/dailySummary.cron");
console.log("Cron jobs loaded.");

cron.schedule("5 0 * * *", async () => {
  await missedDueDateCron();
});

// Run every Sunday at 12:10 AM
cron.schedule("10 0 * * 0", async () => {
  await weeklyOverduePenaltyCron();
});




app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image too large. Max allowed size is 5MB",
      });
    }
  }

  next(err);
});
