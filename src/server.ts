import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import LLMService from "./services/llm-service";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
	res.json({ message: "Welcome to the API!" });
});

app.post("/chat", async (req: Request, res: Response) => {
	const message = req.body.message;

	const llmService = new LLMService();
	const response = await llmService.chat(message);

	res.json({ message: response });
});

// Start server
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
