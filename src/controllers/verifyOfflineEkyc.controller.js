// src/controllers/verifyOfflineEkyc.controller.js
const fs = require("fs");
const { promisify } = require("util");
const { DOMParser } = require("xmldom");
const xpath = require("xpath");
const { SignedXml } = require("xml-crypto");
const { parseStringPromise } = require("xml2js");
const readFile = promisify(fs.readFile);

// You should download the UIDAI offline public key cert from UIDAI site and save locally
// e.g. ./certs/uidai_offline_publickey_17022026.cer
const UIDAI_CERT_PATH = process.env.UIDAI_OFFLINE_CERT_PATH || "./certs/uidai_offline_publickey_17022026.cer";

function pemFromCer(cerPath) {
  // read cert (DER/PEM). UIDAI provides .cer (PEM or DER); ensure it's PEM
  let cert = fs.readFileSync(cerPath, "utf8");
  // If DER binary, you may need to convert; assume PEM here (-----BEGIN CERTIFICATE-----)
  if (!cert.includes("BEGIN CERTIFICATE")) {
    // try to base64 encode binary
    const bin = fs.readFileSync(cerPath);
    const b64 = bin.toString("base64");
    cert = "-----BEGIN CERTIFICATE-----\n" + b64.match(/.{1,64}/g).join("\n") + "\n-----END CERTIFICATE-----\n";
  }
  return cert;
}

function verifyXmlSignature(xmlString, certPem) {
  const doc = new DOMParser().parseFromString(xmlString);
  const signature = xpath.select("//*[local-name(.)='Signature']", doc)[0];
  if (!signature) throw new Error("No Signature node found in XML");

  const sig = new SignedXml();
  sig.keyInfoProvider = {
    getKeyInfo() { return null; },
    getKey: () => certPem
  };
  sig.loadSignature(signature);
  const res = sig.checkSignature(xmlString);
  if (!res) {
    return { valid: false, errors: sig.validationErrors };
  }
  return { valid: true };
}

exports.verifyOfflineEkyc = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:"XML file required (field 'xmlFile')" });

    const xmlBuffer = req.file.buffer;
    const xmlString = xmlBuffer.toString("utf8");

    // Parse basic fields for convenience
    let parsed = null;
    try {
      parsed = await parseStringPromise(xmlString, { explicitArray:false, attrkey:"@" });
    } catch(e) {
      // ignore
    }

    // load UIDAI cert
    const certPem = pemFromCer(UIDAI_CERT_PATH);

    // verify signature
    const result = verifyXmlSignature(xmlString, certPem);

    return res.json({
      success: true,
      signatureValid: !!result.valid,
      errors: result.errors || null,
      parsed
    });
  } catch (err) {
    console.error("verifyOfflineEkyc error:", err);
    return res.status(500).json({ success:false, message:err.message });
  }
};
