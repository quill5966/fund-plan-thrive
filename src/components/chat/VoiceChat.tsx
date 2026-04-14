"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Mic, Send, Square } from "lucide-react";
import { MessageContent } from "./MessageContent";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface VoiceChatProps {
    userName: string;
    onDataExtracted?: () => void;
    initialMessages?: Message[];
    initialConversationId?: string | null;
    isNewUser?: boolean;
}

export function VoiceChat({ userName, onDataExtracted, initialMessages = [], initialConversationId = null, isNewUser = false }: VoiceChatProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob]);

    // Initialize conversation with welcome message for new users
    useEffect(() => {
        if (!isNewUser || initialMessages.length > 0 || conversationId) {
            // Skip if not a new user, or if there are already messages/conversation
            return;
        }

        async function initializeNewUserConversation() {
            setIsLoading(true);
            try {
                const response = await fetch("/api/init-conversation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userName }),
                });

                if (!response.ok) {
                    throw new Error("Failed to initialize conversation");
                }

                const data = await response.json();
                setConversationId(data.conversationId);
                // API returns messages array (works for both new users and returning users)
                setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                })));
            } catch (error) {
                console.error("Error initializing conversation:", error);
            } finally {
                setIsLoading(false);
            }
        }

        initializeNewUserConversation();
    }, [isNewUser, userName, initialMessages.length, conversationId]);

    const sendMessage = useCallback(async (text?: string, audio?: Blob) => {
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
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{
                background: "var(--bg-card)",
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
            }}
        >
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingContent && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-4xl mb-3">💬</div>
                            <p className="text-lg font-medium" style={{ color: "var(--text-sec)" }}>
                                Start your financial consultation
                            </p>
                            <p className="text-sm mt-1" style={{ color: "var(--text-ter)" }}>
                                Type a message or click the mic to speak
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className="max-w-[80%] px-4 py-3 rounded-2xl"
                            style={{
                                background: message.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                                color: message.role === "user" ? "#fff" : "var(--text)",
                                border: message.role === "user" ? "none" : "1px solid var(--border)",
                                borderBottomRightRadius: message.role === "user" ? 6 : undefined,
                                borderBottomLeftRadius: message.role === "assistant" ? 6 : undefined,
                            }}
                        >
                            <div className="text-sm leading-relaxed">
                                <MessageContent content={message.content} isUser={message.role === "user"} />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Streaming response */}
                {streamingContent && (
                    <div className="flex justify-start">
                        <div
                            className="max-w-[80%] px-4 py-3 rounded-2xl"
                            style={{
                                background: "var(--bg-surface)",
                                color: "var(--text)",
                                border: "1px solid var(--border)",
                                borderBottomLeftRadius: 6,
                            }}
                        >
                            <div className="text-sm leading-relaxed">
                                <MessageContent content={streamingContent} isUser={false} />
                            </div>
                            <span
                                className="inline-block w-0.5 h-4 animate-pulse ml-1"
                                style={{ background: "var(--accent)" }}
                            />
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                        <div
                            className="px-4 py-3 rounded-2xl"
                            style={{
                                background: "var(--bg-surface)",
                                borderBottomLeftRadius: 6,
                            }}
                        >
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice error display */}
            {voiceError && (
                <div className="px-4 py-2 text-sm" style={{ background: "rgba(248,113,113,0.1)", color: "var(--red)" }}>
                    {voiceError}
                </div>
            )}

            {/* Input area */}
            <div style={{ borderTop: "1px solid var(--border)", padding: 16 }}>
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    {/* Text input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading || isRecording}
                        className="flex-1 px-4 py-3 rounded-xl border-none outline-none"
                        style={{
                            background: "var(--bg-surface)",
                            color: "var(--text)",
                        }}
                    />

                    {/* Voice button - Click to toggle recording */}
                    {isVoiceSupported && (
                        <button
                            type="button"
                            onClick={handleMicClick}
                            disabled={isLoading}
                            className="p-3 rounded-xl transition-all duration-200 disabled:opacity-50 border-none cursor-pointer"
                            style={{
                                background: isRecording ? "var(--red)" : "var(--bg-surface)",
                                color: isRecording ? "#fff" : "var(--text-sec)",
                            }}
                            title={isRecording ? "Click to stop & send" : "Click to record"}
                        >
                            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="p-3 rounded-xl transition-all duration-200 disabled:opacity-50 border-none cursor-pointer"
                        style={{
                            background: "var(--accent)",
                            color: "#fff",
                        }}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>

                {isRecording && (
                    <p className="text-center text-sm mt-2 animate-pulse" style={{ color: "var(--red)" }}>
                        🎤 Recording... Release to send
                    </p>
                )}
            </div>
        </div>
    );
}
