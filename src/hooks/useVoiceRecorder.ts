"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderReturn {
    isRecording: boolean;
    isSupported: boolean;
    audioBlob: Blob | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    clearRecording: () => void;
    error: string | null;
}

/**
 * React hook for capturing audio using the MediaRecorder API.
 * Provides push-to-talk functionality for voice input.
 * 
 * Usage:
 *   const { isRecording, audioBlob, startRecording, stopRecording } = useVoiceRecorder();
 *   
 *   // On button press: await startRecording()
 *   // On button release: stopRecording()
 *   // Then send audioBlob to /api/chat
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // Check if MediaRecorder is supported
    const isSupported = typeof window !== "undefined" &&
        "MediaRecorder" in window &&
        "navigator" in window &&
        "mediaDevices" in navigator;

    const startRecording = useCallback(async () => {
        if (!isSupported) {
            setError("Voice recording is not supported in this browser.");
            return;
        }

        try {
            setError(null);
            setAudioBlob(null);
            chunksRef.current = [];

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            });
            streamRef.current = stream;

            // Create MediaRecorder with best available format
            // Prefer webm/opus for quality, fallback to other formats
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : MediaRecorder.isTypeSupported("audio/mp4")
                        ? "audio/mp4"
                        : "";

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm"
                });
                setAudioBlob(blob);

                // Clean up stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            recorder.onerror = (event) => {
                setError("Recording error occurred.");
                console.error("MediaRecorder error:", event);
            };

            // Start recording
            recorder.start(100); // Collect data every 100ms
            setIsRecording(true);

        } catch (err) {
            console.error("Failed to start recording:", err);
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                setError("Microphone access denied. Please allow microphone access to use voice input.");
            } else {
                setError("Failed to start recording. Please check your microphone.");
            }
        }
    }, [isSupported]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const clearRecording = useCallback(() => {
        setAudioBlob(null);
        setError(null);
    }, []);

    return {
        isRecording,
        isSupported,
        audioBlob,
        startRecording,
        stopRecording,
        clearRecording,
        error,
    };
}
