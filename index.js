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

// Health database
const HEALTH_KB = {
  // Diseases information
  diseases: {
    "DENGUE": {
      name: "Dengue Fever",
      symptoms: ["High fever", "Severe headache", "Pain behind eyes", "Joint/muscle pain", "Rash"],
      prevention: ["Use mosquito repellent", "Wear long sleeves", "Eliminate standing water", "Use mosquito nets"],
      treatment: "Rest, hydration, paracetamol for fever (avoid aspirin). See doctor immediately.",
      emergency: "If you have severe abdominal pain, persistent vomiting, bleeding gums, or fatigue."
    },
    "MALARIA": {
      name: "Malaria",
      symptoms: ["Fever", "Chills", "Sweating", "Headache", "Nausea", "Fatigue"],
      prevention: ["Use insecticide-treated bed nets", "Indoor residual spraying", "Take antimalarial medication if traveling"],
      treatment: "Prescription antimalarial drugs. Type depends on malaria species.",
      emergency: "High fever, convulsions, confusion, or severe anemia."
    },
    "COVID": {
      name: "COVID-19",
      symptoms: ["Fever", "Dry cough", "Fatigue", "Loss of taste/smell", "Shortness of breath"],
      prevention: ["Wear masks", "Practice social distancing", "Wash hands frequently", "Get vaccinated"],
      treatment: "Rest, isolation, hydration. Severe cases need hospitalization.",
      emergency: "Difficulty breathing, chest pain, confusion, inability to stay awake."
    },
    "DIABETES": {
      name: "Diabetes",
      symptoms: ["Increased thirst", "Frequent urination", "Extreme hunger", "Unexplained weight loss", "Fatigue"],
      prevention: ["Maintain healthy weight", "Eat balanced diet", "Exercise regularly", "Monitor blood sugar"],
      treatment: "Medication, insulin therapy, diet control, regular monitoring.",
      emergency: "High/low blood sugar symptoms: confusion, rapid breathing, fruity-smelling breath, loss of consciousness."
    }
  },
  
  // Symptoms advice
  symptoms: {
    "FEVER": {
      advice: "Rest, drink plenty of fluids, take paracetamol if needed. See doctor if fever lasts more than 3 days or is above 103°F.",
      emergency: "Fever with stiff neck, rash, severe headache, or confusion."
    },
    "COUGH": {
      advice: "Stay hydrated, use honey in warm water, avoid cold drinks. See doctor if coughing blood or lasts more than 3 weeks.",
      emergency: "Coughing blood, severe shortness of breath, chest pain."
    },
    "HEADACHE": {
      advice: "Rest in a dark room, cold compress, stay hydrated. Avoid triggers like stress, certain foods.",
      emergency: "Sudden severe headache, headache with fever/stiff neck, confusion, vision changes."
    },
    "DIARRHEA": {
      advice: "Drink ORS solution, eat bananas/rice/applesauce/toast (BRAT diet), avoid dairy/fatty foods.",
      emergency: "Severe dehydration (dry mouth, no tears, sunken eyes), blood in stool, fever above 102°F."
    }
  },
  
  // Vaccine schedules
  vaccines: {
    "CHILD": "📋 Child Vaccine Schedule:\n• Birth: BCG, Hepatitis B-1, OPV-0\n• 6 weeks: DPT-1, Hepatitis B-2, IPV-1\n• 10 weeks: DPT-2, IPV-2\n• 14 weeks: DPT-3, IPV-3\n• 9-12 months: Measles/MR-1\n• 16-24 months: DPT booster",
    "ADULT": "📋 Adult Vaccines:\n• Td/Tdap: Every 10 years\n• Influenza: Yearly\n• COVID-19: As per guidelines\n• Pneumococcal: 65+ years\n• Shingles: 50+ years",
    "COVID": "💉 COVID-19 Vaccine:\n• Primary: 2 doses, 4-8 weeks apart\n• Booster: 6 months after primary\n• Additional boosters for high-risk groups\n• Ages 5+ (check local guidelines)"
  },
  
  // Languages
  languages: {
    "1": { code: "EN", name: "English" },
    "2": { code: "HI", name: "Hindi" },
    "3": { code: "TA", name: "Tamil" }
  },
  
  // Language-specific responses
  translations: {
    "HI": {
      welcome: "👋 सार्वजनिक स्वास्थ्य सहायक में आपका स्वागत है!\n\nमैं आपकी मदद कर सकता हूं:\n1. लक्षण जांच\n2. बीमारी की जानकारी\n3. टीकाकरण अनुसूची\n4. रोकथाम सलाह\n\nअपना विकल्प चुनें (1-4):",
      disclaimer: "⚠️ अस्वीकरण: यह सामान्य स्वास्थ्य जानकारी है। चिकित्सीय सलाह के लिए हमेशा डॉक्टर से परामर्श करें।",
      emergency: "🆘 तत्काल मदद के लिए कृपया नजदीकी अस्पताल जाएं या 108/112 पर कॉल करें।"
    },
    "TA": {
      welcome: "👋 பொது சுகாதார உதவியாளருக்கு வரவேற்கிறோம்!\n\nநான் உங்களுக்கு உதவ முடியும்:\n1. அறிகுறி சோதனை\n2. நோய் தகவல்\n3. தடுப்பூசி அட்டவணை\n4. தடுப்பு ஆலோசனை\n\nஉங்கள் தேர்வைத் தேர்ந்தெடுக்கவும் (1-4):",
      disclaimer: "⚠️ மறுப்பு: இது பொது சுகாதார தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு எப்போதும் மருத்துவரை அணுகவும்.",
      emergency: "🆘 உடனடி உதவிக்கு அருகிலுள்ள மருத்துவமனைக்கு செல்லவும் அல்லது 108/112 ஐ அழைக்கவும்."
    }
  }
};

