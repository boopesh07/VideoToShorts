import axios, { AxiosResponse } from "axios";

// Types for Gladia API
export interface GladiaTranscriptionRequest {
	audio_url?: string;
	audio?: File;
	language?: string;
	detect_language?: boolean;
	enable_code_switching?: boolean;
	code_switching_config?: {
		languages: string[];
	};
	context_prompt?: string;
	custom_vocabulary?: boolean;
	custom_vocabulary_config?: {
		vocabulary: Array<
			| string
			| {
					value: string;
					pronunciations?: string[];
					intensity?: number;
					language?: string;
			  }
		>;
		default_intensity?: number;
	};
	diarization?: boolean;
	diarization_config?: {
		number_of_speakers?: number;
		min_speakers?: number;
		max_speakers?: number;
		enhanced?: boolean;
	};
	custom_spelling?: boolean;
	custom_spelling_config?: {
		spelling_dictionary: { [key: string]: string[] };
	};
	subtitles?: boolean;
	subtitles_config?: {
		formats: string[];
		minimum_duration?: number;
		maximum_duration?: number;
		maximum_characters_per_row?: number;
		maximum_rows_per_caption?: number;
		style?: string;
	};
	translation?: boolean;
	translation_config?: {
		target_languages: string[];
		model?: string;
		match_original_utterances?: boolean;
		lipsync?: boolean;
		context_adaptation?: boolean;
		context?: string;
		informal?: boolean;
	};
	summarization?: boolean;
	summarization_config?: {
		type?: string;
	};
	chapterization?: boolean;
	named_entity_recognition?: boolean;
	sentiment_analysis?: boolean;
	moderation?: boolean;
	structured_data_extraction?: boolean;
	structured_data_extraction_config?: {
		classes: string[];
	};
	audio_to_llm?: boolean;
	audio_to_llm_config?: {
		prompts: string[];
	};
	custom_metadata?: { [key: string]: any };
	sentences?: boolean;
	display_mode?: boolean;
	punctuation_enhanced?: boolean;
	name_consistency?: boolean;
	callback?: boolean;
	callback_config?: {
		url: string;
		method?: string;
	};
	callback_url?: string;
}

export interface GladiaTranscriptionResponse {
	id: string;
	request_id: string;
	status: "queued" | "processing" | "done" | "error";
	result_url?: string;
	error?: string;
}

export interface GladiaTranscriptionResult {
	id: string;
	request_id: string;
	status: string;
	result: {
		transcription: {
			utterances: Array<{
				text: string;
				start: number;
				end: number;
				speaker: number;
				channel: number;
				confidence: number;
				language: string;
				words: Array<{
					word: string;
					start: number;
					end: number;
					confidence: number;
				}>;
			}>;
			full_transcript: string;
			languages?: Array<{
				language: string;
				confidence: number;
			}>;
			subtitles?: {
				srt?: string;
				vtt?: string;
			};
		};
		metadata: {
			audio_duration: number;
			number_of_distinct_channels: number;
			billing_time: number;
			transcription_time: number;
		};
		translation?: {
			success: boolean;
			is_empty: boolean;
			results: any;
			exec_time: number;
			error: any;
		};
		summarization?: {
			success: boolean;
			is_empty: boolean;
			results: string;
			exec_time: number;
			error: any;
		};
		chapterization?: {
			success: boolean;
			is_empty: boolean;
			results: Array<{
				headline: string;
				summary: string;
				start: number;
				end: number;
			}>;
			exec_time: number;
			error: any;
		};
		named_entity_recognition?: {
			success: boolean;
			is_empty: boolean;
			results: Array<{
				entity: string;
				category: string;
				start: number;
				end: number;
				confidence: number;
			}>;
			exec_time: number;
			error: any;
		};
		sentiment_analysis?: {
			success: boolean;
			is_empty: boolean;
			results: Array<{
				segment: string;
				sentiment: string;
				confidence: number;
				start: number;
				end: number;
			}>;
			exec_time: number;
			error: any;
		};
	};
}

export class GladiaService {
	private apiKey: string;
	private baseURL: string;

	constructor() {
		this.apiKey = process.env.GLADIA_API_KEY || "";
		this.baseURL = process.env.GLADIA_API_URL || "https://api.gladia.io/v2";

		console.log("🔍 Environment Check:");
		console.log("- GLADIA_API_KEY exists:", !!process.env.GLADIA_API_KEY);
		console.log("- GLADIA_API_KEY length:", this.apiKey.length);
		console.log("- GLADIA_API_URL:", this.baseURL);

		if (!this.apiKey) {
			throw new Error("GLADIA_API_KEY environment variable is required");
		}
	}

	private getHeaders() {
		return {
			"x-gladia-key": this.apiKey,
			"Content-Type": "application/json",
		};
	}

	private getFormHeaders() {
		return {
			"x-gladia-key": this.apiKey,
		};
	}

	/**
	 * Upload a file to Gladia for transcription
	 */
	async uploadFile(file: File): Promise<{ audio_url: string }> {
		const formData = new FormData();
		formData.append("audio", file);

		try {
			const response: AxiosResponse<{ audio_url: string }> = await axios.post(
				`${this.baseURL}/upload`,
				formData,
				{
					headers: this.getFormHeaders(),
				},
			);
			return response.data;
		} catch (error) {
			console.error("Error uploading file:", error);
			throw new Error("Failed to upload file to Gladia");
		}
	}

	/**
	 * Validate request parameters before sending
	 */
	private validateRequest(request: GladiaTranscriptionRequest): void {
		if (!request.audio_url && !request.audio) {
			throw new Error("Either audio_url or audio file must be provided");
		}

		// Remove any undefined or null values that might cause issues
		Object.keys(request).forEach((key) => {
			if (request[key as keyof GladiaTranscriptionRequest] === undefined) {
				delete request[key as keyof GladiaTranscriptionRequest];
			}
		});
	}

