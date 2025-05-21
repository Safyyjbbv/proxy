// server.js

require('dotenv').config();

process.noDeprecation = true;

const express = require("express");
const path = require("path");
const cors = require('cors');

const app = express();

app.use(express.json()); // Middleware untuk parsing body JSON
app.use(express.static(path.join(__dirname, "public"))); // Melayani file statis dari folder 'public'
app.use(cors()); // Mengizinkan semua origin untuk development, bisa diatur lebih spesifik nanti

app.post("/api/generate", async (req, res) => {
    // req.body.history akan berisi array objek history dari frontend
    // Ini sekarang mencakup teks dan/atau gambar
    const history = req.body.history || [];

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: Gemini API Key not configured!");
        return res.status(500).json({ error: "Gemini API Key not configured on the server." });
    }

    // `history` dari frontend sudah dalam format yang bisa langsung digunakan oleh Gemini
    // yaitu array of { role: "user" / "model", parts: [{text: "..."}] atau [{inlineData: {mimeType: "...", data: "..."}}] }
    const contents = history; // Menggunakan history yang diterima langsung

    // Sesuaikan model Gemini yang mendukung multimodal.
    // Gemini 1.5 Pro atau 1.5 Flash direkomendasikan untuk ini.
    // Periksa dokumentasi Gemini AI Studio untuk model terbaru.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; // Contoh: Menggunakan 1.5-flash

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents, // Mengirimkan seluruh history (termasuk gambar jika ada)
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            // Memberikan error yang lebih informatif kepada frontend
            return res.status(data.error.code || 500).json({ error: data.error.message || "Error from Gemini API." });
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const generatedText = data.candidates[0].content.parts[0].text;
            res.json({ response: generatedText });
        } else {
            console.error("Gemini API: No results found or unexpected response format.", data);
            res.status(400).json({ error: "No response from Gemini or unexpected format." });
        }
    } catch (err) {
        console.error("Error during API call to Gemini:", err);
        res.status(500).json({ error: "Server error occurred when connecting to Gemini API." });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const initializeServer = async () => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log("=======================================");
        console.log("            GEMINI AI TOOLS            ");
        console.log("=======================================");
        console.log(`Server is running at: http://localhost:${PORT}`);
        console.log("Use this tool to generate AI content.\n");
        console.log("API Key Source: Environment Variable (for deployment) or .env (for local development)");
    });
};

initializeServer();
