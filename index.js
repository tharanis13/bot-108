require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// MAIN WEBHOOK
app.post("/webhook", async (req, res) => {
  const from = req.body.From;
  const message = req.body.Body?.trim().toLowerCase();
  const latitude = req.body.Latitude;
  const longitude = req.body.Longitude;

  let reply = "";

  // STEP 1: HELP
  if (message === "help") {
    reply =
      "🚨 Emergency Assistance Service\n\n" +
      "Reply with:\n" +
      "1️⃣ Medical Emergency\n" +
      "2️⃣ Police Emergency\n" +
      "3️⃣ Fire Emergency";
  }

  // STEP 2: MEDICAL EMERGENCY
  else if (message === "1") {
    reply = "Please share your live location 📍";
  }

  // STEP 3: LOCATION RECEIVED
  else if (latitude && longitude) {
    reply =
      "✅ Location received.\n\n" +
      "Your emergency request has been forwarded to our response team.\n" +
      "Please stay calm.";

    // OPTIONAL: log location (for company team)
    console.log("EMERGENCY LOCATION:");
    console.log("From:", from);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
  }

  // STEP 4: THANKS
  else if (message === "thanks") {
    reply = "You're welcome 🙏 Our team will contact you shortly.";
  }

  // DEFAULT
  else {
    reply = "Please type *help* to start an emergency request.";
  }

  // SEND WHATSAPP MESSAGE
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: from,
    body: reply,
  });

  res.sendStatus(200);
});

// START SERVER
app.listen(3000, () => {
  console.log("🚑 bot_108 running on port 3000");
});
