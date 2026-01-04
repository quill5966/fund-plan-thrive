"use client";

import { useState } from "react";
import { Input, Card } from "@/components/ui";
import { VoiceChat } from "@/components/chat";

export default function Home() {
  const [userName, setUserName] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartChat = () => {
    if (userName.trim()) {
      setHasStarted(true);
    }
  };

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
            {hasStarted
              ? "Let's discuss your financial situation"
              : "Your personal financial consultation"
            }
          </p>
        </div>

        {/* Welcome Card - Always visible */}
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
          </div>
        </Card>

        {/* Chat Interface - Shown after starting */}
        {hasStarted && (
          <div className="mt-6">
            <VoiceChat userName={userName} />
          </div>
        )}
      </div>
    </div>
  );
}
