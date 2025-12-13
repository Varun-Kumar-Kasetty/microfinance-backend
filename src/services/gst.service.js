// // src/services/gst.service.js
// const axios = require("axios");

// /**
//  * Verify GSTIN using external GST API
//  * 
//  * Adjust the URL, headers, and response parsing
//  * according to the GST API provider you use.
//  */
// async function verifyGSTIN(gstin) {
//   // Basic format check (optional but useful)
//   const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
//   if (!gstRegex.test(gstin)) {
//     return {
//       valid: false,
//       reason: "GSTIN format is invalid",
//       raw: null,
//     };
//   }

//   try {
//     const baseUrl = process.env.GST_API_BASE_URL; // e.g. https://api.your-gst-provider.com
//     const apiKey = process.env.GST_API_KEY;       // your secret key / token

//     // 🔁 Example GET call – change path/headers per your provider docs
//     const response = await axios.get(`${baseUrl}/gst/verify/${gstin}`, {
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//       },
//       timeout: 10000,
//     });

//     // 🔧 Adjust based on actual response shape
//     const data = response.data;

//     // Example assumption:
//     // data = { valid: true, gstin: "...", tradeName: "...", legalName: "...", stateCode: "33", status: "Active" }

//     return {
//       valid: !!data.valid,
//       reason: data.valid ? null : data.reason || "GSTIN not valid",
//       raw: data,
//       // map what you care about:
//       details: {
//         gstin: data.gstin,
//         legalName: data.legalName,
//         tradeName: data.tradeName,
//         stateCode: data.stateCode,
//         status: data.status,
//       },
//     };
//   } catch (error) {
//     console.error("GST API Error:", error.response?.data || error.message);

//     return {
//       valid: false,
//       reason: "GST API call failed",
//       raw: error.response?.data || null,
//     };
//   }
// }

// module.exports = {
//   verifyGSTIN,
// };


const axios = require("axios");

// ✅ Default to MOCK = true if not explicitly "false"
const USE_MOCK =
  (process.env.GST_API_MOCK || "true").toString().toLowerCase() === "true";

/**
 * Verify GSTIN (real API OR mock, based on USE_MOCK)
 */
async function verifyGSTIN(gstin) {
  // 1️⃣ Basic format check
  const gstRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstRegex.test(gstin)) {
    return {
      valid: false,
      reason: "GSTIN format is invalid",
      raw: null,
    };
  }

  // 2️⃣ MOCK MODE – used for development/testing
  if (USE_MOCK) {
    console.log("[GST MOCK] Verifying GSTIN:", gstin);
    return {
      valid: true,
      reason: null,
      raw: { mock: true },
      details: {
        gstin,
        legalName: "Mock Legal Name",
        tradeName: "Mock Trade Name",
        stateCode: gstin.substring(0, 2),
        status: "Active",
      },
    };
  }

  // 3️⃣ REAL API MODE – only used when GST_API_MOCK=false
  try {
    const baseUrl = process.env.GST_API_BASE_URL;
    const apiKey = process.env.GST_API_KEY;

    if (!baseUrl || !apiKey) {
      console.warn(
        "[GST WARNING] GST_API_BASE_URL or GST_API_KEY not set, failing verification."
      );
      return {
        valid: false,
        reason: "GST API is not configured",
        raw: null,
      };
    }

    const response = await axios.get(`${baseUrl}/gst/verify/${gstin}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const data = response.data;

    return {
      valid: !!data.valid,
      reason: data.valid ? null : data.reason || "GSTIN not valid",
      raw: data,
      details: {
        gstin: data.gstin,
        legalName: data.legalName,
        tradeName: data.tradeName,
        stateCode: data.stateCode,
        status: data.status,
      },
    };
  } catch (error) {
    console.error(
      "GST API Error:",
      error.response?.data || error.message || error
    );

    return {
      valid: false,
      reason: "GST API call failed",
      raw: error.response?.data || null,
    };
  }
}

module.exports = {
  verifyGSTIN,
};
