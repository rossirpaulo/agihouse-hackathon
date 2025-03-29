class VoiceChat {
	constructor() {
		this.micButton = document.getElementById("micButton");
		this.sendButton = document.getElementById("sendButton");
		this.textInput = document.getElementById("textInput");
		this.statusText = document.getElementById("statusText");
		this.chatMessages = document.getElementById("chatMessages");
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;

		this.init();
	}

	getAvatarUrl(type) {
		return `/images/${type === "user" ? "user" : "putin"}.png`;
	}

	createProfileElement(type) {
		const profileDiv = document.createElement("div");
		profileDiv.classList.add("user-profile");

		const avatar = document.createElement("img");
		avatar.classList.add("user-avatar");
		avatar.src = this.getAvatarUrl(type);
		avatar.alt = type === "user" ? "User" : "Vladimir";

		const name = document.createElement("div");
		name.classList.add("user-name");
		name.textContent = type === "user" ? "You" : "Vladimir";

		profileDiv.appendChild(avatar);
		profileDiv.appendChild(name);

		return profileDiv;
	}

	init() {
		this.micButton.addEventListener("click", () => this.toggleRecording());
		this.sendButton.addEventListener("click", () => this.sendTextMessage());
		this.textInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.sendTextMessage();
			}
		});
	}

	async toggleRecording() {
		if (!this.isRecording) {
			await this.startRecording();
		} else {
			await this.stopRecording();
		}
	}

	async startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.mediaRecorder = new MediaRecorder(stream);
			this.audioChunks = [];

			this.mediaRecorder.ondataavailable = (event) => {
				this.audioChunks.push(event.data);
			};

			this.mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" });
				await this.processAudio(audioBlob);

				// Stop all tracks to release the microphone
				for (const track of stream.getTracks()) {
					track.stop();
				}
			};

			this.mediaRecorder.start();
			this.isRecording = true;
			this.micButton.classList.add("recording");
			this.statusText.textContent = "Recording... Click to stop";
		} catch (error) {
			console.error("Error accessing microphone:", error);
			this.statusText.textContent =
				"Error accessing microphone. Please check permissions.";
		}
	}

	async stopRecording() {
		if (this.mediaRecorder && this.isRecording) {
			this.mediaRecorder.stop();
			this.isRecording = false;
			this.micButton.classList.remove("recording");
			this.statusText.textContent = "Processing...";
		}
	}

	async processAudio(audioBlob) {
		try {
			// First, send the audio for transcription
			const transcriptionResponse = await fetch("/transcribe", {
				method: "POST",
				headers: {
					"Content-Type": "audio/wav",
				},
				body: audioBlob,
			});

			if (!transcriptionResponse.ok) {
				throw new Error("Transcription failed");
			}

			const transcriptionData = await transcriptionResponse.json();
			const transcribedText = transcriptionData.text;

			// Add the transcribed text to the chat
			this.addMessage(transcribedText, "user");

			// Create a message container for the streaming response
			const messageWrapper = document.createElement("div");
			messageWrapper.classList.add("message-wrapper", "assistant");

			const profileDiv = this.createProfileElement("assistant");
			const messageDiv = document.createElement("div");
			messageDiv.classList.add("message", "assistant-message", "typing");

			messageWrapper.appendChild(profileDiv);
			messageWrapper.appendChild(messageDiv);

			this.chatMessages.appendChild(messageWrapper);

			// Send the transcribed text to the chat endpoint with streaming
			const response = await fetch("/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: transcribedText,
				}),
			});

			if (!response.ok) {
				throw new Error("Chat request failed");
			}

			// Handle streaming response
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") {
							messageDiv.classList.remove("typing");
							break;
						}
						try {
							const parsed = JSON.parse(data);
							if (parsed.message) {
								messageDiv.textContent = parsed.message;
								this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
							}
						} catch (e) {
							console.error("Error parsing SSE data:", e);
						}
					}
				}
			}

			this.statusText.textContent = "Click the microphone to start speaking";
		} catch (error) {
			console.error("Error processing audio:", error);
			this.addMessage(
				"Sorry, there was an error processing your message.",
				"assistant",
			);
			this.statusText.textContent = "Error processing audio. Please try again.";
		}
	}

	async sendTextMessage() {
		const text = this.textInput.value.trim();
		if (!text) return;

		// Add the message to chat
		this.addMessage(text, "user");
		this.textInput.value = "";

		// Create a message container for the streaming response
		const messageWrapper = document.createElement("div");
		messageWrapper.classList.add("message-wrapper", "assistant");

		const profileDiv = this.createProfileElement("assistant");
		const messageDiv = document.createElement("div");
		messageDiv.classList.add("message", "assistant-message", "typing");

		messageWrapper.appendChild(profileDiv);
		messageWrapper.appendChild(messageDiv);

		this.chatMessages.appendChild(messageWrapper);

		try {
			// Send the text to the chat endpoint with streaming
			const response = await fetch("/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: text,
				}),
			});

			if (!response.ok) {
				throw new Error("Chat request failed");
			}

			// Handle streaming response
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") {
							messageDiv.classList.remove("typing");
							break;
						}
						try {
							const parsed = JSON.parse(data);
							if (parsed.message) {
								messageDiv.textContent = parsed.message;
								this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
							}
						} catch (e) {
							console.error("Error parsing SSE data:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error sending message:", error);
			this.addMessage(
				"Sorry, there was an error processing your message.",
				"assistant",
			);
		}
	}

	addMessage(text, type) {
		const messageWrapper = document.createElement("div");
		messageWrapper.classList.add("message-wrapper", type);

		const profileDiv = this.createProfileElement(type);
		const messageDiv = document.createElement("div");
		messageDiv.classList.add("message", `${type}-message`);
		messageDiv.textContent = text;

		messageWrapper.appendChild(profileDiv);
		messageWrapper.appendChild(messageDiv);

		this.chatMessages.appendChild(messageWrapper);
		this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
	}
}

// Initialize the voice chat when the page loads
document.addEventListener("DOMContentLoaded", () => {
	new VoiceChat();
});
