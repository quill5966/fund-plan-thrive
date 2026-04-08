"use client";

import { useState, useEffect } from "react";
import { Input, Card } from "@/components/ui";
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
      <div className="min-h-screen bg-[#E8EAED] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8EAED]">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 mb-4 shadow-lg shadow-fuchsia-500/30">
            <span className="text-3xl">🏦</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Financial Advisor
          </h1>
          <p className="text-gray-600">
            {!isAuthenticated
              ? "Enter passphrase to access your consultation"
              : hasStarted
                ? "Let's discuss your financial situation"
                : "Your personal financial consultation"
            }
          </p>
        </div>

        {/* ── Passphrase Gate ──────────────────────────────────────── */}
        {!isAuthenticated && (
          <Card className="max-w-md mx-auto">
            <div className="space-y-5">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🔐</div>
                <p className="text-black">
                  This application is access-restricted. Enter your passphrase to continue.
                </p>
              </div>

              <Input
                label="Passphrase"
                type="password"
                placeholder="Enter passphrase..."
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setPassphraseError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePassphraseSubmit()}
              />

              {passphraseError && (
                <p className="text-red-500 text-sm text-center">{passphraseError}</p>
              )}

              <button
                onClick={handlePassphraseSubmit}
                disabled={!passphrase.trim() || isAuthLoading}
                className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-fuchsia-500/20"
              >
                {isAuthLoading ? "Verifying..." : "Unlock"}
              </button>
            </div>
          </Card>
        )}

        {/* ── Name Entry + Chat (shown after auth) ────────────────── */}
        {isAuthenticated && (
          <>
            <Card className="max-w-md mx-auto">
              <div className="space-y-5">
                <div className="text-center mb-4">
                  <p className="text-black">
                    Welcome! I'll help you review your finances and set goals.
                  </p>
                </div>

                <Input
                  label="Your Name"
                  placeholder="Enter your name to begin..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStartChat()}
                  disabled={hasStarted}
                />

                <button
                  onClick={handleStartChat}
                  disabled={!userName.trim() || hasStarted}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-fuchsia-500/20"
                >
                  {hasStarted ? "Consultation Started" : "Start Consultation"}
                </button>

                {hasStarted && (
                  <button
                    onClick={handleRestart}
                    className="w-full py-2 px-4 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                  >
                    Restart as a New User
                  </button>
                )}
              </div>
            </Card>

            {/* Chat Interface - Shown after starting */}
            {hasStarted && (
              <div className="mt-6">
                <VoiceChat
                  userName={userName}
                  initialMessages={initialMessages}
                  initialConversationId={initialConversationId}
                  isNewUser={isNewUser}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
