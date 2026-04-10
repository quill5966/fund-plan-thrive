"use client";

import { useState, useEffect } from "react";
import { VoiceChat } from "@/components/chat";

interface ConversationMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ConversationData {
    hasSession: boolean;
    userName?: string;
    conversationId?: string | null;
    messages?: ConversationMessage[];
}

const ONBOARDING_STAGES = ["Welcome", "Financial snapshot", "Goals", "Action plan"];

export default function Home() {
    // ── Passphrase gate state ──────────────────────────────────────
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passphrase, setPassphrase] = useState("");
    const [passphraseError, setPassphraseError] = useState("");
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    // ── Existing consultation state ────────────────────────────────
    const [userName, setUserName] = useState("");
    const [hasStarted, setHasStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [initialMessages, setInitialMessages] = useState<ConversationMessage[]>([]);
    const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
    // New user = no conversation history (will trigger welcome message)
    const [isNewUser, setIsNewUser] = useState(true);

    // Check auth status + existing session on mount
    useEffect(() => {
        async function checkAuthAndLoadSession() {
            try {
                // 1. Check if user has passed the passphrase gate
                const authRes = await fetch("/api/auth/check");
                const authData = await authRes.json();

                if (!authData.authenticated) {
                    // Not authenticated — show passphrase gate
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                }

                setIsAuthenticated(true);

                // 2. If authenticated, check for existing conversation session
                const response = await fetch("/api/conversation");
                const data: ConversationData = await response.json();

                if (data.hasSession && data.userName) {
                    setUserName(data.userName);
                    setHasStarted(true);
                    if (data.messages && data.messages.length > 0) {
                        setInitialMessages(data.messages);
                        // Returning user has conversation history
                        setIsNewUser(false);
                    }
                    if (data.conversationId) {
                        setInitialConversationId(data.conversationId);
                    }
                }
            } catch (error) {
                console.error("Failed to load session:", error);
            } finally {
                setIsLoading(false);
            }
        }

        checkAuthAndLoadSession();
    }, []);

    const handlePassphraseSubmit = async () => {
        if (!passphrase.trim()) return;

        setIsAuthLoading(true);
        setPassphraseError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passphrase: passphrase.trim() }),
            });

            if (res.ok) {
                setIsAuthenticated(true);
                setPassphrase("");
            } else {
                const data = await res.json();
                setPassphraseError(data.error || "Incorrect passphrase");
            }
        } catch {
            setPassphraseError("Failed to connect to server");
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleStartChat = () => {
        if (userName.trim()) {
            setHasStarted(true);
        }
    };

    const handleRestart = async () => {
        // Destroy the iron-session
        await fetch("/api/session", { method: "DELETE" });

        // Reset all state — back to passphrase gate
        setIsAuthenticated(false);
        setUserName("");
        setHasStarted(false);
        setInitialMessages([]);
        setInitialConversationId(null);
        setIsNewUser(true);
        setPassphrase("");
        setPassphraseError("");
    };

    // Show loading state while checking session
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
                <div className="text-center">
                    <div
                        className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                    />
                    <p style={{ color: "var(--text-sec)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>

            {/* ── Passphrase Gate ──────────────────────────────────────── */}
            {!isAuthenticated && (
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ background: "linear-gradient(135deg, var(--accent), #8b5cf6)" }}
                        >
                            💰
                        </div>
                        <div>
                            <div className="text-xl font-bold" style={{ letterSpacing: "-0.02em" }}>
                                Fund Plan Thrive
                            </div>
                            <div className="text-sm" style={{ color: "var(--text-sec)" }}>
                                Your AI financial advisor
                            </div>
                        </div>
                    </div>

                    {/* Passphrase Card */}
                    <div
                        className="w-full max-w-md rounded-2xl p-8 space-y-5"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-3">🔐</div>
                            <p style={{ color: "var(--text-sec)" }}>
                                This application is access-restricted. Enter your passphrase to continue.
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium" style={{ color: "var(--text-sec)" }}>
                                Passphrase
                            </label>
                            <input
                                type="password"
                                placeholder="Enter passphrase..."
                                value={passphrase}
                                onChange={(e) => { setPassphrase(e.target.value); setPassphraseError(""); }}
                                onKeyDown={(e) => e.key === "Enter" && handlePassphraseSubmit()}
                                className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-200"
                                style={{
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                }}
                            />
                        </div>

                        {passphraseError && (
                            <p className="text-sm text-center" style={{ color: "var(--red)" }}>
                                {passphraseError}
                            </p>
                        )}

                        <button
                            onClick={handlePassphraseSubmit}
                            disabled={!passphrase.trim() || isAuthLoading}
                            className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: passphrase.trim()
                                    ? "linear-gradient(135deg, var(--accent), #8b5cf6)"
                                    : "var(--bg-surface)",
                                color: passphrase.trim() ? "#fff" : "var(--text-ter)",
                            }}
                        >
                            {isAuthLoading ? "Verifying..." : "Unlock"}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Welcome / Name Entry (after auth, before chat) ──────── */}
            {isAuthenticated && !hasStarted && (
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ background: "linear-gradient(135deg, var(--accent), #8b5cf6)" }}
                        >
                            💰
                        </div>
                        <div>
                            <div className="text-xl font-bold" style={{ letterSpacing: "-0.02em" }}>
                                Fund Plan Thrive
                            </div>
                            <div className="text-sm" style={{ color: "var(--text-sec)" }}>
                                Your AI financial advisor
                            </div>
                        </div>
                    </div>

                    {/* Name Entry Card */}
                    <div
                        className="w-full max-w-md rounded-2xl p-8 space-y-5"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                        <div className="text-center text-[15px] font-medium">
                            What should I call you?
                        </div>

                        <input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleStartChat()}
                            placeholder="Your name"
                            className="w-full px-4 py-3 rounded-xl outline-none text-[15px]"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                            }}
                        />

                        <button
                            onClick={handleStartChat}
                            disabled={!userName.trim()}
                            className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                            style={{
                                background: userName.trim()
                                    ? "linear-gradient(135deg, var(--accent), #8b5cf6)"
                                    : "var(--bg-surface)",
                                color: userName.trim() ? "#fff" : "var(--text-ter)",
                            }}
                        >
                            Start Consultation
                        </button>
                    </div>
                </div>
            )}

            {/* ── Chat with Onboarding Progress Bar ───────────────────── */}
            {isAuthenticated && hasStarted && (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Onboarding Progress Bar (cosmetic only — static on "Welcome") */}
                    <div
                        className="flex items-center gap-6 flex-shrink-0"
                        style={{ padding: "16px 32px", borderBottom: "1px solid var(--border)" }}
                    >
                        <div
                            className="text-xs font-semibold whitespace-nowrap"
                            style={{ color: "var(--text-sec)" }}
                        >
                            Onboarding
                        </div>
                        <div className="flex-1 flex items-center">
                            {ONBOARDING_STAGES.map((stage, i) => (
                                <div key={i} className="flex-1 flex items-center">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                                        style={{
                                            background: i === 0 ? "var(--accent)" : "var(--bg-surface)",
                                            color: i === 0 ? "#fff" : "var(--text-ter)",
                                            border: i === 0 ? "none" : "1px solid var(--border)",
                                        }}
                                    >
                                        {i + 1}
                                    </div>
                                    {i < ONBOARDING_STAGES.length - 1 && (
                                        <div
                                            className="flex-1 mx-1"
                                            style={{
                                                height: 2,
                                                background: "var(--border)",
                                                borderRadius: 1,
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="text-xs whitespace-nowrap" style={{ color: "var(--text-sec)" }}>
                            {ONBOARDING_STAGES[0]}
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="flex-1 overflow-hidden max-w-3xl mx-auto w-full">
                        <VoiceChat
                            userName={userName}
                            initialMessages={initialMessages}
                            initialConversationId={initialConversationId}
                            isNewUser={isNewUser}
                        />
                    </div>

                    {/* Restart button */}
                    <div
                        className="flex justify-center py-3 flex-shrink-0"
                        style={{ borderTop: "1px solid var(--border)" }}
                    >
                        <button
                            onClick={handleRestart}
                            className="py-2 px-4 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer"
                            style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-sec)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            Restart as a New User
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
