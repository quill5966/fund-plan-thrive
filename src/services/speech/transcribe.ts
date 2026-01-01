import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const speechService = {
  /**
   * Transcribes an audio file using OpenAI Whisper.
   * @param fileBuffer The buffer of the audio file.
   * @param mimeType The mime type of the file (e.g., 'audio/mp3').
   */
  async transcribeAudio(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      // Whisper requires a file-like object. We can simulate this or write to tmp.
      // For NodeJS environment properly, we often need to write to a tmp file 
      // because the SDK expects a ReadStream or File object.
      
      const tmpPath = path.join(process.cwd(), "tmp", fileName);
      
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
      fs.unlinkSync(tmpPath);

      return response.text;
    } catch (error) {
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
