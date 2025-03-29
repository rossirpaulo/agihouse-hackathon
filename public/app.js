class VoiceChat {
	constructor() {
		this.micButton = document.getElementById("micButton");
		this.statusText = document.getElementById("statusText");
		this.chatMessages = document.getElementById("chatMessages");
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;

		this.init();
	}

	init() {
		this.micButton.addEventListener("click", () => this.toggleRecording());
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

			// Send the transcribed text to the chat endpoint
			const chatResponse = await fetch("/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: transcribedText,
				}),
			});

			if (!chatResponse.ok) {
				throw new Error("Chat request failed");
			}

			const chatData = await chatResponse.json();
			this.addMessage(chatData.message, "assistant");
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

	addMessage(text, type) {
		const messageDiv = document.createElement("div");
		messageDiv.classList.add("message", `${type}-message`);
		messageDiv.textContent = text;
		this.chatMessages.appendChild(messageDiv);
		this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
	}
}

// Initialize the voice chat when the page loads
document.addEventListener("DOMContentLoaded", () => {
	new VoiceChat();
});
