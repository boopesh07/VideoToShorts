"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import UrlInput from "@/components/UrlInput";
import ProgressIndicator from "@/components/ProgressIndicator";
import TranscriptionResult from "@/components/TranscriptionResult";
import ShortsGenerator from "@/components/ShortsGenerator";
import { GladiaTranscriptionResult } from "@/lib/gladia";

type TranscriptionState =
	| { status: "idle" }
	| { status: "processing"; progress?: number; message?: string }
	| { status: "completed"; result: GladiaTranscriptionResult }
	| { status: "error"; error: string };

type AppMode = "transcription" | "shorts";

export default function Home() {
	const [transcriptionState, setTranscriptionState] =
		useState<TranscriptionState>({ status: "idle" });
	const [inputMode, setInputMode] = useState<"file" | "url">("file");
	const [appMode, setAppMode] = useState<AppMode>("transcription");
	const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string>("");

	const resetState = () => {
		setTranscriptionState({ status: "idle" });
		setAppMode("transcription");
		setCurrentYoutubeUrl("");
	};

	const handleGenerateShorts = () => {
		setAppMode("shorts");
	};

	const handleBackToTranscription = () => {
		setAppMode("transcription");
	};

	const handleFileSelect = async (file: File) => {
		setTranscriptionState({
			status: "processing",
			message: "Uploading file...",
		});

		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch("/api/transcribe", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Failed to process file");
			}

			const data = await response.json();

			if (data.success) {
				setTranscriptionState({
					status: "completed",
					result: data.data,
				});
			} else {
				throw new Error(data.error || "Unknown error occurred");
			}
		} catch (error) {
			console.error("Transcription error:", error);
			setTranscriptionState({
				status: "error",
				error:
					error instanceof Error ? error.message : "An unknown error occurred",
			});
		}
	};

	const handleUrlSubmit = async (url: string) => {
		setTranscriptionState({
			status: "processing",
			message: "Processing URL...",
		});

		// Store the YouTube URL for later use in shorts generation
		if (url.includes("youtube.com") || url.includes("youtu.be")) {
			setCurrentYoutubeUrl(url);
		}

		try {
			const formData = new FormData();
			formData.append("videoUrl", url);

			const response = await fetch("/api/transcribe", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Failed to process URL");
			}

			const data = await response.json();

			if (data.success) {
				setTranscriptionState({
					status: "completed",
					result: data.data,
				});
			} else {
				throw new Error(data.error || "Unknown error occurred");
			}
		} catch (error) {
			console.error("Transcription error:", error);
			setTranscriptionState({
				status: "error",
				error:
					error instanceof Error ? error.message : "An unknown error occurred",
			});
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950">
			{/* Header */}
			<header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-lg">
				<nav className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
					<div className="group flex items-center gap-2 transition-all duration-200 hover:scale-105">
						<div className="grid aspect-square w-5 grid-cols-2 gap-[20%] transition-transform duration-200 group-hover:rotate-6">
							<div className="rounded-full bg-red-500"></div>
							<div className="rounded-full bg-red-300"></div>
							<div className="rounded-full bg-red-300"></div>
							<div className="rounded-full bg-red-500"></div>
						</div>
						<span className="hidden font-mono text-sm font-medium text-zinc-100 transition-colors duration-200 group-hover:text-red-300 sm:block">
							VideoToShorts
						</span>
					</div>
				</nav>
			</header>

			{/* Main Content */}
			<main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{appMode === "transcription" && (
					<>
						{transcriptionState.status === "idle" && (
							<div className="space-y-8">
								{/* Hero Section */}
								<div className="text-center space-y-4">
									<h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
										AI Video Transcription
									</h1>
									<p className="text-lg text-zinc-400 max-w-2xl mx-auto">
										Upload videos or audio files to get accurate AI
										transcriptions with speaker identification and timestamps
									</p>
								</div>

								{/* Input Mode Toggle */}
								<div className="flex justify-center">
									<div className="bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
										<div className="flex space-x-1">
											<button
												onClick={() => setInputMode("file")}
												className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
													inputMode === "file"
														? "bg-red-600 text-white shadow-lg"
														: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50"
												}`}
											>
												Upload File
											</button>
											<button
												onClick={() => setInputMode("url")}
												className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
													inputMode === "url"
														? "bg-red-600 text-white shadow-lg"
														: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50"
												}`}
											>
												From URL
											</button>
										</div>
									</div>
								</div>

								{/* Input Component */}
								<div>
									{inputMode === "file" ? (
										<FileUpload
											onFileSelect={handleFileSelect}
											accept="audio/*,video/*"
											maxSizeMB={100}
										/>
									) : (
										<UrlInput onUrlSubmit={handleUrlSubmit} />
									)}
								</div>
							</div>
						)}

						{transcriptionState.status === "processing" && (
							<ProgressIndicator
								status="processing"
								progress={transcriptionState.progress}
								message={transcriptionState.message}
							/>
						)}

						{transcriptionState.status === "error" && (
							<div className="rounded-lg border border-red-800/50 bg-red-900/50 p-6 backdrop-blur-sm">
								<div className="space-y-3">
									<h3 className="text-sm font-semibold text-red-300 uppercase tracking-wider">
										Error
									</h3>
									<p className="text-zinc-300 leading-relaxed">
										{transcriptionState.error}
									</p>
									<button
										onClick={resetState}
										className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105"
									>
										Try Again
									</button>
								</div>
							</div>
						)}

						{transcriptionState.status === "completed" && (
							<TranscriptionResult
								result={transcriptionState.result}
								onReset={resetState}
								onGenerateShorts={
									currentYoutubeUrl ? handleGenerateShorts : undefined
								}
								youtubeUrl={currentYoutubeUrl}
							/>
						)}
					</>
				)}

				{appMode === "shorts" && transcriptionState.status === "completed" && (
					<ShortsGenerator
						transcriptionResult={transcriptionState.result}
						youtubeUrl={currentYoutubeUrl}
						onBack={handleBackToTranscription}
					/>
				)}
			</main>
		</div>
	);
}
