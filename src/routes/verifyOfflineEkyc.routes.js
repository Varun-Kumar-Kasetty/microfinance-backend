const express = require("express");
const multer = require("multer");
const upload = multer();
const router = express.Router();
const { verifyOfflineEkyc } = require("../controllers/verifyOfflineEkyc.controller");

router.post("/verify-xml", upload.single("xmlFile"), verifyOfflineEkyc);

module.exports = router;
