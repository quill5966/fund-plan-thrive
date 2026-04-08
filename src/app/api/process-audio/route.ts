import { NextRequest, NextResponse } from "next/server";
import { speechService } from "@/services/speech/transcribe";
import { storageService } from "@/services/speech/storage";
import { advisorService } from "@/services/advisor";
import { getSession } from "@/lib/session";

/**
 * POST /api/process-audio
 * 
 * Accepts an audio file upload, transcribes it using OpenAI Whisper,
 * processes it through the AI Advisor to extract financial data,
 * and returns the results.
 * 
 * Identity is resolved from the iron-session cookie — never from the client.
 * 
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 */
export async function POST(request: NextRequest) {
    try {
        // ── Session check ────────────────────────────────────────────
        const session = await getSession();
        if (!session.isAuthenticated || !session.userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = session.userId;

        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;

        if (!audioFile) {
            return NextResponse.json(
                { error: "No audio file provided. Send a file under the 'audio' field." },
                { status: 400 }
            );
        }

        // 1. Convert File to Buffer for processing
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Transcribe the audio
        const transcribedText = await speechService.transcribeAudio(
            buffer,
            audioFile.name
        );

        // 3. Log transcription to storage AND create conversation record
        const logEntry = await storageService.logTranscription({
            userId,
            fileName: audioFile.name,
            fileSize: audioFile.size,
            transcribedText,
        });

        // 4. Process transcription through AI Advisor to extract and update financial data
        const advisorResult = await advisorService.processTranscription(userId, transcribedText);

        return NextResponse.json({
            success: true,
            transcription: transcribedText,
            logId: logEntry.id,
            userId,
            advisor: {
                actionsPerformed: advisorResult.actionsPerformed,
                llmResponse: advisorResult.llmResponse,
                pendingConfirmation: advisorResult.pendingConfirmation,
            },
        });
    } catch (error) {
        console.error("Error processing audio:", error);
        return NextResponse.json(
            { error: "Failed to process audio file." },
            { status: 500 }
        );
    }
}
