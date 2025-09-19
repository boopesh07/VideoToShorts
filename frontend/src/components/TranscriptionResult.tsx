"use client";

import { useState } from "react";
import { GladiaTranscriptionResult } from "@/lib/gladia";

interface TranscriptionResultProps {
	result: GladiaTranscriptionResult;
	onReset?: () => void;
}

export default function TranscriptionResult({
	result,
	onReset,
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
		<div className="w-full bg-white rounded-lg border">
			{/* Header */}
			<div className="border-b p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Results</h2>
						{metadata && (
							<div className="mt-1 text-sm text-gray-500">
								{formatTime(duration)} • {channels} channels
							</div>
						)}
					</div>
					<div className="flex space-x-2">
						<button
							onClick={downloadTranscript}
							className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
						>
							Download
						</button>
						{onReset && (
							<button
								onClick={onReset}
								className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
							>
								New
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b">
				<nav className="flex px-4">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key as any)}
							className={`py-2 px-4 text-sm font-medium border-b-2 ${
								activeTab === tab.key
									? "border-blue-500 text-blue-600"
									: "border-transparent text-gray-500"
							}`}
						>
							{tab.label} {tab.count && `(${tab.count})`}
						</button>
					))}
				</nav>
			</div>

			{/* Content */}
			<div className="p-4">
				{/* Transcript Tab */}
				{activeTab === "transcript" && (segments.length > 0 || fullText) && (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold">Transcript</h3>
							<label className="flex items-center space-x-1 text-sm">
								<input
									type="checkbox"
									checked={showTimestamps}
									onChange={(e) => setShowTimestamps(e.target.checked)}
								/>
								<span>Timestamps</span>
							</label>
						</div>

						{showTimestamps && segments.length > 0 ? (
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{segments.map((segment, index) => (
									<div
										key={index}
										className="p-3 bg-gray-50 rounded border-l-2 border-blue-500"
									>
										<div className="flex items-center justify-between mb-1">
											<div className="flex items-center space-x-2 text-sm text-gray-600">
												<span className="font-mono">
													{formatTime(segment.start)}-{formatTime(segment.end)}
												</span>
												{segment.speaker !== undefined && (
													<span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
														Speaker {segment.speaker}
													</span>
												)}
											</div>
										</div>
										<p className="text-gray-800">{segment.text}</p>
									</div>
								))}
							</div>
						) : (
							<div className="p-4 bg-gray-50 rounded">
								<p className="text-gray-800 whitespace-pre-wrap">{fullText}</p>
								<button
									onClick={() => copyToClipboard(fullText)}
									className="mt-2 text-blue-600 text-sm"
								>
									Copy
								</button>
							</div>
						)}
					</div>
				)}

				{/* Summary Tab */}
				{activeTab === "summary" && summaryText && (
					<div>
						<h3 className="font-semibold mb-2">Summary</h3>
						<div className="p-4 bg-gray-50 rounded">
							<p className="text-gray-800">{summaryText}</p>
							<button
								onClick={() => copyToClipboard(summaryText)}
								className="mt-2 text-blue-600 text-sm"
							>
								Copy
							</button>
						</div>
					</div>
				)}

				{/* Chapters Tab */}
				{activeTab === "chapters" && chapters.length > 0 && (
					<div>
						<h3 className="font-semibold mb-2">Chapters</h3>
						<div className="space-y-2">
							{chapters.map((chapter, index) => (
								<div key={index} className="p-3 bg-gray-50 rounded">
									<div className="flex items-center justify-between mb-1">
										<h4 className="font-medium">{chapter.headline}</h4>
										<span className="text-sm text-gray-500">
											{formatTime(chapter.start)}-{formatTime(chapter.end)}
										</span>
									</div>
									<p className="text-gray-700 text-sm">{chapter.summary}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Entities Tab */}
				{activeTab === "entities" && entities.length > 0 && (
					<div>
						<h3 className="font-semibold mb-2">Named Entities</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{entities.map((entity, index) => (
								<div key={index} className="p-3 bg-gray-50 rounded">
									<div className="flex items-center justify-between">
										<span className="font-medium">{entity.entity}</span>
										<span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
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
					<div>
						<h3 className="font-semibold mb-2">Sentiment Analysis</h3>
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{sentimentResults.map((result, index) => (
								<div key={index} className="p-3 bg-gray-50 rounded">
									<div className="flex items-center justify-between mb-1">
										<span
											className={`text-sm px-2 py-0.5 rounded ${
												result.sentiment === "positive"
													? "bg-green-100 text-green-800"
													: result.sentiment === "negative"
														? "bg-red-100 text-red-800"
														: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{result.sentiment}
										</span>
										<span className="text-xs text-gray-500">
											{formatTime(result.start)}-{formatTime(result.end)}
										</span>
									</div>
									<p className="text-sm text-gray-700">{result.segment}</p>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
