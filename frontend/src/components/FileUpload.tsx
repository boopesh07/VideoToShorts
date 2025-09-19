"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
	onFileSelect: (file: File) => void;
	accept?: string;
	maxSizeMB?: number;
	disabled?: boolean;
}

export default function FileUpload({
	onFileSelect,
	accept = "audio/*,video/*",
	maxSizeMB = 100,
	disabled = false,
}: FileUploadProps) {
	const [dragActive, setDragActive] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const validateFile = (file: File): boolean => {
		setError(null);

		// Check file size
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		if (file.size > maxSizeBytes) {
			setError(`File size must be less than ${maxSizeMB}MB`);
			return false;
		}

		// Check file type
		const allowedTypes = accept.split(",").map((type) => type.trim());
		const isValidType = allowedTypes.some((type) => {
			if (type.endsWith("/*")) {
				const baseType = type.replace("/*", "");
				return file.type.startsWith(baseType);
			}
			return file.type === type;
		});

		if (!isValidType) {
			setError("Please select a valid audio or video file");
			return false;
		}

		return true;
	};

	const handleFileSelect = (file: File) => {
		if (validateFile(file)) {
			onFileSelect(file);
		}
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (disabled) return;

		const files = e.dataTransfer.files;
		if (files && files[0]) {
			handleFileSelect(files[0]);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		const files = e.target.files;
		if (files && files[0]) {
			handleFileSelect(files[0]);
		}
	};

	const openFileDialog = () => {
		if (!disabled && inputRef.current) {
			inputRef.current.click();
		}
	};

	return (
		<div className="w-full max-w-2xl mx-auto">
			<div
				className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out backdrop-blur-sm
          ${
						dragActive
							? "border-red-500 bg-red-900/20"
							: "border-zinc-800/50 hover:border-zinc-700"
					}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-900/30"}
        `}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={openFileDialog}
			>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={handleInputChange}
					className="hidden"
					disabled={disabled}
				/>

				<div className="flex flex-col items-center justify-center space-y-4">
					<div className="p-4 bg-red-500/10 rounded-full">
						<svg
							className="w-8 h-8 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
					</div>

					<div>
						<p className="text-lg font-medium text-zinc-100">
							{dragActive
								? "Drop your file here"
								: "Choose a file or drag it here"}
						</p>
						<p className="text-sm text-zinc-400 mt-1">
							Supports audio and video files up to {maxSizeMB}MB
						</p>
					</div>

					<button
						type="button"
						className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:scale-105 transition-all duration-200 disabled:opacity-50 font-medium"
						disabled={disabled}
						onClick={(e) => {
							e.stopPropagation();
							openFileDialog();
						}}
					>
						Select File
					</button>
				</div>
			</div>

			{error && (
				<div className="mt-3 p-3 bg-red-900/50 border border-red-800/50 rounded-lg backdrop-blur-sm">
					<p className="text-sm text-red-300">{error}</p>
				</div>
			)}
		</div>
	);
}