// Helpers
const getWelcomeMessage = (lang = "EN") => {
  if (lang === "HI") return HEALTH_KB.translations.HI.welcome;
  if (lang === "TA") return HEALTH_KB.translations.TA.welcome;
  
  return `👋 Welcome to Public Health Assistant!

I can help you with:
1. Symptom Check
2. Disease Information
3. Vaccine Schedule
4. Prevention Advice

Choose your option (1-4):`;
};

const getDisclaimer = (lang = "EN") => {
  if (lang === "HI") return HEALTH_KB.translations.HI.disclaimer;
  if (lang === "TA") return HEALTH_KB.translations.TA.disclaimer;
  
  return "⚠️ DISCLAIMER: I provide general health information only. Always consult a doctor for medical advice.";
};

const getEmergencyMessage = (lang = "EN") => {
  if (lang === "HI") return HEALTH_KB.translations.HI.emergency;
  if (lang === "TA") return HEALTH_KB.translations.TA.emergency;
  
  return "🆘 For immediate help, please go to nearest hospital or call 108/112.";
};

const formatDiseaseInfo = (disease, lang = "EN") => {
  const info = HEALTH_KB.diseases[disease];
  if (!info) return `Information not available for ${disease}.`;
  
  return `📋 ${info.name}

🔍 Symptoms:
${info.symptoms.map(s => `• ${s}`).join('\n')}

🛡️ Prevention:
${info.prevention.map(p => `• ${p}`).join('\n')}

💊 Treatment: ${info.treatment}

${getDisclaimer(lang)}`;
};

const formatSymptomAdvice = (symptom, lang = "EN") => {
  const info = HEALTH_KB.symptoms[symptom];
  if (!info) return `Advice not available for ${symptom}.`;
  
  return `🤒 ${symptom.charAt(0) + symptom.slice(1).toLowerCase()}:

💡 Advice: ${info.advice}

${getDisclaimer(lang)}`;
};

