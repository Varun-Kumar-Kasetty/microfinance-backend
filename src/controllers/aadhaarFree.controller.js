// src/controllers/aadhaarFree.controller.js
const Jimp = require("jimp");
const jsQR = require("jsqr");
const { parseStringPromise } = require("xml2js");

/**
 * POST /api/aadhaar/decode-qr
 * body: multipart/form-data file: 'image'
 * Returns: { success, data: { raw: '<xml or text>', parsed: {...} } }
 */
exports.decodeAadhaarQr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required (field name 'image')" });
    }

    // read image buffer (multer gives req.file.buffer)
    const image = await Jimp.read(req.file.buffer);
    // convert to greyscale + get image data
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const imageData = new Uint8ClampedArray(width * height * 4);
    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = Jimp.intToRGBA(image.getPixelColor(x, y));
        imageData[idx++] = px.r;
        imageData[idx++] = px.g;
        imageData[idx++] = px.b;
        imageData[idx++] = px.a;
      }
    }

    // jsQR expects grayscale bytes (Uint8ClampedArray) and width/height;
    // we'll convert rgba -> grayscale
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < imageData.length; i += 4, j++) {
      const r = imageData[i], g = imageData[i+1], b = imageData[i+2];
      gray[j] = (r + g + b) / 3;
    }

    const qr = jsQR(gray, width, height);
    if (!qr) {
      return res.status(404).json({ success: false, message: "No QR code found or unreadable" });
    }

    const raw = qr.data; // likely XML like <PrintLetterBarcodeData ... /> or signed data
    let parsed = null;

    // Try to parse XML if it looks like XML
    if (raw && raw.trim().startsWith("<")) {
      try {
        parsed = await parseStringPromise(raw, { explicitArray: false, attrkey: "@" });
      } catch (e) {
        // fallthrough — not XML or parse failed
        parsed = null;
      }
    }

    return res.json({ success: true, data: { raw, parsed } });
  } catch (err) {
    console.error("decodeAadhaarQr error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
