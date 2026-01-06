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

const MessagingResponse = twilio.twiml.MessagingResponse;

// In-memory session store
const sessions = {};

// Emergency options
const EMERGENCY_TYPES = {
  "1": { name: "Medical Emergency", code: "MEDICAL" },
  "2": { name: "Fire Emergency", code: "FIRE" },
  "3": { name: "Crime or Safety Emergency", code: "CRIME" }
};

// Helpers
const generateEmergencyId = () =>
  "EMG-" + Math.floor(100000 + Math.random() * 900000);

const getInstructions = (code) => ({
  MEDICAL: "Stay calm and keep the patient stable.",
  FIRE: "Evacuate immediately and move to a safe area.",
  CRIME: "Go to a secure place and avoid confrontation."
}[code] || "");

// Webhook
app.post("/webhook", async (req, res) => {
  const from = req.body.From;
  const text = req.body.Body?.trim().toUpperCase();
  const { Latitude, Longitude } = req.body;

  if (!sessions[from]) sessions[from] = { stage: "START" };
  const session = sessions[from];
  let reply = "";

  try {
    if (session.stage === "START") {
      reply =
`Emergency Assistance System

Reply with:
1. Medical
2. Fire
3. Crime or Safety`;
      session.stage = "TYPE";
    }

    else if (session.stage === "TYPE") {
      if (!EMERGENCY_TYPES[text]) {
        reply = "Please reply with 1, 2, or 3.";
      } else {
        session.type = EMERGENCY_TYPES[text];
        session.id = generateEmergencyId();
        session.time = new Date();
        session.stage = "LOCATION";

        reply =
`You selected ${session.type.name}.

Share your live location
or
Type your address.`;
      }
    }

    else if (session.stage === "LOCATION") {
      session.location = Latitude && Longitude
        ? `${Latitude}, ${Longitude}`
        : req.body.Body;

      session.stage = "ACTIVE";

      reply =
`Emergency registered successfully.

ID: ${session.id}
Type: ${session.type.name}
ETA: About 10 minutes

${getInstructions(session.type.code)}

Commands:
STATUS – Check progress
CANCEL – Cancel request`;
    }

    else if (session.stage === "ACTIVE") {
      if (text === "STATUS") {
        reply =
`Status update:

ID: ${session.id}
Type: ${session.type.name}
Reported: ${session.time.toLocaleString()}
Status: Help is on the way.`;
      }
      else if (text === "CANCEL") {
        reply =
`Your emergency request has been cancelled.

ID: ${session.id}`;
        delete sessions[from];
      }
      else {
        reply = "Reply STATUS or CANCEL.";
      }
    }

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: reply
    });

    const twiml = new MessagingResponse();
    res.type("text/xml").send(twiml.toString());

  } catch (err) {
    console.error(err);
    res.type("text/xml").send(new MessagingResponse().toString());
  }
});

// Server
app.listen(3000, () =>
  console.log("Emergency WhatsApp Bot is running on port 3000")
);
