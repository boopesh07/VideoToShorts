"use client";

import { useState } from "react";
import { GladiaTranscriptionResult } from "@/lib/gladia";

interface TranscriptionResultProps {
	result: GladiaTranscriptionResult;
	onReset?: () => void;
	onGenerateShorts?: () => void;
	youtubeUrl?: string;
}

export default function TranscriptionResult({
	result,
	onReset,
	onGenerateShorts,
	youtubeUrl,
}: TranscriptionResultProps) {
	const [activeTab, setActiveTab] = useState<
		"transcript" | "summary" | "chapters" | "entities" | "sentiment"
	>("transcript");
	const [showTimestamps, setShowTimestamps] = useState(true);

	const transcription = result.result?.transcription;
	const metadata = result.result?.metadata;
	const summarization = result.result?.summarization;
	const chapterization = result.result?.chapterization;
	const namedEntities = result.result?.named_entity_recognition;
	const sentimentAnalysis = result.result?.sentiment_analysis;

	// Transform API data to match expected format
	const segments = transcription?.utterances || [];
	const fullText = transcription?.full_transcript || "";
	const duration = metadata?.audio_duration || 0;
	const channels = metadata?.number_of_distinct_channels || 0;
	const summaryText = summarization?.results || "";
	const chapters = chapterization?.results || [];
	const entities = namedEntities?.results || [];
	const sentimentResults = sentimentAnalysis?.results || [];

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	const downloadTranscript = () => {
		if (!transcription) return;

		const content = showTimestamps
			? segments
					.map(
						(segment) =>
							`[${formatTime(segment.start)} - ${formatTime(segment.end)}] ${
								segment.speaker !== undefined
									? `Speaker ${segment.speaker}: `
									: ""
							}${segment.text}`,
					)
					.join("\n\n")
			: fullText;

		const blob = new Blob([content || ""], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "transcript.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			// You could add a toast notification here
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	const tabs = [
		{
			key: "transcript",
			label: "Transcript",
			count: segments.length,
		},
		{
			key: "summary",
			label: "Summary",
			available: !!(summarization?.success && !summarization?.is_empty),
		},
		{
			key: "chapters",
			label: "Chapters",
			count: chapters.length,
		},
		{
			key: "entities",
			label: "Entities",
			count: entities.length,
		},
		{
			key: "sentiment",
			label: "Sentiment",
			available: !!(sentimentAnalysis?.success && !sentimentAnalysis?.is_empty),
		},
	].filter((tab) => tab.available !== false);

	return (
		<div className="w-full bg-zinc-900/50 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
			{/* Header */}
			<div className="border-b border-zinc-800/50 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-zinc-100">Results</h2>
						{metadata && (
							<div className="mt-2 text-sm text-zinc-400">
								{formatTime(duration)} • {channels} channels
							</div>
						)}
					</div>
					<div className="flex space-x-3">
						{youtubeUrl && onGenerateShorts && (
							<button
								onClick={onGenerateShorts}
								className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-700 hover:scale-105 shadow-lg"
							>
								🎬 Generate Shorts
							</button>
						)}
						<button
							onClick={downloadTranscript}
							className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105 shadow-lg"
						>
							Download
						</button>
						{onReset && (
							<button
								onClick={onReset}
								className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-all duration-200 hover:bg-zinc-600 hover:scale-105"
							>
								New
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-zinc-800/50">
				<nav className="flex px-6">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key as any)}
							className={`py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
								activeTab === tab.key
									? "border-red-500 text-red-400"
									: "border-transparent text-zinc-400 hover:text-zinc-200"
							}`}
						>
							{tab.label} {tab.count && `(${tab.count})`}
						</button>
					))}
				</nav>
			</div>

			{/* Content */}
			<div className="p-6">
				{/* Transcript Tab */}
				{activeTab === "transcript" && (segments.length > 0 || fullText) && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-zinc-100">
								Transcript
							</h3>
							<label className="flex items-center space-x-2 text-sm">
								<input
									type="checkbox"
									checked={showTimestamps}
									onChange={(e) => setShowTimestamps(e.target.checked)}
									className="w-4 h-4 text-red-600 bg-zinc-800 border-zinc-600 rounded focus:ring-red-500 focus:ring-2"
								/>
								<span className="text-zinc-300">Timestamps</span>
							</label>
						</div>

						{showTimestamps && segments.length > 0 ? (
							<div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
								{segments.map((segment, index) => (
									<div
										key={index}
										className="p-4 bg-zinc-800/50 rounded-lg border-l-4 border-red-500/50 hover:bg-zinc-800/70 transition-colors duration-200"
									>
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center space-x-3 text-sm text-zinc-400">
												<span className="font-mono bg-zinc-900/50 px-2 py-1 rounded">
													{formatTime(segment.start)}-{formatTime(segment.end)}
												</span>
												{segment.speaker !== undefined && (
													<span className="px-2 py-1 bg-red-600/20 text-red-300 rounded-md text-xs font-medium">
														Speaker {segment.speaker}
													</span>
												)}
											</div>
										</div>
										<p className="text-zinc-200 leading-relaxed">
											{segment.text}
										</p>
									</div>
								))}
							</div>
						) : (
							<div className="p-4 bg-zinc-800/50 rounded-lg">
								<p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
									{fullText}
								</p>
								<button
									onClick={() => copyToClipboard(fullText)}
									className="mt-3 text-red-400 text-sm hover:text-red-300 transition-colors duration-200"
								>
									Copy to Clipboard
								</button>
							</div>
						)}
					</div>
				)}

				{/* Summary Tab */}
				{activeTab === "summary" && summaryText && (
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-zinc-100">Summary</h3>
						<div className="p-4 bg-zinc-800/50 rounded-lg">
							<p className="text-zinc-200 leading-relaxed">{summaryText}</p>
							<button
								onClick={() => copyToClipboard(summaryText)}
								className="mt-3 text-red-400 text-sm hover:text-red-300 transition-colors duration-200"
							>
								Copy to Clipboard
							</button>
						</div>
					</div>
				)}

				{/* Chapters Tab */}
				{activeTab === "chapters" && chapters.length > 0 && (
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-zinc-100">Chapters</h3>
						<div className="space-y-3">
							{chapters.map((chapter, index) => (
								<div
									key={index}
									className="p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors duration-200"
								>
									<div className="flex items-center justify-between mb-2">
										<h4 className="font-medium text-zinc-100">
											{chapter.headline}
										</h4>
										<span className="text-sm text-zinc-400 font-mono bg-zinc-900/50 px-2 py-1 rounded">
											{formatTime(chapter.start)}-{formatTime(chapter.end)}
										</span>
									</div>
									<p className="text-zinc-300 text-sm leading-relaxed">
										{chapter.summary}
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Entities Tab */}
				{activeTab === "entities" && entities.length > 0 && (
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-zinc-100">
							Named Entities
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{entities.map((entity, index) => (
								<div
									key={index}
									className="p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors duration-200"
								>
									<div className="flex items-center justify-between">
										<span className="font-medium text-zinc-200">
											{entity.entity}
										</span>
										<span className="text-xs bg-red-600/20 text-red-300 px-2 py-1 rounded-md font-medium">
											{entity.category}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Sentiment Tab */}
				{activeTab === "sentiment" && sentimentResults.length > 0 && (
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-zinc-100">
							Sentiment Analysis
						</h3>
						<div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
							{sentimentResults.map((result, index) => (
								<div
									key={index}
									className="p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors duration-200"
								>
									<div className="flex items-center justify-between mb-2">
										<span
											className={`text-sm px-3 py-1 rounded-full font-medium ${
												result.sentiment === "positive"
													? "bg-green-600/20 text-green-300"
													: result.sentiment === "negative"
														? "bg-red-600/20 text-red-300"
														: "bg-yellow-600/20 text-yellow-300"
											}`}
										>
											{result.sentiment}
										</span>
										<span className="text-xs text-zinc-400 font-mono bg-zinc-900/50 px-2 py-1 rounded">
											{formatTime(result.start)}-{formatTime(result.end)}
										</span>
									</div>
									<p className="text-sm text-zinc-300 leading-relaxed">
										{result.segment}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
