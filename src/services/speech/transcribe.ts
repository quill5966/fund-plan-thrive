import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const speechService = {
  /**
   * Transcribes an audio file using OpenAI Whisper.
   * @param fileBuffer The buffer of the audio file.
   * @param fileName The original filename (used to determine extension).
   */
  async transcribeAudio(fileBuffer: Buffer, fileName: string): Promise<string> {
    // Generate unique temp filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(fileName) || '.webm';
    const tmpFileName = `audio_${timestamp}${ext}`;
    const tmpPath = path.join(os.tmpdir(), "fund-plan-thrive", tmpFileName);

    try {
      // Ensure tmp dir exists
      if (!fs.existsSync(path.dirname(tmpPath))) {
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
      }

      fs.writeFileSync(tmpPath, fileBuffer);
      const fileStream = fs.createReadStream(tmpPath);

      const response = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
      });

      // Cleanup
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }

      return response.text;
    } catch (error) {
      // Cleanup on error
      try {
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      } catch {
        // Ignore cleanup errors
      }

      console.error("Error transcribing audio:", error);
      throw new Error("Failed to transcribe audio.");
    }
  },

  /**
   * Helper to simple read a local static file for testing
   */
  async transcribeStaticFile(filePath: string): Promise<string> {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found at ${absolutePath}`);
    }

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(absolutePath),
      model: "whisper-1",
    });

    return response.text;
  }
};
