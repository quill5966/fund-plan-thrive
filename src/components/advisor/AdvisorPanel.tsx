"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Minus, Mic, Send, Square } from "lucide-react";
import { useAdvisor } from "./AdvisorContext";
import { usePathname } from "next/navigation";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import NudgeCard from "./NudgeCard";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

// Placeholder nudges — needs backend nudge generation service in future
const ADVISOR_NUDGES = [
    {
        text: "Your checking balance is at $0. Want to set up a buffer target?",
        actions: ["Yes, help me plan", "Not now"],
    },
    {
        text: "You've completed 1 of 3 tasks on your resume step. Want to time-block this week?",
        actions: ["Show me a plan", "I'm on it"],
    },
];

export function AdvisorPanel() {
    // ── All hooks called unconditionally (React rules of hooks) ──
    const { isOpen, close } = useAdvisor();
    const pathname = usePathname();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState("");
    const [nudgeIdx, setNudgeIdx] = useState(0);
    const [initialized, setInitialized] = useState(false);
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

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent]);

    // Load conversation when panel first opens
    useEffect(() => {
        if (!isOpen || initialized) return;

        async function load() {
            try {
                const res = await fetch("/api/conversation");
                const data = await res.json();
                if (data.hasSession && data.messages) {
                    setMessages(data.messages);
                    if (data.conversationId) setConversationId(data.conversationId);
                } else {
                    setMessages([{
                        id: "welcome",
                        role: "assistant",
                        content: "I'm here whenever you need help. You can ask about your finances, goals, or get suggestions.",
                    }]);
                }
                setInitialized(true);
            } catch (e) {
                console.error("Failed to load conversation:", e);
                setInitialized(true);
            }
        }

        load();
    }, [isOpen, initialized]);

    // Handle audio blob ready
    useEffect(() => {
        if (audioBlob && !isLoading) {
            sendMessage(undefined, audioBlob);
            clearRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob]);

    const sendMessage = useCallback(async (text?: string, audio?: Blob) => {
        if (!text && !audio) return;

        setIsLoading(true);
        setStreamingContent("");

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
            if (text) formData.append("text", text);
            if (audio) formData.append("audio", audio, "recording.webm");
            if (conversationId) formData.append("conversationId", conversationId);

            const response = await fetch("/api/chat", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to send message");

            const newConvoId = response.headers.get("X-Conversation-Id");
            if (newConvoId && !conversationId) setConversationId(newConvoId);

            const transcription = response.headers.get("X-Transcription");
            if (transcription && audio) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "user",
                    content: decodeURIComponent(transcription),
                }]);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    fullContent += decoder.decode(value, { stream: true });
                    setStreamingContent(fullContent);
                }
            }

            if (fullContent) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: fullContent,
                }]);
                setStreamingContent("");
            }
        } catch (error) {
            console.error("Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() && !isLoading) sendMessage(inputText.trim());
    };

    const handleMicClick = async () => {
        if (isLoading) return;
        if (isRecording) stopRecording();
        else await startRecording();
    };

    // ── Conditional render (after all hooks) ──
    // Don't render on the advisor page — the full chat is already shown there
    if (pathname === "/") return null;

    const nudge = nudgeIdx < ADVISOR_NUDGES.length ? ADVISOR_NUDGES[nudgeIdx] : null;

    return (
        <div
            className="fixed right-0 top-0 bottom-0 flex flex-col z-[100]"
            style={{
                width: 380,
                background: "var(--bg-card)",
                borderLeft: "1px solid var(--border)",
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.3s ease",
                boxShadow: isOpen ? "-8px 0 40px rgba(0,0,0,0.3)" : "none",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center justify-center text-sm"
                        style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                        }}
                    >🧠</div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Advisor</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={close} className="bg-transparent border-none cursor-pointer p-1" style={{ color: "var(--text-ter)" }}>
                        <Minus size={16} />
                    </button>
                    <button onClick={close} className="bg-transparent border-none cursor-pointer p-1" style={{ color: "var(--text-ter)" }}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Nudge */}
            {nudge && (
                <NudgeCard
                    text={nudge.text}
                    actions={nudge.actions}
                    onDismiss={() => setNudgeIdx(i => Math.min(i + 1, ADVISOR_NUDGES.length))}
                />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-auto flex flex-col gap-3" style={{ padding: "16px 12px" }}>
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className="text-[13px] leading-relaxed"
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            maxWidth: "90%",
                            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                            background: m.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                            color: m.role === "user" ? "#fff" : "var(--text)",
                        }}
                    >
                        {m.content}
                    </div>
                ))}

                {/* Streaming response */}
                {streamingContent && (
                    <div
                        className="text-[13px] leading-relaxed"
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            maxWidth: "90%",
                            alignSelf: "flex-start",
                            background: "var(--bg-surface)",
                            color: "var(--text)",
                        }}
                    >
                        {streamingContent}
                        <span className="inline-block w-1.5 h-4 ml-1 animate-pulse" style={{ background: "var(--accent)" }} />
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && !streamingContent && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            alignSelf: "flex-start",
                            background: "var(--bg-surface)",
                        }}
                    >
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-ter)", animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice error */}
            {voiceError && (
                <div className="px-3 py-2 text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "var(--red)" }}>
                    {voiceError}
                </div>
            )}

            {/* Input */}
            <div
                className="flex items-center gap-2 flex-shrink-0"
                style={{ padding: 12, borderTop: "1px solid var(--border)" }}
            >
                <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
                    <div
                        className="flex items-center gap-2 flex-1"
                        style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "10px 14px",
                        }}
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ask anything..."
                            disabled={isLoading || isRecording}
                            className="flex-1 bg-transparent border-none outline-none text-[13px]"
                            style={{ color: "var(--text)" }}
                        />
                        {isVoiceSupported && (
                            <button
                                type="button"
                                onClick={handleMicClick}
                                disabled={isLoading}
                                className="bg-transparent border-none cursor-pointer flex-shrink-0 disabled:opacity-50"
                                style={{ color: isRecording ? "var(--red)" : "var(--text-sec)" }}
                            >
                                {isRecording ? <Square size={16} /> : <Mic size={16} />}
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="flex items-center justify-center flex-shrink-0 border-none cursor-pointer disabled:opacity-50"
                        style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: "var(--accent)",
                            color: "#fff",
                        }}
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>

            {isRecording && (
                <p className="text-center text-xs py-1 animate-pulse" style={{ color: "var(--red)" }}>
                    🎤 Recording...
                </p>
            )}
        </div>
    );
}
