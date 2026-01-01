import Link from "next/link";
import { userService } from "@/services/user";
import { cookies } from "next/headers";

export default async function Navbar() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    let displayName = "";
    let finalUserId: string | null = null;

    if (userId) {
        const user = await userService.getUserById(userId);
        if (user) {
            displayName = user.name;
            finalUserId = user.id;
        }
    }

    // Logic for title
    const titleText = displayName ? `${displayName} Dashboard` : "";

    // Logic for links
    // If no session, disable Dashboard and Goals
    const linkBaseClass = "transition-colors";
    const activeLinkClass = "hover:text-gray-900 text-gray-600";
    const disabledLinkClass = "text-gray-300 pointer-events-none cursor-not-allowed";

    const navLinkClass = finalUserId ? activeLinkClass : disabledLinkClass;

    return (
        <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
            <div className="text-xl font-bold text-gray-900 capitalize">
                {titleText}
            </div>
            <div className="flex gap-8 text-sm font-medium">
                <Link href="/" className={`${linkBaseClass} ${activeLinkClass}`}>
                    Chat
                </Link>
                <Link href="/dashboard" className={`${linkBaseClass} ${navLinkClass}`}>
                    Dashboard
                </Link>
            </div>
        </nav>
    );
}
