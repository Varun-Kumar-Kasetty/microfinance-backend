PORT = 8686;
require("dotenv").config();

const express = require('express');
const connectDB = require('./config/db');
const path = require("path");

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


connectDB();

app.use("/api/merchants", require("./routes/merchant.routes")); //Tested : Working
app.use("/api/borrowers", require("./routes/borrower.route")); //Tested : Working
app.use("/api/auth/merchant", require("./routes/merchantAuth.route")); //Tested : Working
app.use("/api/auth/borrower", require("./routes/borrowerAuth.route")); //Tested : Working
app.use("/api/aadhaar/free", require("./routes/aadhaarFree.routes"));
app.use("/api/aadhaar/free", require("./routes/verifyOfflineEkyc.routes")); //Tested : Working
app.use("/api/loans", require("./routes/loan.route")); //Tested : Working
app.use("/api/community", require("./routes/community.route")); //Tested : Working
app.use("/api/transactions", require("./routes/transaction.routes")); //Tested : Working
app.use("/api/notifications", require("./routes/notification.routes")); //Tested
app.use("/api/dashboard", require("./routes/dashboard.routes")); //Tested
app.use("/api/staff", require("./routes/staff.route")); //Tested
app.use("/api/geo", require('./routes/geo.routes')); //Tested
app.use("/api/fraud", require('./routes/fraud.route')); //Tested
app.use("/api/reports", require('./routes/reports.routes')); //Tested
app.use("/api/test/cron", require('./routes/testCron.routes')); //Tested
app.use("/api/push", require('./routes/push.routes')); //Tested
app.use("/api", require("./routes/activityRoutes")); //Tested



app.get("/", (req, res) => {
  res.send("LendSafe API running...");
});

app.listen(PORT, () => {
        console.log(`The server is running at Port: ${PORT}.`);
    })

require("./cron/dailySummary.cron");
console.log("Cron jobs loaded.");
