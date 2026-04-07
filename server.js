const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static('public')); 

const GSHEET_WEBHOOK_URL = process.env.GSHEET_WEBHOOK_URL;
// This array holds the chat history in memory for index.html
const messagesLog = [];

// WhatsApp Webhook Verification
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// Route for the frontend (index.html) to fetch the history
app.get("/messages", (req, res) => {
  res.json(messagesLog);
});

// Route for manual replies from the admin panel (index.html)
app.post("/reply", async (req, res) => {
  const { number, replyMessage } = req.body;
  const phoneId = process.env.PHONE_NUMBER_ID; 

  try {
    await axios.post(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      messaging_product: "whatsapp",
      to: number,
      type: "text",
      text: { body: replyMessage }
    }, { 
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } 
    });
    
    // Log the sent message in the UI
    messagesLog.push({
      name: "Admin",
      number: number,
      message: replyMessage,
      replyStatus: "sent",
      timestamp: Date.now()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receive messages from WhatsApp
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Acknowledge Meta immediately to prevent retries

  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) return; // Ignore read receipts / status updates

  const phone = message.from;
  const userMessage = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "[Media/Other Message]";
  const userName = value.contacts?.[0]?.profile?.name || "Guest";
  const timestampString = new Date().toLocaleString();

  // 1. Log the incoming message IMMEDIATELY to show up in index.html
  messagesLog.push({ 
    name: userName, 
    number: phone, 
    message: userMessage, 
    replyStatus: "received", 
    timestamp: Date.now()
  });

  // 2. Send to Google Sheets
  if (GSHEET_WEBHOOK_URL) {
    try {
      await axios.post(GSHEET_WEBHOOK_URL, {
        action: "webhook_log",
        timestamp: timestampString,
        name: userName,
        phone: phone,
        message: userMessage
      });
      console.log(`Logged message from ${userName} to Google Sheets`);
    } catch (err) {
      console.error("WEBHOOK GOOGLE SHEETS ERROR:", err.message);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));