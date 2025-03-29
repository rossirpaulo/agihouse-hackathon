import { ElevenLabsClient } from "elevenlabs";

export class ElevenLabsService {
  private client: ElevenLabsClient;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }
    this.client = new ElevenLabsClient({
      apiKey
    });
  }

  async textToSpeech(text: string, voiceId: string = 'JBFqnCBsd6RMkjVDRZzb'): Promise<NodeJS.ReadableStream> {
    try {
      const audioStream = await this.client.textToSpeech.convertAsStream(
        voiceId,
        {
          output_format: "mp3_44100_128",
          text: text,
          model_id: "eleven_multilingual_v2"
        }
      );
      return audioStream;
    } catch (error) {
      console.error('Error in text to speech conversion:', error);
      throw error;
    }
  }
}