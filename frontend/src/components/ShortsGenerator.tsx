"use client";

import { useState } from "react";
import { GladiaTranscriptionResult } from "@/lib/gladia";
import VideoPreview from "./VideoPreview";

interface ShortInfo {
	id: string;
	title: string;
	text: string;
	start_time: number;
	end_time: number;
	duration: number;
	filename: string;
}

interface SuggestedSegment {
	rank: number;
	start_time: number;
	end_time: number;
	duration: number;
	text: string;
	segments_included: number[];
	reasoning: string;
	engagement_score: number;
	viral_potential: string;
	key_moment: {
		timestamp: number;
		description: string;
	};
	title: string;
}

interface ShortsGeneratorProps {
	transcriptionResult: GladiaTranscriptionResult;
	youtubeUrl?: string;
	onBack: () => void;
}

type ShortsState =
	| { status: "idle" }
	| { status: "suggesting"; message?: string }
	| { status: "suggestions_ready"; suggestedSegments: SuggestedSegment[] }
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
	const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
		new Set(),
	);
	const [previewShort, setPreviewShort] = useState<ShortInfo | null>(null);

	const formatTime = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const getSuggestedSegments = async () => {
		setShortsState({
			status: "suggesting",
			message: "Analyzing transcript with AI to find the best segments...",
		});

		try {
			const response = await fetch("http://localhost:8080/suggest_segments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					transcript_data: transcriptionResult,
					target_duration: 30,
					max_segments: maxShorts,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to get segment suggestions");
			}

			const data = await response.json();

			if (data.success) {
				setShortsState({
					status: "suggestions_ready",
					suggestedSegments: data.suggested_segments,
				});
				// Select all suggestions by default
				setSelectedSuggestions(
					new Set(
						data.suggested_segments.map((seg: SuggestedSegment) => seg.rank),
					),
				);
			} else {
				throw new Error("Segment suggestion failed");
			}
		} catch (error) {
			console.error("Segment suggestion error:", error);
			setShortsState({
				status: "error",
				error:
					error instanceof Error
						? error.message
						: "Failed to analyze transcript",
			});
		}
	};

	const generateShorts = async (useCustomSegments = false) => {
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
			let segmentsToUse = null;

			if (useCustomSegments && customSegments.length > 0) {
				segmentsToUse = customSegments.map((seg) => ({
					start: seg.start,
					end: seg.end,
					title: seg.title,
					text: `Custom segment: ${seg.title}`,
				}));
			} else if (
				shortsState.status === "suggestions_ready" &&
				selectedSuggestions.size > 0
			) {
				segmentsToUse = shortsState.suggestedSegments
					.filter((seg) => selectedSuggestions.has(seg.rank))
					.map((seg) => ({
						start: seg.start_time,
						end: seg.end_time,
						title: seg.title,
						text: seg.text,
					}));
			}

			const requestBody = {
				youtube_url: youtubeUrl,
				transcript_data: transcriptionResult,
				max_shorts: maxShorts,
				custom_segments: segmentsToUse,
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

	const handlePreviewShort = (short: ShortInfo) => {
		// Construct the preview URL using the backend streaming endpoint
		const previewUrl = `http://localhost:8080/preview_short/${short.filename}`;
		setPreviewShort({
			...short,
			filename: previewUrl, // Use the full URL for the video preview
		});
	};

	const closePreview = () => {
		setPreviewShort(null);
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
		setSelectedSuggestions(new Set());
	};

	const toggleSuggestionSelection = (rank: number) => {
		const newSelection = new Set(selectedSuggestions);
		if (newSelection.has(rank)) {
			newSelection.delete(rank);
		} else {
			newSelection.add(rank);
		}
		setSelectedSuggestions(newSelection);
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

	if (shortsState.status === "suggesting") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-zinc-100">
						Analyzing Transcript
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
								AI is finding the most engaging segments...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

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

				{/* Video Preview Modal */}
				{previewShort && (
					<VideoPreview
						videoUrl={previewShort.filename}
						title={previewShort.title}
						startTime={previewShort.start_time}
						endTime={previewShort.end_time}
						duration={previewShort.duration}
						onClose={closePreview}
					/>
				)}
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

								<div className="flex gap-2">
									<button
										onClick={() => handlePreviewShort(short)}
										className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
									>
										Preview
									</button>
									<button
										onClick={() => downloadShort(short.filename)}
										className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
									>
										Download
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	// Suggestions ready state - show AI suggestions
	if (shortsState.status === "suggestions_ready") {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-zinc-100">
						AI-Suggested Segments ({shortsState.suggestedSegments.length})
					</h2>
					<div className="flex gap-2">
						<button
							onClick={resetState}
							className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
						>
							Back to Config
						</button>
						<button
							onClick={onBack}
							className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
						>
							Back
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-blue-800/50 bg-blue-900/50 p-4 backdrop-blur-sm">
					<p className="text-blue-300">
						🤖 AI has analyzed your transcript and found the most engaging
						segments. Select which ones you want to turn into shorts, then click
						"Generate Selected Shorts".
					</p>
				</div>

				<div className="grid gap-4">
					{shortsState.suggestedSegments.map((segment) => (
						<div
							key={segment.rank}
							className={`rounded-lg border p-4 transition-all duration-200 ${
								selectedSuggestions.has(segment.rank)
									? "border-red-600/50 bg-red-900/20"
									: "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50"
							} backdrop-blur-sm`}
						>
							<div className="space-y-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={selectedSuggestions.has(segment.rank)}
											onChange={() => toggleSuggestionSelection(segment.rank)}
											className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-500"
										/>
										<div>
											<h3 className="font-semibold text-zinc-100">
												#{segment.rank} - {segment.title}
											</h3>
											<div className="flex items-center gap-4 text-sm text-zinc-400">
												<span>
													{formatTime(segment.start_time)} -{" "}
													{formatTime(segment.end_time)}
												</span>
												<span className="rounded bg-red-600/20 px-2 py-1 text-red-300">
													{formatTime(segment.duration)}
												</span>
												<span
													className={`rounded px-2 py-1 text-xs font-medium ${
														segment.viral_potential === "High"
															? "bg-green-600/20 text-green-300"
															: segment.viral_potential === "Medium-High"
																? "bg-yellow-600/20 text-yellow-300"
																: "bg-blue-600/20 text-blue-300"
													}`}
												>
													{segment.viral_potential}
												</span>
												<span className="text-orange-300">
													Score: {segment.engagement_score.toFixed(1)}
												</span>
											</div>
										</div>
									</div>
								</div>

								<p className="text-sm text-zinc-300 line-clamp-3">
									{segment.text.length > 200
										? `${segment.text.substring(0, 200)}...`
										: segment.text}
								</p>

								<div className="rounded bg-zinc-800/50 p-3">
									<h4 className="text-xs font-medium text-zinc-400 mb-1">
										🧠 AI Analysis:
									</h4>
									<p className="text-sm text-zinc-300">{segment.reasoning}</p>
								</div>

								{segment.key_moment && (
									<div className="text-xs text-zinc-500">
										<strong>Key moment:</strong>{" "}
										{formatTime(segment.key_moment.timestamp)} -{" "}
										{segment.key_moment.description}
									</div>
								)}
							</div>
						</div>
					))}
				</div>

				<div className="flex gap-3">
					<button
						onClick={() => generateShorts(false)}
						disabled={!youtubeUrl || selectedSuggestions.size === 0}
						className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105 disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:hover:scale-100"
					>
						Generate Selected Shorts ({selectedSuggestions.size})
					</button>
					<button
						onClick={() =>
							setSelectedSuggestions(
								new Set(shortsState.suggestedSegments.map((seg) => seg.rank)),
							)
						}
						className="rounded-lg bg-zinc-600 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700"
					>
						Select All
					</button>
					<button
						onClick={() => setSelectedSuggestions(new Set())}
						className="rounded-lg bg-zinc-600 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700"
					>
						Deselect All
					</button>
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
				{/* AI-powered segment suggestion */}
				<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm">
					<h3 className="mb-3 font-semibold text-zinc-100">
						🤖 AI-Powered Segment Analysis
					</h3>
					<div className="space-y-3">
						<div>
							<label className="block text-sm font-medium text-zinc-300">
								Number of Suggestions
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
								AI will analyze your transcript and suggest the most engaging
								segments
							</p>
						</div>
						<button
							onClick={getSuggestedSegments}
							disabled={!youtubeUrl}
							className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:scale-105 disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:hover:scale-100"
						>
							{youtubeUrl ? "🚀 Get AI Suggestions" : "YouTube URL Required"}
						</button>
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
					onClick={() => generateShorts(true)}
					disabled={!youtubeUrl}
					className="w-full rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105 disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:hover:scale-100"
				>
					{youtubeUrl
						? "Generate from Custom Segments"
						: "YouTube URL Required"}
				</button>
			</div>
		</div>
	);
}
