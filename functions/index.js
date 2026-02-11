const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
require("dotenv").config();

admin.initializeApp();

const LOW_STOCK_THRESHOLD = 5;

let cachedTransporter = null;
function getMailer() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return cachedTransporter;
}

function buildLowStockMessage(product) {
  const name = product?.name || "Product";
  const productId = product?.productId ? ` (${product.productId})` : "";
  const warehouse = product?.warehouse || "Unassigned";
  const quantity = Number(product?.quantity ?? 0);
  const subject = `Low stock alert: ${name}${productId}`;
  const text =
    `Low stock alert for ${name}${productId}\n` +
    `Quantity: ${quantity}\n` +
    `Warehouse: ${warehouse}\n` +
    `Threshold: ${LOW_STOCK_THRESHOLD}`;
  const html = `
    <p><strong>Low stock alert</strong></p>
    <p>Product: ${name}${productId}</p>
    <p>Quantity: ${quantity}</p>
    <p>Warehouse: ${warehouse}</p>
    <p>Threshold: ${LOW_STOCK_THRESHOLD}</p>
  `;

  return { subject, text, html };
}

exports.groqChat = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ API key not configured" });
    }

    const { messages, model } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model || "llama-3.1-8b",
            messages
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data });
      }

      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });
});

exports.notifyCrud = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const title = data?.title || "SmartStock";
  const body = data?.body || "Inventory updated";

  const tokensSnap = await admin.firestore().collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map((doc) => doc.id).filter(Boolean);

  if (tokens.length === 0) {
    return { success: true, sent: 0 };
  }

  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  let sent = 0;
  for (const chunk of chunks) {
    const result = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body }
    });
    sent += result.successCount;
  }

  return { success: true, sent };
});

exports.notifyLowStockEmail = functions.firestore
  .document("products/{productId}")
  .onWrite(async (change) => {
    if (!change.after.exists) {
      return null;
    }

    const after = change.after.data() || {};
    const before = change.before.exists ? change.before.data() : null;
    const afterQty = Number(after.quantity ?? 0);
    const beforeQty = Number(before?.quantity ?? Number.POSITIVE_INFINITY);

    const crossedThreshold =
      afterQty < LOW_STOCK_THRESHOLD &&
      (before == null || beforeQty >= LOW_STOCK_THRESHOLD);

    if (!crossedThreshold) {
      return null;
    }

    const uid = after.lastUpdatedBy || after.createdBy;
    if (!uid) {
      return null;
    }

    let user;
    try {
      user = await admin.auth().getUser(uid);
    } catch (err) {
      console.error("Low stock email: user lookup failed", err);
      return null;
    }

    if (!user.email) {
      return null;
    }

    let transporter;
    try {
      transporter = getMailer();
    } catch (err) {
      console.error("Low stock email: SMTP not configured", err);
      return null;
    }

    const { subject, text, html } = buildLowStockMessage(after);
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
      await transporter.sendMail({
        from,
        to: user.email,
        subject,
        text,
        html
      });
    } catch (err) {
      console.error("Low stock email: send failed", err);
    }

    return null;
  });
