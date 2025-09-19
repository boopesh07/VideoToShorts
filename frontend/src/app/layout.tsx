import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "VideoToShorts - AI-Powered Video Transcription",
	description:
		"Upload videos or audio files to get accurate AI transcriptions with speaker identification, timestamps, summaries, and more using Gladia's powerful technology.",
	keywords: [
		"video transcription",
		"audio transcription",
		"AI transcription",
		"speech to text",
		"VideoToShorts",
	],
	authors: [{ name: "VideoToShorts App" }],
	viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
			>
				{children}
			</body>
		</html>
	);
}
