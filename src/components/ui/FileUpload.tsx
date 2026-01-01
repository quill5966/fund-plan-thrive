"use client";

import React, { useRef } from "react";

interface FileUploadProps {
    label?: string;
    accept?: string;
    selectedFile: File | null;
    onFileSelect: (file: File | null) => void;
}

export function FileUpload({
    label = "Audio File",
    accept = "audio/*",
    selectedFile,
    onFileSelect,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileSelect(file);
    };

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <div
                onClick={handleClick}
                className={`
          flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
          bg-white/50 dark:bg-white/5
          border-2 border-dashed border-gray-300 dark:border-white/20
          hover:border-indigo-400 dark:hover:border-indigo-500
          transition-all duration-200
        `}
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                    <svg
                        className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    {selectedFile ? (
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {selectedFile.name}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Click to choose a file...
                        </p>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    className="hidden"
                />
            </div>
        </div>
    );
}
