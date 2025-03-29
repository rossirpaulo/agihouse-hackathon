import { ElevenLabsService } from '../services/eleven';
import fs from 'fs';
import path from 'path';
import player from 'play-sound';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTextToSpeech() {
  try {
    const elevenLabs = new ElevenLabsService();
    const testText = "Hello, this is a test of the text to speech service.";
    
    console.log('Converting text to speech...');
    const audioStream = await elevenLabs.textToSpeech(testText);
    
    // Create a temporary file to play
    const tempFile = path.join(process.cwd(), 'temp-audio.mp3');
    const writeStream = fs.createWriteStream(tempFile);
    
    audioStream.pipe(writeStream);
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log('Playing audio...');
        // Play the audio
        const audio = player();
        audio.play(tempFile, (err) => {
          if (err) {
            console.error('Error playing audio:', err);
          }
          // Clean up temp file after playing
          fs.unlinkSync(tempFile);
          resolve(null);
        });
      });
      writeStream.on('error', (err) => {
        console.error('Error writing audio:', err);
        reject(err);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testTextToSpeech();
