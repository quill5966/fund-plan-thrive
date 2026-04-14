"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MessageContentProps {
    content: string;
    isUser: boolean;
}

/**
 * Renders chat message content.
 * - User messages: plain text (no markdown parsing needed)
 * - Assistant messages: parsed through react-markdown for bold, lists, etc.
 */
export function MessageContent({ content, isUser }: MessageContentProps) {
    if (isUser) {
        return <p className="whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="message-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
}
