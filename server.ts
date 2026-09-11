import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with high limit for image scanning
  app.use(express.json({ limit: "20mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint for Google Lens / Camera OCR Answer Sheet Scanner
  app.post("/api/ocr-key", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Strip data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `You are an expert exam scanner, similar to Google Lens for test sheets and answer keys.
Look at this image of an exam answer key, answer sheet, printed answers, or handwritten options (e.g. "1.1", "2.C", "3.2", "4.1", "1 A 2 B", "1-A 2-B", or table/columns of answers).

Extract every question number and its corresponding answer option.
Rules:
1. If options are numeric (1, 2, 3, 4, 5):
   1 -> A
   2 -> B
   3 -> C
   4 -> D
   5 -> E
2. If options are letters (A, B, C, D, etc.), retain uppercase letters.
3. If format is "1.1, 2.C, 3.2, 4.1", then:
   Question 1 has answer A (option 1)
   Question 2 has answer C
   Question 3 has answer B (option 2)
   Question 4 has answer A (option 1)
4. Ignore any question descriptions or header words (e.g. "(d) deleterious", headings, student name).
5. Output ONLY a valid JSON array of objects:
[
  {"question": 1, "answer": "A"},
  {"question": 2, "answer": "C"},
  {"question": 3, "answer": "B"}
]
Do not wrap in markdown or backticks. Return raw JSON.`
              },
            ],
          },
        ],
      });

      const rawText = response.text || "";
      const jsonStr = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      let parsed: { question: number; answer: string }[] = [];

      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Fallback regex parsing
        const regex = /"question":\s*(\d+),\s*"answer":\s*"([A-Ja-j1-8])"/g;
        let m;
        while ((m = regex.exec(jsonStr)) !== null) {
          const qNum = parseInt(m[1], 10);
          let ans = m[2].toUpperCase();
          if (ans === "1") ans = "A";
          else if (ans === "2") ans = "B";
          else if (ans === "3") ans = "C";
          else if (ans === "4") ans = "D";
          parsed.push({ question: qNum, answer: ans });
        }
      }

      // Sort questions sequentially
      const sorted = parsed.sort((a, b) => a.question - b.question);
      const formattedPairs = sorted.map((item) => `${item.question} ${item.answer.toUpperCase()}`).join(" ");

      return res.json({
        success: true,
        pairs: sorted,
        formattedString: formattedPairs,
        count: sorted.length,
      });
    } catch (err: any) {
      console.error("OCR scan error:", err);
      return res.status(500).json({
        error: err?.message || "Failed to process image with AI scanner",
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
