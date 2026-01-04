"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutDashboard, Target } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";

const navItems = [
    { href: "/", label: "Chat", icon: MessageSquare },
    { href: "/dashboard", label: "Financial Dashboard", icon: LayoutDashboard },
    { href: "/goals", label: "Goals", icon: Target },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUserName() {
            try {
                const response = await fetch("/api/conversation");
                const data = await response.json();
                if (data.hasSession && data.userName) {
                    setUserName(data.userName);
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
            }
        }

        fetchUserName();
    }, [pathname]); // Re-fetch when pathname changes (e.g., after starting a session)

    return (
        <aside className="w-64 min-h-screen bg-[#2D3139] flex flex-col">
            {/* Logo/Brand */}
            <div className="px-6 py-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">FA</span>
                    </div>
                    <div>
                        <div className="text-white font-semibold text-sm">FINTECH</div>
                        <div className="text-gray-400 text-xs">DASHBOARD</div>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-gray-700/50 text-white"
                                            : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Section */}
            <div className="px-4 py-4 border-t border-gray-700">
                <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white text-xs">👤</span>
                    </div>
                    <span className="text-gray-300 text-sm">
                        {userName || "Guest"}
                    </span>
                </div>
            </div>
        </aside>
    );
}

