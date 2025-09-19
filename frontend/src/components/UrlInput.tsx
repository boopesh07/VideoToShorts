"use client";

import { useState } from "react";

interface UrlInputProps {
	onUrlSubmit: (url: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

export default function UrlInput({
	onUrlSubmit,
	disabled = false,
	placeholder = "Enter video/audio URL (YouTube, Vimeo, direct links, etc.)",
}: UrlInputProps) {
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);

	const validateUrl = (url: string): boolean => {
		setError(null);

		if (!url.trim()) {
			setError("Please enter a URL");
			return false;
		}

		// Basic URL validation
		try {
			new URL(url);
		} catch {
			setError("Please enter a valid URL");
			return false;
		}

		// Check for common video/audio platforms or file extensions
		const validPatterns = [
			/youtube\.com\/watch/,
			/youtu\.be\//,
			/vimeo\.com/,
			/soundcloud\.com/,
			/\.mp4$/i,
			/\.mp3$/i,
			/\.wav$/i,
			/\.m4a$/i,
			/\.webm$/i,
			/\.ogg$/i,
			/\.flac$/i,
			/\.aac$/i,
		];

		const isValidPattern = validPatterns.some((pattern) => pattern.test(url));
		if (!isValidPattern) {
			setError(
				"Please enter a valid video/audio URL (YouTube, Vimeo, SoundCloud, or direct media file)",
			);
			return false;
		}

		return true;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateUrl(url)) {
			onUrlSubmit(url.trim());
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setUrl(e.target.value);
		if (error) {
			setError(null);
		}
	};

	return (
		<div className="w-full max-w-2xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="relative">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg
							className="h-5 w-5 text-zinc-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
							/>
						</svg>
					</div>
					<input
						type="url"
						value={url}
						onChange={handleInputChange}
						placeholder={placeholder}
						disabled={disabled}
						className={`
              block w-full pl-10 pr-12 py-3 border rounded-lg bg-zinc-900/50 backdrop-blur-sm text-zinc-100
              focus:ring-2 focus:ring-red-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder-zinc-400 text-sm transition-all duration-200
              ${error ? "border-red-800/50" : "border-zinc-800/50 hover:border-zinc-700"}
            `}
					/>
					<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
						<button
							type="submit"
							disabled={disabled || !url.trim()}
							className={`
                px-4 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium
                hover:bg-red-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
						>
							Process
						</button>
					</div>
				</div>

				{error && (
					<div className="p-3 bg-red-900/50 border border-red-800/50 rounded-lg backdrop-blur-sm">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-400"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm text-red-300">{error}</p>
							</div>
						</div>
					</div>
				)}
			</form>

			<div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg backdrop-blur-sm">
				<h4 className="text-sm font-medium text-zinc-100 mb-2">
					Supported URLs:
				</h4>
				<ul className="text-xs text-zinc-400 space-y-1">
					<li>• YouTube videos (youtube.com, youtu.be)</li>
					<li>• Vimeo videos (vimeo.com)</li>
					<li>• SoundCloud audio (soundcloud.com)</li>
					<li>
						• Direct media files (.mp4, .mp3, .wav, .m4a, .webm, .ogg, .flac,
						.aac)
					</li>
				</ul>
			</div>
		</div>
	);
}
