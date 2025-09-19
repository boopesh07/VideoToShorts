#!/usr/bin/env node

const axios = require("axios");
require("dotenv").config({ path: ".env.local" });

async function testAPI() {
	console.log("🔍 Testing Gladia API...\n");

	const apiKey = process.env.GLADIA_API_KEY;
	const apiUrl = process.env.GLADIA_API_URL || "https://api.gladia.io/v2";

	if (!apiKey) {
		console.error("❌ Missing GLADIA_API_KEY in .env.local");
		process.exit(1);
	}

	console.log("✅ API key found");

	const headers = {
		"x-gladia-key": apiKey,
		"Content-Type": "application/json",
	};

	const payload = {
		audio_url:
			"http://files.gladia.io/example/audio-transcription/split_infinity.wav",
		detect_language: true,
		language: "en",
	};

	try {
		const response = await axios.post(`${apiUrl}/pre-recorded`, payload, {
			headers,
		});

		console.log("✅ API request successful");
		console.log(`📋 Transcription ID: ${response.data.id}`);

		// Check status after 3 seconds
		setTimeout(async () => {
			try {
				const result = await axios.get(
					`${apiUrl}/pre-recorded/${response.data.id}`,
					{ headers },
				);
				console.log(`⏳ Status: ${result.data.status}`);
			} catch (err) {
				console.log(
					"ℹ️ Status check failed (transcription may still be processing)",
				);
			}
		}, 3000);
	} catch (error) {
		console.error("❌ API request failed");
		console.error(`Status: ${error.response?.status || "Unknown"}`);
		console.error(`Message: ${error.response?.data?.message || error.message}`);
		process.exit(1);
	}
}

testAPI();
