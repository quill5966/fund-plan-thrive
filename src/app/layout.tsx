import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const dmSans = DM_Sans({
    variable: "--font-dm-sans",
    subsets: ["latin"],
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Fund Plan Thrive — AI Financial Advisor",
    description: "Your AI-powered personal finance dashboard and advisor",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
                style={{ background: "var(--bg)", color: "var(--text)" }}
            >
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
