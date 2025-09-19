"use client";

import { useState } from "react";
import VideoPreview from "./VideoPreview";

interface DemoShort {
	id: string;
	title: string;
	text: string;
	start_time: number;
	end_time: number;
	duration: number;
	filename: string;
}

export default function VideoPreviewDemo() {
	const [previewShort, setPreviewShort] = useState<DemoShort | null>(null);
	const [demoShorts, setDemoShorts] = useState<DemoShort[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const formatTime = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const loadDemoShorts = async () => {
		setIsLoading(true);
		try {
			const response = await fetch("http://localhost:8080/demo/sample_shorts");
			const data = await response.json();
			if (data.success) {
				setDemoShorts(data.shorts);
			}
		} catch (error) {
			console.error("Failed to load demo shorts:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePreviewShort = (short: DemoShort) => {
		// For demo purposes, we'll use a sample video URL
		// In production, this would use the actual video file
		const previewUrl = `http://localhost:8080/preview_short/${short.filename}`;
		setPreviewShort({
			...short,
			filename: previewUrl,
		});
	};

	const closePreview = () => {
		setPreviewShort(null);
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-3xl font-bold text-zinc-100 mb-4">
					Video Preview Demo
				</h2>
				<p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
					This demo showcases the video preview functionality. Click "Load Demo
					Shorts" to see sample video clips, then click "Preview" to watch them
					in the built-in video player.
				</p>

				<button
					onClick={loadDemoShorts}
					disabled={isLoading}
					className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-700 hover:scale-105 disabled:bg-zinc-600 disabled:cursor-not-allowed disabled:hover:scale-100"
				>
					{isLoading ? (
						<>
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							Loading Demo...
						</>
					) : (
						"Load Demo Shorts"
					)}
				</button>
			</div>

			{demoShorts.length > 0 && (
				<>
					<div className="text-center">
						<h3 className="text-xl font-semibold text-zinc-100 mb-2">
							Generated Shorts ({demoShorts.length})
						</h3>
						<p className="text-zinc-400 text-sm">
							Click "Preview" on any short to see the video preview in action
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{demoShorts.map((short) => (
							<div
								key={short.id}
								className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50"
							>
								<div className="space-y-3">
									<div className="flex items-start justify-between">
										<h4 className="font-semibold text-zinc-100">
											{short.title}
										</h4>
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
											🎥 Preview
										</button>
										<button
											disabled
											className="flex-1 rounded-lg bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed"
										>
											⬇ Download
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{demoShorts.length === 0 && !isLoading && (
				<div className="text-center py-12">
					<div className="mx-auto mb-4 w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center">
						<svg
							className="w-12 h-12 text-zinc-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-medium text-zinc-300 mb-2">
						No Demo Shorts Loaded
					</h3>
					<p className="text-zinc-500 text-sm">
						Click the "Load Demo Shorts" button above to see sample video
						previews
					</p>
				</div>
			)}

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

			{/* Feature Highlights */}
			<div className="mt-12 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-6 backdrop-blur-sm">
				<h3 className="text-lg font-semibold text-zinc-100 mb-4">
					Video Preview Features
				</h3>
				<div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-300">
					<div className="space-y-2">
						<h4 className="font-medium text-zinc-200">
							🎮 Interactive Controls
						</h4>
						<ul className="space-y-1 text-zinc-400">
							<li>• Play/pause with spacebar or click</li>
							<li>• Seek bar for precise navigation</li>
							<li>• Skip forward/backward 10 seconds</li>
							<li>• Real-time progress tracking</li>
						</ul>
					</div>
					<div className="space-y-2">
						<h4 className="font-medium text-zinc-200">📱 Smart Features</h4>
						<ul className="space-y-1 text-zinc-400">
							<li>• Responsive design for all devices</li>
							<li>• Video streaming with range support</li>
							<li>• Loading states and error handling</li>
							<li>• Clip metadata display</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
