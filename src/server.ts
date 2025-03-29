import express, { type Request, type Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
	res.json({ message: "Welcome to the API!" });
});

// Start server
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
