import { NextRequest, NextResponse } from "next/server";
import { gladiaService } from "@/lib/gladia";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const videoUrl = formData.get("videoUrl") as string;
		const options = formData.get("options")
			? JSON.parse(formData.get("options") as string)
			: {};

		if (!file && !videoUrl) {
			return NextResponse.json(
				{ error: "Either file or videoUrl is required" },
				{ status: 400 },
			);
		}

		let result;

		if (file) {
			// Transcribe uploaded file
			result = await gladiaService.transcribeFile(file, {
				detect_language: true,
				language: "en",
				diarization: true,
				subtitles: true,
				subtitles_config: {
					formats: ["srt", "vtt"],
				},
				translation: false,
				summarization: true,
				chapterization: true,
				named_entity_recognition: true,
				sentiment_analysis: true,
				enable_code_switching: false,
				code_switching_config: {
					languages: [],
				},
				...options,
			});
		} else {
			// Transcribe from URL
			result = await gladiaService.transcribeFromUrl(videoUrl, {
				detect_language: true,
				language: "en",
				diarization: true,
				subtitles: true,
				subtitles_config: {
					formats: ["srt", "vtt"],
				},
				translation: false,
				summarization: true,
				chapterization: true,
				named_entity_recognition: true,
				sentiment_analysis: true,
				enable_code_switching: false,
				code_switching_config: {
					languages: [],
				},
				...options,
			});
		}

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error("Transcription API error:", error);
		return NextResponse.json(
			{ error: "Failed to process transcription request" },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Transcription ID is required" },
				{ status: 400 },
			);
		}

		const result = await gladiaService.getTranscriptionResult(id);

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error("Get transcription API error:", error);
		return NextResponse.json(
			{ error: "Failed to get transcription result" },
			{ status: 500 },
		);
	}
}
