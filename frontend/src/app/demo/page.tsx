"use client";

import VideoPreviewDemo from "@/components/VideoPreviewDemo";

export default function DemoPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
						<svg
							className="h-8 w-8 text-white"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
					<h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
						VideoToShorts Preview Demo
					</h1>
					<p className="text-lg text-zinc-400 max-w-3xl mx-auto mt-4">
						Experience the video preview functionality in action. This demo
						showcases how users can preview their generated video shorts before
						downloading them.
					</p>
				</div>

				{/* Navigation */}
				<div className="mb-8 text-center">
					<a
						href="/"
						className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to VideoToShorts
					</a>
				</div>

				{/* Demo Component */}
				<VideoPreviewDemo />

				{/* Footer */}
				<div className="mt-16 border-t border-zinc-800/50 pt-8 text-center text-sm text-zinc-500">
					<p>
						This is a demonstration of the video preview feature. In the actual
						application, previews would show the real generated video shorts.
					</p>
				</div>
			</div>
		</div>
	);
}
