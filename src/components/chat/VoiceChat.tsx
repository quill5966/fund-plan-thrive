"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Button } from "@/components/ui";
import { Mic, Send, Square } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface VoiceChatProps {
    userName: string;
    onDataExtracted?: () => void;
}

export function VoiceChat({ userName, onDataExtracted }: VoiceChatProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        isRecording,
        isSupported: isVoiceSupported,
        audioBlob,
        startRecording,
        stopRecording,
        clearRecording,
        error: voiceError,
    } = useVoiceRecorder();

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent]);

    // Handle audio blob ready (after stopRecording)
    useEffect(() => {
        if (audioBlob && !isLoading) {
            sendMessage(undefined, audioBlob);
            clearRecording();
        }
    }, [audioBlob]);

    const sendMessage = useCallback(async (text?: string, audio?: Blob) => {
        const messageContent = text || "";

        if (!text && !audio) return;

        setIsLoading(true);
        setStreamingContent("");

        // Add user message to UI immediately (for text input)
        if (text) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "user",
                content: text,
            }]);
            setInputText("");
        }

        try {
            const formData = new FormData();
            formData.append("userId", userName);

            if (text) {
                formData.append("text", text);
            }
            if (audio) {
                formData.append("audio", audio, "recording.webm");
            }
            if (conversationId) {
                formData.append("conversationId", conversationId);
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            // Get conversation ID from headers
            const newConvoId = response.headers.get("X-Conversation-Id");
            if (newConvoId && !conversationId) {
                setConversationId(newConvoId);
            }

            // If audio was sent, get the transcription
            const transcription = response.headers.get("X-Transcription");
            if (transcription && audio) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "user",
                    content: decodeURIComponent(transcription),
                }]);
            }

            // Handle streaming response (plain text stream from toTextStreamResponse)
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // toTextStreamResponse returns plain text chunks
                    const chunk = decoder.decode(value, { stream: true });
                    fullContent += chunk;
                    setStreamingContent(fullContent);
                }
            }

            // Add completed assistant message
            if (fullContent) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: fullContent,
                }]);
                setStreamingContent("");

                // Trigger data refresh callback
                onDataExtracted?.();
                router.refresh();
            }

        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [userName, conversationId, onDataExtracted, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() && !isLoading) {
            sendMessage(inputText.trim());
        }
    };

    const handleMicClick = async () => {
        if (isLoading) return;

        if (isRecording) {
            // Stop recording and send
            stopRecording();
        } else {
            // Start recording
            await startRecording();
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingContent && (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                            <div className="text-4xl mb-3">💬</div>
                            <p className="text-lg font-medium">Start your financial consultation</p>
                            <p className="text-sm mt-1">Type a message or click the mic to speak</p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl ${message.role === "user"
                                ? "bg-fuchsia-500 text-white rounded-br-md"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
                                }`}
                        >
                            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        </div>
                    </div>
                ))}

                {/* Streaming response */}
                {streamingContent && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md">
                            <p className="whitespace-pre-wrap text-sm">{streamingContent}</p>
                            <span className="inline-block w-2 h-4 bg-fuchsia-500 animate-pulse ml-1" />
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                        <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-md">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice error display */}
            {voiceError && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {voiceError}
                </div>
            )}

            {/* Input area */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    {/* Text input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading || isRecording}
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />

                    {/* Voice button - Click to toggle recording */}
                    {isVoiceSupported && (
                        <button
                            type="button"
                            onClick={handleMicClick}
                            disabled={isLoading}
                            className={`p-3 rounded-xl transition-all duration-200 ${isRecording
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                } disabled:opacity-50`}
                            title={isRecording ? "Click to stop & send" : "Click to record"}
                        >
                            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}

                    {/* Send button */}
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!inputText.trim() || isLoading}
                        className="!p-3 !rounded-xl"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </form>

                {isRecording && (
                    <p className="text-center text-sm text-red-500 mt-2 animate-pulse">
                        🎤 Recording... Release to send
                    </p>
                )}
            </div>
        </div>
    );
}
