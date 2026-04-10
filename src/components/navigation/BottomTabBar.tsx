"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Target, Compass } from "lucide-react";
import { useAdvisor } from "@/components/advisor/AdvisorContext";
import TabItem from "./TabItem";

export default function BottomTabBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isOpen: advisorOpen, toggle: toggleAdvisor } = useAdvisor();

    return (
        <div
            className="fixed bottom-0 left-0 right-0 flex justify-center items-stretch z-[900]"
            style={{
                background: "var(--bg-card)",
                borderTop: "1px solid var(--border)",
                height: 60,
            }}
        >
            <div className="flex items-stretch w-full" style={{ maxWidth: 480 }}>
                <TabItem
                    icon={<LayoutDashboard size={18} />}
                    label="Dashboard"
                    active={pathname === "/dashboard"}
                    onClick={() => router.push("/dashboard")}
                />
                <TabItem
                    icon={<Target size={18} />}
                    label="Goals"
                    active={pathname === "/goals"}
                    onClick={() => router.push("/goals")}
                />
                <TabItem
                    icon={<Compass size={18} />}
                    label="Advisor"
                    active={advisorOpen || pathname === "/"}
                    onClick={() => {
                        if (pathname === "/") return; // Already on advisor page
                        toggleAdvisor();
                    }}
                />
            </div>
        </div>
    );
}
