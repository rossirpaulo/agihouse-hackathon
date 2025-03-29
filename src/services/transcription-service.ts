import OpenAI from "openai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export default class TranscriptionService {
	private openai: OpenAI;

	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}

	async transcribe(audioBuffer: Buffer): Promise<string> {
		try {
			// Create a temporary file
			const tempDir = os.tmpdir();
			const tempFile = path.join(tempDir, `recording-${Date.now()}.wav`);

			// Write the audio buffer to the temporary file
			fs.writeFileSync(tempFile, audioBuffer);

			// Create a readable stream from the temporary file
			const audioStream = fs.createReadStream(tempFile);

			// Call Whisper API
			const transcription = await this.openai.audio.transcriptions.create({
				file: audioStream,
				model: "whisper-1",
				language: "en",
			});

			// Clean up the temporary file
			fs.unlinkSync(tempFile);

			return transcription.text;
		} catch (error) {
			console.error("Transcription error:", error);
			throw new Error("Failed to transcribe audio");
		}
	}
}
