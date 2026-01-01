import { NextRequest, NextResponse } from "next/server";
import { speechService } from "@/services/speech/transcribe";
import { storageService } from "@/services/speech/storage";
import { userService } from "@/services/user";
import { advisorService } from "@/services/advisor";

/**
 * POST /api/process-audio
 * 
 * Accepts an audio file upload, transcribes it using OpenAI Whisper,
 * processes it through the AI Advisor to extract financial data,
 * and returns the results.
 * 
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const userName = formData.get("userId") as string;

        if (!audioFile) {
            return NextResponse.json(
                { error: "No audio file provided. Send a file under the 'audio' field." },
                { status: 400 }
            );
        }

        if (!userName || !userName.trim()) {
            return NextResponse.json(
                { error: "Please enter your name." },
                { status: 400 }
            );
        }

        // 1. Get or create user in the database
        const user = await userService.getOrCreateUser(userName);

        // 2. Convert File to Buffer for processing
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Transcribe the audio
        const transcribedText = await speechService.transcribeAudio(
            buffer,
            audioFile.name
        );

        // 4. Log transcription to storage AND create conversation record
        const logEntry = await storageService.logTranscription({
            userId: user.id,
            fileName: audioFile.name,
            fileSize: audioFile.size,
            transcribedText,
        });

        // 5. Process transcription through AI Advisor to extract and update financial data
        const advisorResult = await advisorService.processTranscription(user.id, transcribedText);

        const response = NextResponse.json({
            success: true,
            transcription: transcribedText,
            logId: logEntry.id,
            userId: user.id,
            advisor: {
                actionsPerformed: advisorResult.actionsPerformed,
                llmResponse: advisorResult.llmResponse,
            },
        });

        // Set session cookie
        response.cookies.set("userId", user.id, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            secure: process.env.NODE_ENV === "production", // Best practice
            sameSite: "strict",
        });

        return response;
    } catch (error) {
        console.error("Error processing audio:", error);
        return NextResponse.json(
            { error: "Failed to process audio file." },
            { status: 500 }
        );
    }
}
