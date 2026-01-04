A WhatsApp-based emergency assistance bot 

## Tech Stack

* Node.js
* Express.js
* Twilio WhatsApp API
* ngrok

---

## Prerequisites

* Node.js (v18+)
* npm
* Twilio account (Free)
* ngrok account

---

## Twilio Credentials Setup

### 1. Create Twilio Account

* Visit: [https://www.twilio.com/](https://www.twilio.com/)
* Sign up and log in

### 2. Get Account SID & Auth Token

* Open **Twilio Console Dashboard**
* Copy:

  * **Account SID**
  * **Auth Token**

### 3. Activate WhatsApp Sandbox

* Go to:
  `Messaging → Try it out → WhatsApp Sandbox`
* Join the sandbox by sending the given code to
  **+14155238886**

---

## Environment Variables

Create a `.env` file in the project root:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
PORT=3000
```

---

## Installation

```bash
npm install
```

---

## Run the Application

```bash
node index.js
```

Server runs on:

```
http://localhost:3000
```

---

## Expose Server Using ngrok

```bash
ngrok http 3000
```

Copy the generated HTTPS URL.

---

## Configure Twilio Webhook

* Go to **Twilio WhatsApp Sandbox Settings**
* Paste webhook URL:

```
https://<ngrok-url>/webhook
```

* Method: **POST**
* Save changes

---

## Sample Bot Flow

```


Tharani S
