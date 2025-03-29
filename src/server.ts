import express, {
	type Request,
	type Response,
	type RequestHandler,
} from "express";
import dotenv from "dotenv";
import path from "node:path";
import LLMService from "./services/llm-service";
import TranscriptionService from "./services/transcription-service";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.raw({ type: "audio/wav", limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Services
const llmService = new LLMService();
const transcriptionService = new TranscriptionService();

// Routes
app.get("/", (req: Request, res: Response) => {
	res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.post("/transcribe", (async (req: Request, res: Response) => {
	try {
		if (!Buffer.isBuffer(req.body)) {
			return res.status(400).json({ error: "Expected audio data" });
		}

		const transcribedText = await transcriptionService.transcribe(req.body);
		res.json({ text: transcribedText });
	} catch (error) {
		console.error("Error transcribing audio:", error);
		res.status(500).json({ error: "Failed to transcribe audio" });
	}
}) as RequestHandler);

app.post("/chat", async (req: Request, res: Response) => {
	const message = req.body.message;

	// Set headers for SSE
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");

	// Create a stream from the LLM service
	const stream = await llmService.chatStream(message);

	// Handle client disconnect
	req.on("close", () => {
		// Client disconnected, stream will naturally end
	});

	// Stream the response
	try {
		for await (const chunk of stream) {
			res.write(`data: ${JSON.stringify({ message: chunk })}\n\n`);
		}
		res.write("data: [DONE]\n\n");
		res.end();
	} catch (error) {
		console.error("Streaming error:", error);
		res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
		res.end();
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
