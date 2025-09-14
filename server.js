// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

/** ---------- CORS (allow your Vercel site) ---------- */
const allowedOrigins = [
  "https://portfolio-naciimas.vercel.app", // your Vercel frontend
  // add more domains later if you add a custom domain, e.g.
  // "https://www.naciima.dev",
];

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser tools (no Origin) like curl or Render health checks
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Optional: handle preflight quickly
app.options("*", cors());

/** ---------- Body parsing ---------- */
app.use(express.json({ limit: "200kb" })); // keep it small, forms are tiny

/** ---------- Health route (useful for Render) ---------- */
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

/** ---------- Nodemailer transport ---------- */
/*
  Gmail now requires an "App password" if the account has 2FA enabled.
  Set these in your Render env:
    EMAIL_USER=<your gmail address>
    EMAIL_PASS=<app password>
    TO_EMAIL=<where you want to receive messages>
*/
const contactEmail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// optional—log once on boot
contactEmail.verify((error) => {
  if (error) {
    console.error("Nodemailer transport error:", error);
  } else {
    console.log("Ready to send emails");
  }
});

/** ---------- Helpers ---------- */
function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length > 0;
}

/** ---------- Routes ---------- */
app.post("/contact", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body || {};

    // Minimal validation
    if (
      !isNonEmptyString(firstName) ||
      !isNonEmptyString(lastName) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(message)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const html = `
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "(not provided)"}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
    `;

    const mail = {
      from: `Portfolio Contact <${process.env.EMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject: "Contact Form Submission - Portfolio",
      html,
      replyTo: email, // so you can reply directly in your inbox
    };

    await contactEmail.sendMail(mail);

    return res.status(200).json({ success: true, message: "Message Sent!" });
  } catch (error) {
    console.error("Email send error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Email failed", error: String(error) });
  }
});

/** ---------- Start server ---------- */
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
