"use client";

import { useState, useRef, useEffect } from "react";

interface VideoPreviewProps {
	videoUrl: string;
	title: string;
	startTime: number;
	endTime: number;
	duration: number;
	onClose: () => void;
}

export default function VideoPreview({
	videoUrl,
	title,
	startTime,
	endTime,
	duration,
	onClose,
}: VideoPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const formatTime = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const togglePlayPause = () => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
			} else {
				videoRef.current.play();
			}
		}
	};

	const handleTimeUpdate = () => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime);
		}
	};

	const handleLoadedData = () => {
		setIsLoading(false);
		setError(null);
	};

	const handleError = () => {
		setIsLoading(false);
		setError("Failed to load video preview");
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (videoRef.current) {
			const newTime = parseFloat(e.target.value);
			videoRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);

		video.addEventListener("play", handlePlay);
		video.addEventListener("pause", handlePause);
		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("loadeddata", handleLoadedData);
		video.addEventListener("error", handleError);

		return () => {
			video.removeEventListener("play", handlePlay);
			video.removeEventListener("pause", handlePause);
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("loadeddata", handleLoadedData);
			video.removeEventListener("error", handleError);
		};
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="relative mx-4 w-full max-w-4xl rounded-lg border border-zinc-800/50 bg-zinc-900/95 p-6 shadow-2xl">
				{/* Header */}
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
					<button
						onClick={onClose}
						className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Video Player */}
				<div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-black">
					{isLoading && (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="flex items-center gap-3 text-zinc-300">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
								Loading preview...
							</div>
						</div>
					)}

					{error && (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="text-center text-red-300">
								<svg
									className="mx-auto mb-2 h-12 w-12"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p>{error}</p>
								<p className="mt-1 text-sm text-zinc-500">
									The video preview could not be loaded
								</p>
							</div>
						</div>
					)}

					<video
						ref={videoRef}
						className="h-full w-full object-contain"
						preload="metadata"
						playsInline
					>
						<source src={videoUrl} type="video/mp4" />
						Your browser does not support the video tag.
					</video>

					{/* Play/Pause Overlay */}
					{!isLoading && !error && (
						<div className="absolute inset-0 flex items-center justify-center">
							<button
								onClick={togglePlayPause}
								className="rounded-full bg-black/50 p-4 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/70 hover:opacity-100 focus:opacity-100"
							>
								{isPlaying ? (
									<svg
										className="h-8 w-8"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
									</svg>
								) : (
									<svg
										className="h-8 w-8"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								)}
							</button>
						</div>
					)}
				</div>

				{/* Video Controls */}
				{!error && (
					<div className="space-y-4">
						{/* Progress Bar */}
						<div className="flex items-center gap-3">
							<span className="text-sm tabular-nums text-zinc-400">
								{formatTime(currentTime)}
							</span>
							<input
								type="range"
								min="0"
								max={duration}
								step="0.1"
								value={currentTime}
								onChange={handleSeek}
								className="flex-1 rounded-lg bg-zinc-700"
								style={{
									background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`,
								}}
							/>
							<span className="text-sm tabular-nums text-zinc-400">
								{formatTime(duration)}
							</span>
						</div>

						{/* Control Buttons */}
						<div className="flex items-center justify-center gap-4">
							<button
								onClick={() => {
									if (videoRef.current) {
										videoRef.current.currentTime = Math.max(
											0,
											currentTime - 10,
										);
									}
								}}
								className="rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
							>
								<svg
									className="h-5 w-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
								</svg>
								<span className="sr-only">Rewind 10 seconds</span>
							</button>

							<button
								onClick={togglePlayPause}
								className="rounded-lg bg-red-600 p-3 text-white transition-colors hover:bg-red-700"
								disabled={isLoading}
							>
								{isPlaying ? (
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
									</svg>
								) : (
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								)}
							</button>

							<button
								onClick={() => {
									if (videoRef.current) {
										videoRef.current.currentTime = Math.min(
											duration,
											currentTime + 10,
										);
									}
								}}
								className="rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
							>
								<svg
									className="h-5 w-5 scale-x-[-1]"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
								</svg>
								<span className="sr-only">Forward 10 seconds</span>
							</button>
						</div>

						{/* Video Info */}
						<div className="rounded-lg bg-zinc-800/50 p-3 text-sm text-zinc-300">
							<div className="flex items-center justify-between">
								<span>Clip Duration: {formatTime(duration)}</span>
								<span>
									Original Time: {formatTime(startTime)} - {formatTime(endTime)}
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Footer Actions */}
				<div className="mt-6 flex items-center justify-end gap-3">
					<button
						onClick={onClose}
						className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
