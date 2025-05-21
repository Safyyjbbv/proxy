// Hapus baris ini:
// const fs = require("fs");
// const CONFIG_FILE = "config.json";

// Tambahkan ini di paling atas server.js, sebelum `const app = express();`
require('dotenv').config(); // Memuat variabel dari .env ke process.env (hanya untuk lokal)

process.noDeprecation = true;

const express = require("express");
const path = require("path");
// const fs = require("fs"); // Hapus baris ini

const app = express();
// const CONFIG_FILE = "config.json"; // Hapus baris ini

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Hapus fungsi loadApiKey dan saveApiKey
// const loadApiKey = () => { /* ... */ };
// const saveApiKey = (apiKey) => { /* ... */ };

// Hapus fungsi promptForApiKey sepenuhnya
// const promptForApiKey = async () => { /* ... */ };


app.post("/api/generate", async (req, res) => {
    const prompt = req.body.prompt || "Write a story about a magical bag.";
    // Ambil API Key dari process.env
    const apiKey = process.env.GEMINI_API_KEY; // <-- INI YANG PENTING

    if (!apiKey) {
        // Pesan error yang lebih jelas
        return res.status(500).json({ error: "Gemini API Key not configured!" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        const data = await response.json();

        // Tambahan: cek jika ada error dari API Gemini itu sendiri
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.status(data.error.code || 500).json({ error: data.error.message || "Error from Gemini API." });
        }


        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const generatedText = data.candidates[0].content.parts[0].text;
            res.json({ response: generatedText });
        } else {
            res.status(400).json({ error: "No results found or unexpected response format from Gemini." });
        }
    } catch (err) {
        console.error("Error during API call to Gemini:", err); // Pesan log lebih detail
        res.status(500).json({ error: "Server error occurred when trying to connect to Gemini." });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Ganti bagian initializeServer
const initializeServer = async () => {
    // console.clear(); // Hapus ini, tidak berguna di server
    // let apiKey = loadApiKey(); // Hapus ini

    // if (!apiKey) { // Hapus ini
    //     apiKey = await promptForApiKey(); // Hapus ini
    // }

    // Gunakan process.env.PORT yang disediakan Vercel, fallback ke 3000 untuk lokal
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log("=======================================");
        console.log("            GEMINI AI TOOLS            ");
        console.log("=======================================");
        console.log(`Server is running at: http://localhost:${PORT}`); // Log port yang digunakan
        console.log("Use this tool to generate AI content.\n");
        console.log("API Key Source: Environment Variable"); // Indikasi sumber API Key
    });
};

initializeServer();
