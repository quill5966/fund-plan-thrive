"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, FileUpload } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    transcription?: string;
    error?: string;
  } | null>(null);

  const handleProcess = async () => {
    if (!selectedFile) {
      setResult({ success: false, error: "Please select an audio file." });
      return;
    }

    if (!userName.trim()) {
      setResult({ success: false, error: "Please enter your name." });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);
      formData.append("userId", userName.trim());

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || "Processing failed." });
      } else {
        setResult({ success: true, transcription: data.transcription });
        // Force server components (Navbar) to re-render with new cookie
        router.refresh();
      }
    } catch (error) {
      console.error("Error:", error);
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EAED]">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 mb-4 shadow-lg shadow-fuchsia-500/30">
            <span className="text-3xl">🏦</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Financial Advisor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            MVP Tester - Upload audio to transcribe
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-6">
          <div className="space-y-5">
            <Input
              label="Your Name"
              placeholder="Enter your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />

            <FileUpload
              label="Audio File"
              accept="audio/*"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
            />

            <Button
              variant="primary"
              loading={isLoading}
              onClick={handleProcess}
              className="w-full"
            >
              🎤 Process Audio
            </Button>
          </div>
        </Card>

        {/* Result Card */}
        {result && (
          <Card title={result.success ? "Transcription Result" : "Error"}>
            {result.success ? (
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {result.transcription}
              </p>
            ) : (
              <p className="text-red-600 dark:text-red-400">{result.error}</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
