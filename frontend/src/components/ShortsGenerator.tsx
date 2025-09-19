"use client";

import { useState } from "react";
import { GladiaTranscriptionResult } from "@/lib/gladia";

interface ShortInfo {
	id: string;
	title: string;
	text: string;
	start_time: number;
	end_time: number;
	duration: number;
	filename: string;
}

interface ShortsGeneratorProps {
	transcriptionResult: GladiaTranscriptionResult;
	youtubeUrl?: string;
	onBack: () => void;
}

type ShortsState =
	| { status: "idle" }
	| { status: "generating"; progress?: number; message?: string }
	| { status: "completed"; shorts: ShortInfo[]; youtubeUrl: string }
	| { status: "error"; error: string };

export default function ShortsGenerator({
	transcriptionResult,
	youtubeUrl,
	onBack,
}: ShortsGeneratorProps) {
	const [shortsState, setShortsState] = useState<ShortsState>({
		status: "idle",
	});
	const [maxShorts, setMaxShorts] = useState(5);
	const [customSegments, setCustomSegments] = useState<
		{ start: number; end: number; title: string }[]
	>([]);

	const formatTime = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const generateShorts = async () => {
		if (!youtubeUrl) {
			setShortsState({
				status: "error",
				error: "YouTube URL is required for shorts generation",
			});
			return;
		}

		setShortsState({
			status: "generating",
			message: "Downloading video and generating shorts...",
		});

		try {
			const requestBody = {
				youtube_url: youtubeUrl,
				transcript_data: transcriptionResult,
				max_shorts: maxShorts,
				custom_segments:
					customSegments.length > 0
						? customSegments.map((seg) => ({
								start: seg.start,
								end: seg.end,
								title: seg.title,
								text: `Custom segment: ${seg.title}`,
							}))
						: null,
			};

			const response = await fetch("http://localhost:8080/generate_shorts", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error("Failed to generate shorts");
			}

			const data = await response.json();

			if (data.success) {
				setShortsState({
					status: "completed",
					shorts: data.shorts,
					youtubeUrl: data.youtube_url,
				});
			} else {
				throw new Error("Shorts generation failed");
			}
		} catch (error) {
			console.error("Shorts generation error:", error);
			setShortsState({
				status: "error",
				error:
					error instanceof Error ? error.message : "An unknown error occurred",
			});
		}
	};

	const addCustomSegment = () => {
		setCustomSegments([
			...customSegments,
			{ start: 0, end: 30, title: `Segment ${customSegments.length + 1}` },
		]);
	};

	const updateCustomSegment = (
		index: number,
		field: keyof (typeof customSegments)[0],
		value: string | number,
	) => {
		const updated = [...customSegments];
		updated[index] = { ...updated[index], [field]: value };
		setCustomSegments(updated);
	};

	const removeCustomSegment = (index: number) => {
		setCustomSegments(customSegments.filter((_, i) => i !== index));
	};

	const resetState = () => {
		setShortsState({ status: "idle" });
		setCustomSegments([]);
	};

	const downloadShort = async (filename: string) => {
		try {
			const response = await fetch(
				`http://localhost:8080/download_short/${filename}`,
			);

			if (!response.ok) {
				throw new Error("Failed to download short");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download error:", error);
			// You could add a toast notification here
		}
	};

	if (shortsState.status === "generating") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-zinc-100">
						Generating Shorts
					</h2>
				</div>
				<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-sm">
					<div className="space-y-4">
						<div className="flex items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
						</div>
						<div className="text-center">
							<p className="text-zinc-300">{shortsState.message}</p>
							<p className="mt-2 text-sm text-zinc-500">
								This may take a few minutes...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (shortsState.status === "error") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-zinc-100">Generation Error</h2>
					<button
						onClick={onBack}
						className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
					>
						Back
					</button>
				</div>
				<div className="rounded-lg border border-red-800/50 bg-red-900/50 p-6 backdrop-blur-sm">
					<div className="space-y-3">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-red-300">
							Error
						</h3>
						<p className="leading-relaxed text-zinc-300">{shortsState.error}</p>
						<div className="flex gap-2">
							<button
								onClick={resetState}
								className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-red-700"
							>
								Try Again
							</button>
							<button
								onClick={onBack}
								className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-zinc-700"
							>
								Back to Transcript
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (shortsState.status === "completed") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-zinc-100">
						Generated Shorts ({shortsState.shorts.length})
					</h2>
					<div className="flex gap-2">
						<button
							onClick={resetState}
							className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
						>
							Generate Again
						</button>
						<button
							onClick={onBack}
							className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
						>
							Back
						</button>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{shortsState.shorts.map((short, index) => (
						<div
							key={short.id}
							className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50"
						>
							<div className="space-y-3">
								<div className="flex items-start justify-between">
									<h3 className="font-semibold text-zinc-100">{short.title}</h3>
									<span className="rounded bg-red-600/20 px-2 py-1 text-xs font-medium text-red-300">
										{formatTime(short.duration)}
									</span>
								</div>

								<p className="text-sm text-zinc-400 line-clamp-3">
									{short.text.length > 150
										? `${short.text.substring(0, 150)}...`
										: short.text}
								</p>

								<div className="flex items-center justify-between text-xs text-zinc-500">
									<span>
										{formatTime(short.start_time)} -{" "}
										{formatTime(short.end_time)}
									</span>
									<span>{short.filename}</span>
								</div>

								<button
									onClick={() => downloadShort(short.filename)}
									className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
								>
									Download Short
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	// Idle state - show configuration options
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold text-zinc-100">Generate Shorts</h2>
				<button
					onClick={onBack}
					className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
				>
					Back
				</button>
			</div>

			{!youtubeUrl && (
				<div className="rounded-lg border border-orange-800/50 bg-orange-900/50 p-4 backdrop-blur-sm">
					<p className="text-orange-300">
						⚠️ Shorts generation requires a YouTube URL. Please transcribe from a
						YouTube URL to generate shorts.
					</p>
				</div>
			)}

			<div className="space-y-4">
				{/* Auto-generation settings */}
				<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm">
					<h3 className="mb-3 font-semibold text-zinc-100">
						Auto-Generation Settings
					</h3>
					<div className="space-y-3">
						<div>
							<label className="block text-sm font-medium text-zinc-300">
								Maximum Shorts to Generate
							</label>
							<input
								type="number"
								min="1"
								max="10"
								value={maxShorts}
								onChange={(e) => setMaxShorts(parseInt(e.target.value) || 5)}
								className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
							/>
							<p className="mt-1 text-xs text-zinc-500">
								AI will automatically identify highlight segments from your
								transcript
							</p>
						</div>
					</div>
				</div>

				{/* Custom segments */}
				<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="font-semibold text-zinc-100">Custom Segments</h3>
						<button
							onClick={addCustomSegment}
							className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
						>
							Add Segment
						</button>
					</div>

					{customSegments.length === 0 ? (
						<p className="text-sm text-zinc-500">
							No custom segments. Add segments to specify exact time ranges for
							shorts.
						</p>
					) : (
						<div className="space-y-3">
							{customSegments.map((segment, index) => (
								<div
									key={index}
									className="flex items-center gap-3 rounded border border-zinc-700 p-3"
								>
									<input
										type="text"
										value={segment.title}
										onChange={(e) =>
											updateCustomSegment(index, "title", e.target.value)
										}
										placeholder="Segment title"
										className="flex-1 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-white"
									/>
									<div className="flex items-center gap-1 text-sm text-zinc-400">
										<input
											type="number"
											value={segment.start}
											onChange={(e) =>
												updateCustomSegment(
													index,
													"start",
													parseFloat(e.target.value) || 0,
												)
											}
											className="w-16 rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-center text-white"
											step="0.1"
										/>
										<span>-</span>
										<input
											type="number"
											value={segment.end}
											onChange={(e) =>
												updateCustomSegment(
													index,
													"end",
													parseFloat(e.target.value) || 30,
												)
											}
											className="w-16 rounded border border-zinc-600 bg-zinc-700 px-1 py-1 text-center text-white"
											step="0.1"
										/>
										<span>s</span>
									</div>
									<button
										onClick={() => removeCustomSegment(index)}
										className="text-red-400 hover:text-red-300"
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Generate button */}
				<button
					onClick={generateShorts}
					disabled={!youtubeUrl}
					className="w-full rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105 disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:hover:scale-100"
				>
					{youtubeUrl ? "Generate Shorts" : "YouTube URL Required"}
				</button>
			</div>
		</div>
	);
}