// Webhook handler
app.post("/webhook", async (req, res) => {
  const from = req.body.From;
  const text = req.body.Body?.trim().toUpperCase();
  
  // Initialize session if not exists
  if (!sessions[from]) {
    sessions[from] = { 
      stage: "WELCOME", 
      language: "EN",
      history: []
    };
  }
  
  const session = sessions[from];
  let reply = "";
  
  try {
    // Record message in history
    session.history.push({
      time: new Date().toISOString(),
      user: text,
      stage: session.stage
    });
    
    // Check for emergency keywords
    const emergencyKeywords = ["EMERGENCY", "HELP", "URGENT", "CRITICAL", "911", "108", "112"];
    if (emergencyKeywords.some(keyword => text.includes(keyword))) {
      reply = `🆘 EMERGENCY ALERT!\n\n${getEmergencyMessage(session.language)}\n\nYour location has been shared with nearby hospitals.\n\nStay on the line, help is on the way.`;
      session.stage = "EMERGENCY";
      
      // In production, this would trigger actual emergency response
      console.log(`EMERGENCY ALERT from ${from}: ${text}`);
    }
    
    // Main conversation flow
    else if (session.stage === "WELCOME") {
      reply = `🌍 Choose your language:\n\n1. English\n2. Hindi\n3. Tamil\n\nReply with 1, 2, or 3:`;
      session.stage = "LANGUAGE";
    }
    
    else if (session.stage === "LANGUAGE") {
      if (!HEALTH_KB.languages[text]) {
        reply = "Please choose language:\n1. English\n2. Hindi\n3. Tamil";
      } else {
        session.language = HEALTH_KB.languages[text].code;
        reply = getWelcomeMessage(session.language);
        session.stage = "MAIN_MENU";
      }
    }
    
    else if (session.stage === "MAIN_MENU") {
      switch(text) {
        case "1":
          reply = `🤒 Symptom Check\n\nWhat symptoms are you experiencing?\n(Example: fever, cough, headache)\n\nOr type BACK to return to menu.`;
          session.stage = "SYMPTOM_CHECK";
          break;
          
        case "2":
          reply = `📋 Disease Information\n\nWhich disease would you like to know about?\n\nAvailable: DENGUE, MALARIA, COVID, DIABETES\n\nOr type BACK to return to menu.`;
          session.stage = "DISEASE_INFO";
          break;
          
        case "3":
          reply = `💉 Vaccine Information\n\nFor which category?\n\n1. Child Vaccines\n2. Adult Vaccines\n3. COVID Vaccine\n\nOr type BACK to return to menu.`;
          session.stage = "VACCINE_MENU";
          break;
          
        case "4":
          reply = `🛡️ Prevention Advice\n\nWhat would you like to prevent?\n\n1. Mosquito-borne diseases\n2. Respiratory diseases\n3. Lifestyle diseases\n\nOr type BACK to return to menu.`;
          session.stage = "PREVENTION_MENU";
          break;
          
        default:
          reply = getWelcomeMessage(session.language);
      }
    }
    
    else if (session.stage === "SYMPTOM_CHECK") {
      if (text === "BACK") {
        reply = getWelcomeMessage(session.language);
        session.stage = "MAIN_MENU";
      } else {
        // Check for known symptoms
        const symptoms = text.split(/[, ]+/).filter(s => s.length > 2);
        const knownSymptoms = symptoms.filter(s => 
          Object.keys(HEALTH_KB.symptoms).some(key => 
            key.includes(s) || s.includes(key)
          )
        );
        
        if (knownSymptoms.length > 0) {
          const symptom = knownSymptoms[0];
          const symptomKey = Object.keys(HEALTH_KB.symptoms).find(key => 
            key.includes(symptom) || symptom.includes(key)
          );
          
          reply = formatSymptomAdvice(symptomKey, session.language);
          
          // Check if emergency advice needed
          const emergencyInfo = HEALTH_KB.symptoms[symptomKey]?.emergency;
          if (emergencyInfo && symptoms.some(s => ["SEVERE", "HIGH", "INTENSE"].includes(s))) {
            reply += `\n\n${getEmergencyMessage(session.language)}`;
          }
        } else {
          reply = `I can help with symptoms like: FEVER, COUGH, HEADACHE, DIARRHEA\n\nPlease describe your symptoms:\n(Or type BACK to return to menu)`;
        }
        
        reply += `\n\n🔁 Type another symptom or BACK to menu.`;
      }
    }
    
    else if (session.stage === "DISEASE_INFO") {
      if (text === "BACK") {
        reply = getWelcomeMessage(session.language);
        session.stage = "MAIN_MENU";
      } else if (HEALTH_KB.diseases[text]) {
        reply = formatDiseaseInfo(text, session.language);
        reply += `\n\n🔁 Type another disease or BACK to menu.`;
      } else {
        reply = `Available diseases: DENGUE, MALARIA, COVID, DIABETES\n\nType the disease name or BACK to menu.`;
      }
    }
    
    else if (session.stage === "VACCINE_MENU") {
      if (text === "BACK") {
        reply = getWelcomeMessage(session.language);
        session.stage = "MAIN_MENU";
      } else {
        switch(text) {
          case "1":
            reply = HEALTH_KB.vaccines.CHILD;
            break;
          case "2":
            reply = HEALTH_KB.vaccines.ADULT;
            break;
          case "3":
            reply = HEALTH_KB.vaccines.COVID;
            break;
          default:
            reply = `Please choose:\n1. Child Vaccines\n2. Adult Vaccines\n3. COVID Vaccine\n\nOr type BACK to menu.`;
        }
        
        if (["1", "2", "3"].includes(text)) {
          reply += `\n\n${getDisclaimer(session.language)}`;
          reply += `\n\n🔁 Type another option or BACK to menu.`;
        }
      }
    }
    
    else if (session.stage === "PREVENTION_MENU") {
      if (text === "BACK") {
        reply = getWelcomeMessage(session.language);
        session.stage = "MAIN_MENU";
      } else {
        switch(text) {
          case "1":
            reply = `🦟 Mosquito-borne Disease Prevention:\n\n• Use mosquito nets while sleeping\n• Apply insect repellent\n• Wear long sleeves and pants\n• Eliminate standing water\n• Install window screens`;
            break;
          case "2":
            reply = `😷 Respiratory Disease Prevention:\n\n• Wear masks in crowded places\n• Wash hands frequently\n• Maintain social distance\n• Get vaccinated\n• Cover coughs and sneezes`;
            break;
          case "3":
            reply = `🥗 Lifestyle Disease Prevention:\n\n• Maintain healthy weight\n• Eat balanced diet (fruits, vegetables)\n• Exercise 30 mins daily\n• Avoid smoking/alcohol\n• Regular health checkups`;
            break;
          default:
            reply = `Choose:\n1. Mosquito-borne diseases\n2. Respiratory diseases\n3. Lifestyle diseases\n\nOr type BACK to menu.`;
        }
        
        if (["1", "2", "3"].includes(text)) {
          reply += `\n\n${getDisclaimer(session.language)}`;
          reply += `\n\n🔁 Type another option or BACK to menu.`;
        }
      }
    }
    
    else if (session.stage === "EMERGENCY") {
      reply = `🆘 Emergency mode active.\n\n${getEmergencyMessage(session.language)}\n\nHelp has been alerted. Stay where you are.\n\nType OK to return to health assistant.`;
      
      if (text === "OK") {
        session.stage = "MAIN_MENU";
        reply = getWelcomeMessage(session.language);
      }
    }
    
    // Default fallback
    if (!reply) {
      reply = `I didn't understand that. ${getWelcomeMessage(session.language)}`;
      session.stage = "MAIN_MENU";
    }
    
    // Add disclaimer for all health-related responses
    if (!reply.includes("DISCLAIMER") && session.stage !== "WELCOME" && session.stage !== "LANGUAGE") {
      reply += `\n\n${getDisclaimer(session.language)}`;
    }
    
    // Send reply via Twilio
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: reply
    });

    // Send empty TwiML response
    const twiml = new MessagingResponse();
    res.type("text/xml").send(twiml.toString());

  } catch (err) {
    console.error("Error processing message:", err);
    
    // Send error message to user
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: "Sorry, I'm having trouble. Please try again in a moment."
      });
    } catch (sendErr) {
      console.error("Failed to send error message:", sendErr);
    }
    
    const twiml = new MessagingResponse();
    res.type("text/xml").send(twiml.toString());
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Public Health WhatsApp Bot",
    activeSessions: Object.keys(sessions).length,
    uptime: process.uptime()
  });
});

// Admin endpoint to view sessions (for debugging)
app.get("/sessions", (req, res) => {
  res.json({
    totalSessions: Object.keys(sessions).length,
    sessions: Object.entries(sessions).map(([number, session]) => ({
      number,
      stage: session.stage,
      language: session.language,
      history: session.history
    }))
  });
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Health WhatsApp Bot running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Sessions view: http://localhost:${PORT}/sessions`);
});

// Auto-cleanup old sessions every hour
setInterval(() => {
  const now = Date.now();
  const cutoff = 60 * 60 * 1000; // 1 hour
  
  Object.keys(sessions).forEach(number => {
    const session = sessions[number];
    const lastActivity = session.history.length > 0 
      ? new Date(session.history[session.history.length - 1].time).getTime()
      : now;
    
    if (now - lastActivity > cutoff) {
      delete sessions[number];
      console.log(`Cleaned up old session for ${number}`);
    }
  });
}, 60 * 60 * 1000);
