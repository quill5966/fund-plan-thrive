import fs from "fs";
import path from "path";
import { db } from "@/db";
import { conversations } from "@/db/schema";

const STORAGE_DIR = path.join(process.cwd(), "storage", "transcriptions");

interface TranscriptionLog {
    id: string;
    userId: string;
    timestamp: string;
    fileName: string;
    fileSize: number;
    transcribedText: string;
}

/**
 * Simple file-based storage service for MVP.
 * Simulates object storage by writing JSON logs to a local folder.
 * Can be replaced with S3/GCS in production.
 */
export const storageService = {
    /**
     * Ensures the storage directory exists.
     */
    ensureStorageDir(): void {
        if (!fs.existsSync(STORAGE_DIR)) {
            fs.mkdirSync(STORAGE_DIR, { recursive: true });
        }
    },

    /**
     * Logs a transcription to storage, creates a conversation record in DB, and returns the log entry.
     */
    async logTranscription(data: {
        userId: string;
        fileName: string;
        fileSize: number;
        transcribedText: string;
    }): Promise<TranscriptionLog> {
        this.ensureStorageDir();

        const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const timestamp = new Date().toISOString();

        const logEntry: TranscriptionLog = {
            id,
            userId: data.userId,
            timestamp,
            fileName: data.fileName,
            fileSize: data.fileSize,
            transcribedText: data.transcribedText,
        };

        // 1. Write to file storage
        const logPath = path.join(STORAGE_DIR, `${id}.json`);
        fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));
        console.log(`[Storage] Transcription logged: ${id}`);

        // 2. Create conversation record in database
        // NOTE: This service is deprecated in favor of /api/chat
        await db.insert(conversations).values({
            userId: data.userId,
            status: 'completed',
            summary: `Audio file: ${data.fileName}`,
        });
        console.log(`[Storage] Conversation record created for: ${id}`);

        return logEntry;
    },

    /**
     * Retrieves a transcription log by ID.
     */
    async getTranscription(id: string): Promise<TranscriptionLog | null> {
        const logPath = path.join(STORAGE_DIR, `${id}.json`);

        if (!fs.existsSync(logPath)) {
            return null;
        }

        const content = fs.readFileSync(logPath, "utf-8");
        return JSON.parse(content) as TranscriptionLog;
    },

    /**
     * Lists all transcription logs.
     */
    async listTranscriptions(): Promise<TranscriptionLog[]> {
        this.ensureStorageDir();

        const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".json"));
        const logs: TranscriptionLog[] = [];

        for (const file of files) {
            const content = fs.readFileSync(path.join(STORAGE_DIR, file), "utf-8");
            logs.push(JSON.parse(content));
        }

        return logs.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    },
};
