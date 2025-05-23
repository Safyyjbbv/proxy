// server.js

require('dotenv').config(); 

process.noDeprecation = true; 

const express = require("express");
const path = require("path");
const fetch = require("node-fetch"); 

const app = express();

app.use(express.json()); 
app.use(express.static(path.join(__dirname, "public"))); 

const loadApiKey = () => {
    return process.env.GOOGLE_API_KEY || null;
};

const promptForApiKey = async () => {
    const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        console.log("\nAPI Key not found in .env file!");
        readline.question("Get your API Key at: https://aistudio.google.com/app/apikey\nPlease create a '.env' file in your project root and add: GOOGLE_API_KEY=YOUR_API_KEY_HERE\nPress Enter after you've set the API Key in .env to continue...", () => {
            readline.close();
            let retriedApiKey = loadApiKey();
            if (retriedApiKey) {
                console.log("\n✓ API Key loaded successfully from .env!\n");
                resolve(retriedApiKey);
            } else {
                console.error("\nError: API Key still not found in .env. Please ensure it's set correctly.");
                process.exit(1); 
            }
        });
    });
};

// Endpoint untuk generate konten AI
app.post("/api/generate", async (req, res) => {
    const { prompt, history } = req.body; // Menerima prompt DAN history dari client
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Server error: API Key not set. Please restart the server after setting it." });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Bangun array 'contents' untuk API request
    const contents = [];
    if (history && Array.isArray(history)) {
        contents.push(...history); // Tambahkan riwayat chat yang diterima dari client
    }
    // Tambahkan prompt pengguna saat ini
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: contents, // Kirim seluruh array contents ke Gemini API
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            // Tambahkan penanganan untuk "safety settings" jika ada
            if (data.error.details && data.error.details.find(d => d['@type'] && d['@type'].includes('google.rpc.Bad request') && d.reason === 'SAFETY')) {
                return res.status(400).json({ error: "Content violated safety policies. Please try a different query." });
            }
            return res.status(data.error.code || 500).json({ error: data.error.message || "Error from Gemini API." });
        }

        let generatedText = "No response generated.";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            generatedText = data.candidates[0].content.parts[0].text;
        } else {
            // Periksa jika ada 'promptFeedback' yang mengindikasikan masalah keamanan
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                return res.status(400).json({ error: `Content blocked due to safety concerns: ${data.promptFeedback.blockReason}` });
            }
            return res.status(400).json({ error: "No results found or content could not be generated." });
        }

        res.json({ response: generatedText });

    } catch (err) {
        console.error("Error during API request:", err);
        res.status(500).json({ error: "Server error occurred during content generation." });
    }
});

// Endpoint untuk melayani file index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Inisialisasi server
const initializeServer = async () => {
    console.clear(); 
    let apiKey = loadApiKey();

    if (!apiKey) {
        apiKey = await promptForApiKey();
    }

    app.listen(3000, () => {
        console.log("=======================================");
        console.log("            GEMINI AI TOOLS            ");
        console.log("=======================================");
        console.log("Server is running at: http://localhost:3000");
        console.log("Use this tool to generate AI content.\n");
    });
};

initializeServer();
