"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdvisorProvider, useAdvisor } from "@/components/advisor/AdvisorContext";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";
import BottomTabBar from "@/components/navigation/BottomTabBar";

function MainContent({ children }: { children: ReactNode }) {
    const { isOpen } = useAdvisor();
    const pathname = usePathname();

    // Only push content when advisor panel is open and NOT on the advisor page
    // TODO: On mobile (<1024px), switch to overlay mode instead of push
    const shouldPush = isOpen && pathname !== "/";

    return (
        <main
            className="flex-1 overflow-auto transition-[margin] duration-300 ease-in-out"
            style={{
                marginRight: shouldPush ? 380 : 0,
                paddingBottom: 64, // Space for bottom tab bar
            }}
        >
            {children}
        </main>
    );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
    return (
        <AdvisorProvider>
            <div className="flex flex-col min-h-screen">
                <MainContent>{children}</MainContent>
                <AdvisorPanel />
                <BottomTabBar />
            </div>
        </AdvisorProvider>
    );
}
