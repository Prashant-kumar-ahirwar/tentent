import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Universal JSON response parser that extracts JSON safely even if wrapped
 * in markdown fences or surrounding chatter.
 */
function extractJsonFromText(rawText: string): any {
  if (!rawText) return {};
  
  const trimmed = rawText.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Remove markdown code blocks (```json ... ``` or ``` ...)
  try {
    const withoutCodeBlocks = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(withoutCodeBlocks);
  } catch {}

  // 3. Regex match first balanced {...} or [...]
  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  return { rawText: trimmed };
}

/**
 * Resolve the API key from various possible environment variable names
 */
function getActiveAiCredentials() {
  const groqKey = 
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GROQ_KEY?.trim() ||
    process.env.VITE_GROQ_API_KEY?.trim() ||
    (process.env.GEMINI_API_KEY?.trim()?.startsWith("gsk_") ? process.env.GEMINI_API_KEY.trim() : null) ||
    (process.env.API_KEY?.trim()?.startsWith("gsk_") ? process.env.API_KEY.trim() : null);

  const geminiKey = 
    (process.env.GEMINI_API_KEY?.trim() && !process.env.GEMINI_API_KEY.trim().startsWith("gsk_"))
      ? process.env.GEMINI_API_KEY.trim()
      : null;

  return { groqKey, geminiKey };
}

/**
 * Universal AI Completion Engine:
 * Uses Groq SDK first (llama-3.3-70b-versatile, llama-3.1-8b-instant) or Gemini SDK fallback.
 */
async function callAi(prompt: string, systemPrompt = "You are a professional financial assistant for Kiraya Bahi rental ledger. Always output valid JSON conforming to the requested schema."): Promise<any> {
  const { groqKey, geminiKey } = getActiveAiCredentials();

  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey });
    const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"];
    let lastGroqError: any = null;

    for (const model of modelsToTry) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model,
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const textOutput = chatCompletion.choices[0]?.message?.content || "";
        return extractJsonFromText(textOutput);
      } catch (err: any) {
        console.warn(`Groq model ${model} error:`, err?.message || err);
        lastGroqError = err;
        // Try fallback Groq model if one fails
        continue;
      }
    }

    throw new Error(lastGroqError?.message || "Groq request failed across all models");
  }

  if (geminiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `${systemPrompt}\n\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    return extractJsonFromText(response.text || "{}");
  }

  throw new Error("No AI API key found. Please provide your GROQ_API_KEY in the environment settings.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enforce JSON parsing
  app.use(express.json());

  // Set default JSON headers on all /api routes
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    const { groqKey, geminiKey } = getActiveAiCredentials();
    res.json({ 
      status: "ok", 
      hasAiKey: !!(groqKey || geminiKey),
      provider: groqKey ? "Groq (Llama 3.3)" : geminiKey ? "Google Gemini" : "None configured"
    });
  });

  // 1. AI Monthly Financial Insights Endpoint
  app.post("/api/ai/monthly-insights", async (req, res) => {
    try {
      const { month, expected, collected, pending, collectionPercentage, unitBreakdown } = req.body;

      const prompt = `Analyze the following rental revenue data for the month of "${month}" in Kiraya Bahi rental ledger:

- Total Expected Revenue: ₹${expected}
- Total Collected: ₹${collected}
- Remaining Pending Dues: ₹${pending}
- Collection Rate: ${collectionPercentage}%
- Unit Breakdown (${unitBreakdown?.length || 0} units with entries):
${JSON.stringify(unitBreakdown, null, 2)}

Provide a concise, practical, and structured financial summary in JSON format matching this exact schema:
{
  "headline": "A short 1-line executive summary of the month's cash flow (e.g. Strong 85% collection rate with ₹3,200 pending across 2 units)",
  "healthScore": 8,
  "keyObservations": [
    "Brief point 1 about compliance or electricity usage",
    "Brief point 2 about pending balance trends"
  ],
  "actionableRecommendations": [
    "Actionable step 1 for landlord",
    "Actionable step 2 for landlord"
  ]
}`;

      const insights = await callAi(
        prompt,
        "You are an expert Indian rental property financial auditor. Return valid JSON only with keys: headline, healthScore (1-10 integer), keyObservations (array of strings), and actionableRecommendations (array of strings)."
      );

      return res.json({ success: true, insights });
    } catch (error: any) {
      console.error("AI Monthly Insights Error:", error);
      return res.status(200).json({ 
        success: false, 
        error: error.message || "Failed to generate AI insights with Groq" 
      });
    }
  });

  // 2. AI Custom WhatsApp / SMS Reminder Generator
  app.post("/api/ai/generate-reminder", async (req, res) => {
    try {
      const { roomName, tenantName, month, totalBill, amountPaid, balanceDue, dueDate, tone, language } = req.body;

      const prompt = `Write a rental payment reminder message for an Indian landlord using Kiraya Bahi app.
Details:
- Room: ${roomName}
- Tenant Name: ${tenantName || "Tenant"}
- Month: ${month}
- Total Bill: ₹${totalBill}
- Amount Paid: ₹${amountPaid || 0}
- Balance Due to Pay: ₹${balanceDue}
- Due Date: ${dueDate || "Immediate"}
- Requested Tone: ${tone || "Polite"} (e.g., Polite, Professional, Firm, Urgent)
- Requested Language: ${language || "Hinglish"} (e.g., English, Hindi, Hinglish)

Important Instructions:
- Do NOT include complicated meter reading numbers (e.g. previous/current meter values). Just specify the electric bill, room rent, and the total amount to pay.
- Clearly tell the tenant the exact remaining amount to pay and provide a polite UPI/Cash payment call to action.

Return ONLY valid JSON matching this schema:
{
  "whatsappText": "Formatted WhatsApp message with emojis, line breaks, bold headers (*text*), polite Indian greetings (Namaste / Pranam), itemized dues (Room Rent, Electric Bill, Amount to Pay), and clear UPI/cash call to action.",
  "smsText": "Concise SMS version under 160 characters."
}`;

      const result = await callAi(
        prompt,
        "You are a rental assistant. Return valid JSON only with keys 'whatsappText' and 'smsText'."
      );

      return res.json({ success: true, result });
    } catch (error: any) {
      console.error("AI Reminder Generation Error:", error);
      return res.status(200).json({ 
        success: false, 
        error: error.message || "Failed to generate reminder" 
      });
    }
  });

  // 3. AI Smart Bill / Note Parser
  app.post("/api/ai/parse-bill-note", async (req, res) => {
    try {
      const { rawText, currentRate, defaultRent, lastMeter } = req.body;

      const prompt = `Extract rental ledger bill entry fields from this rough note or voice transcript entered by an Indian landlord:
"${rawText}"

Context defaults if not mentioned:
- Electricity rate per unit: ₹${currentRate || 8}
- Default base rent: ₹${defaultRent || 5000}
- Previous meter reading: ${lastMeter || 0}

Extract and calculate the fields into clean JSON:
{
  "month": "string (e.g. October 2026, or current month if unspecified)",
  "rent": number (rent amount),
  "prevMeter": number (previous meter reading),
  "meter": number (current meter reading),
  "units": number (meter - prevMeter, or 0),
  "rate": number (rate per unit),
  "elec": number (units * rate),
  "paid": number (amount already paid by tenant),
  "paymentMethod": "Cash" | "UPI" | "Bank Transfer" | "Cheque" | "",
  "dueDate": "YYYY-MM-DD" or "",
  "note": "short clean summary or remark"
}`;

      const parsed = await callAi(
        prompt,
        "You are a data extractor for rental passbooks. Output strictly valid JSON matching the specified ledger fields."
      );

      return res.json({ success: true, parsed });
    } catch (error: any) {
      console.error("AI Bill Parser Error:", error);
      return res.status(200).json({ 
        success: false, 
        error: error.message || "Failed to parse note" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kiraya Bahi server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
