"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import UrlInput from "@/components/UrlInput";
import ProgressIndicator from "@/components/ProgressIndicator";
import TranscriptionResult from "@/components/TranscriptionResult";
import { GladiaTranscriptionResult } from "@/lib/gladia";

type TranscriptionState =
	| { status: "idle" }
	| { status: "processing"; progress?: number; message?: string }
	| { status: "completed"; result: GladiaTranscriptionResult }
	| { status: "error"; error: string };

export default function Home() {
	const [transcriptionState, setTranscriptionState] =
		useState<TranscriptionState>({ status: "idle" });
	const [inputMode, setInputMode] = useState<"file" | "url">("file");

	const resetState = () => {
		setTranscriptionState({ status: "idle" });
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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			{/* Header */}
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center">
							<h1 className="text-2xl font-bold text-gray-900">
								Video Transcription
							</h1>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{transcriptionState.status === "idle" && (
					<div className="space-y-6">
						{/* Input Mode Toggle */}
						<div className="flex justify-center">
							<div className="bg-white p-1 rounded-lg shadow-sm border">
								<div className="flex space-x-1">
									<button
										onClick={() => setInputMode("file")}
										className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
											inputMode === "file"
												? "bg-blue-600 text-white"
												: "text-gray-600 hover:text-gray-900"
										}`}
									>
										Upload File
									</button>
									<button
										onClick={() => setInputMode("url")}
										className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
											inputMode === "url"
												? "bg-blue-600 text-white"
												: "text-gray-600 hover:text-gray-900"
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
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<div className="flex">
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800">Error</h3>
								<p className="text-sm text-red-700 mt-1">
									{transcriptionState.error}
								</p>
								<button
									onClick={resetState}
									className="mt-2 text-sm text-red-800 hover:text-red-900"
								>
									Try Again
								</button>
							</div>
						</div>
					</div>
				)}

				{transcriptionState.status === "completed" && (
					<TranscriptionResult
						result={transcriptionState.result}
						onReset={resetState}
					/>
				)}
			</main>
		</div>
	);
}
