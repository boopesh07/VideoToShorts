#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });

function diagnose() {
	console.log("🔍 Setup Check\n");

	let issues = 0;

	// Check API key
	const apiKey = process.env.GLADIA_API_KEY;
	if (apiKey) {
		console.log("✅ API key found");
	} else {
		console.log("❌ Missing GLADIA_API_KEY in .env.local");
		issues++;
	}

	// Check files exist
	const fs = require("fs");
	const files = ["src/lib/gladia.ts", "src/app/api/transcribe/route.ts"];

	files.forEach((file) => {
		if (fs.existsSync(file)) {
			console.log(`✅ ${file}`);
		} else {
			console.log(`❌ Missing ${file}`);
			issues++;
		}
	});

	console.log(
		issues === 0 ? "\n🎉 Setup looks good!" : `\n❌ ${issues} issue(s) found`,
	);
}

try {
	diagnose();
} catch (error) {
	console.error("❌ Error:", error.message);
}