	/**
	 * Start a transcription job
	 */
	async startTranscription(
		request: GladiaTranscriptionRequest,
	): Promise<GladiaTranscriptionResponse> {
		try {
			// Validate and clean request
			this.validateRequest(request);

			const headers = this.getHeaders();
			console.log("🔍 Gladia API Request:", JSON.stringify(request, null, 2));
			console.log("🔍 Gladia API Headers:", {
				...headers,
				"x-gladia-key": "[REDACTED]",
			});
			console.log("🔍 Gladia API URL:", `${this.baseURL}/pre-recorded`);

			const response: AxiosResponse<GladiaTranscriptionResponse> =
				await axios.post(`${this.baseURL}/pre-recorded`, request, {
					headers,
				});

			console.log("✅ Gladia API Response:", {
				status: response.status,
				id: response.data.id,
				result_url: response.data.result_url,
			});

			return response.data;
		} catch (error: any) {
			console.error("❌ Error starting transcription:");
			console.error("- Error type:", error.constructor.name);
			console.error("- Error message:", error.message);

			if (error.response) {
				console.error("- HTTP Status:", error.response.status);
				console.error("- Status Text:", error.response.statusText);
				console.error("- Response Headers:", error.response.headers);
				console.error(
					"- Response Data:",
					JSON.stringify(error.response.data, null, 2),
				);

				// Log request details for debugging
				console.error("- Request URL:", error.config?.url);
				console.error("- Request Method:", error.config?.method);
				console.error("- Request Headers:", {
					...error.config?.headers,
					"x-gladia-key": "[REDACTED]",
				});
				console.error(
					"- Request Data:",
					typeof error.config?.data === "string"
						? error.config.data
						: JSON.stringify(error.config?.data, null, 2),
				);
			} else if (error.request) {
				console.error("- No response received");
				console.error("- Request details:", error.request);
			}

			// Provide specific error messages based on status code
			let errorMessage = "Failed to start transcription";
			if (error.response?.status === 400) {
				errorMessage =
					"Invalid request parameters. Please check the API documentation.";
			} else if (error.response?.status === 401) {
				errorMessage = "Authentication failed. Please check your API key.";
			} else if (error.response?.status === 403) {
				errorMessage = "Access forbidden. Please check your API permissions.";
			} else if (error.response?.status === 429) {
				errorMessage = "Rate limit exceeded. Please try again later.";
			}

			throw new Error(
				`${errorMessage}: ${error.response?.data?.error || error.response?.data?.message || error.message}`,
			);
		}
	}

	/**
	 * Get transcription result
	 */
	async getTranscriptionResult(id: string): Promise<GladiaTranscriptionResult> {
		try {
			const response: AxiosResponse<GladiaTranscriptionResult> =
				await axios.get(`${this.baseURL}/pre-recorded/${id}`, {
					headers: this.getHeaders(),
				});
			return response.data;
		} catch (error) {
			console.error("Error getting transcription result:", error);
			throw new Error("Failed to get transcription result");
		}
	}

	/**
	 * Poll for transcription completion
	 */
	async pollTranscriptionResult(
		id: string,
		onProgress?: (status: string) => void,
		maxAttempts: number = 60,
		intervalMs: number = 5000,
	): Promise<GladiaTranscriptionResult> {
		let attempts = 0;

		while (attempts < maxAttempts) {
			try {
				const result = await this.getTranscriptionResult(id);

				if (onProgress) {
					onProgress(result.status);
				}

				if (result.status === "done") {
					return result;
				}

				if (result.status === "error") {
					throw new Error("Transcription failed");
				}

				// Wait before next poll
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
				attempts++;
			} catch (error) {
				console.error("Error polling transcription:", error);
				if (attempts >= maxAttempts - 1) {
					throw error;
				}
				attempts++;
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
			}
		}

		throw new Error("Transcription timed out");
	}

	/**
	 * Complete transcription workflow: upload file and get result
	 */
	async transcribeFile(
		file: File,
		options: Omit<GladiaTranscriptionRequest, "audio_url" | "audio"> = {},
		onProgress?: (status: string) => void,
	): Promise<GladiaTranscriptionResult> {
		try {
			// Step 1: Upload file
			if (onProgress) onProgress("uploading");
			const uploadResult = await this.uploadFile(file);

			// Step 2: Start transcription
			if (onProgress) onProgress("starting");
			const transcriptionResponse = await this.startTranscription({
				...options,
				audio_url: uploadResult.audio_url,
			});

			// Step 3: Poll for completion
			if (onProgress) onProgress("processing");
			const result = await this.pollTranscriptionResult(
				transcriptionResponse.id,
				onProgress,
			);

			return result;
		} catch (error) {
			console.error("Error in complete transcription workflow:", error);
			throw error;
		}
	}

	/**
	 * Transcribe from URL
	 */
	async transcribeFromUrl(
		audioUrl: string,
		options: Omit<GladiaTranscriptionRequest, "audio_url" | "audio"> = {},
		onProgress?: (status: string) => void,
	): Promise<GladiaTranscriptionResult> {
		try {
			// Step 1: Start transcription
			if (onProgress) onProgress("starting");
			const transcriptionResponse = await this.startTranscription({
				...options,
				audio_url: audioUrl,
			});

			// Step 2: Poll for completion
			if (onProgress) onProgress("processing");
			const result = await this.pollTranscriptionResult(
				transcriptionResponse.id,
				onProgress,
			);

			return result;
		} catch (error) {
			console.error("Error transcribing from URL:", error);
			throw error;
		}
	}
}

// Export singleton instance
export const gladiaService = new GladiaService();
