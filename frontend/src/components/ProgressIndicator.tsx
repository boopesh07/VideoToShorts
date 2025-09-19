"use client";

import { useEffect, useState } from "react";

interface ProgressIndicatorProps {
	status: string;
	progress?: number;
	message?: string;
	showSteps?: boolean;
}

const statusSteps = [
	{
		key: "uploading",
		label: "Uploading",
		description: "Uploading your file...",
	},
	{
		key: "starting",
		label: "Starting",
		description: "Initializing transcription...",
	},
	{
		key: "processing",
		label: "Processing",
		description: "Transcribing audio...",
	},
	{ key: "done", label: "Complete", description: "Transcription completed!" },
];

export default function ProgressIndicator({
	status,
	progress,
	message,
	showSteps = true,
}: ProgressIndicatorProps) {
	const [dots, setDots] = useState("");

	useEffect(() => {
		if (
			status === "processing" ||
			status === "uploading" ||
			status === "starting"
		) {
			const interval = setInterval(() => {
				setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
			}, 500);
			return () => clearInterval(interval);
		}
	}, [status]);

	const getCurrentStepIndex = () => {
		return statusSteps.findIndex((step) => step.key === status);
	};

	const currentStepIndex = getCurrentStepIndex();
	const currentStep = statusSteps[currentStepIndex] || statusSteps[0];

	return (
		<div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg border">
			{/* Current Status */}
			<div className="text-center mb-6">
				<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
					{status === "done" ? (
						<svg
							className="w-8 h-8 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					) : status === "error" ? (
						<svg
							className="w-8 h-8 text-red-600"
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
					) : (
						<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
					)}
				</div>

				<h3 className="text-xl font-semibold text-gray-800 mb-2">
					{status === "error" ? "Error" : currentStep.label}
					{status !== "done" && status !== "error" && dots}
				</h3>

				<p className="text-gray-600">{message || currentStep.description}</p>

				{progress !== undefined && (
					<div className="mt-4">
						<div className="flex justify-between text-sm text-gray-600 mb-1">
							<span>Progress</span>
							<span>{Math.round(progress)}%</span>
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2">
							<div
								className="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style={{ width: `${progress}%` }}
							></div>
						</div>
					</div>
				)}
			</div>

			{/* Steps Indicator */}
			{showSteps && (
				<div className="space-y-4">
					{statusSteps.map((step, index) => {
						const isActive = index === currentStepIndex;
						const isCompleted = index < currentStepIndex || status === "done";
						const isError = status === "error" && index === currentStepIndex;

						return (
							<div key={step.key} className="flex items-center space-x-4">
								<div className="flex-shrink-0">
									<div
										className={`
											w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
											${
												isCompleted
													? "bg-green-100 text-green-600"
													: isActive && !isError
														? "bg-blue-100 text-blue-600"
														: isError
															? "bg-red-100 text-red-600"
															: "bg-gray-100 text-gray-400"
											}
										`}
									>
										{isCompleted ? (
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										) : isError ? (
											<svg
												className="w-4 h-4"
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
										) : (
											<span>{index + 1}</span>
										)}
									</div>
								</div>

								<div className="flex-grow">
									<div
										className={`
											text-sm font-medium
											${
												isActive
													? "text-gray-900"
													: isCompleted
														? "text-green-600"
														: "text-gray-400"
											}
										`}
									>
										{step.label}
									</div>
									<div className="text-xs text-gray-500 mt-1">
										{step.description}
									</div>
								</div>

								{isActive && !isCompleted && !isError && (
									<div className="flex-shrink-0">
										<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Error Message */}
			{status === "error" && (
				<div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
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
							<h3 className="text-sm font-medium text-red-800">
								Transcription Failed
							</h3>
							<div className="mt-2 text-sm text-red-700">
								<p>
									{message ||
										"An error occurred during transcription. Please try again."}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
