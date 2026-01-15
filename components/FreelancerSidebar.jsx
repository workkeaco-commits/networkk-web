"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    User,
    MessageSquare,
    Briefcase,
    LogOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    Wallet,
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";

export default function FreelancerSidebar({ onSignOut }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const menuItems = [
        { name: "Jobs", icon: Briefcase, href: "/jobs" },
        { name: "Messages", icon: MessageSquare, href: "/freelancer/messages" },
        { name: "Contracts", icon: FileText, href: "/freelancer/contracts" },
        { name: "Wallet", icon: Wallet, href: "/freelancer/wallet" },
        { name: "Profile", icon: User, href: "/freelancer/profile" },
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-100 transition-all duration-300 ease-in-out z-50 flex flex-col ${isCollapsed ? "w-20" : "w-64"
                }`}
        >
            {/* Sidebar Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-black transition-colors"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className={`p-8 mb-4 overflow-hidden whitespace-nowrap`}>
                <div className="flex items-center">
                    <img
                        src="/logo-sf-display.png"
                        alt="networkk"
                        className={`h-9 transition-all duration-300 ${isCollapsed ? "w-8 object-left overflow-hidden" : "w-auto"}`}
                    />
                </div>
            </div>

            {/* Notifications */}
            <div className={`px-3 mb-3 ${isCollapsed ? "flex justify-center" : ""}`}>
                <NotificationsBell role="freelancer" showLabel={!isCollapsed} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                                ? "bg-gray-900 text-white"
                                : "text-gray-500 hover:bg-gray-50 hover:text-black"
                                }`}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`shrink-0 ${isActive ? "text-white" : "group-hover:scale-110 transition-transform"}`}
                            />
                            {!isCollapsed && (
                                <span className={`font-semibold text-[15px] ${isActive ? "text-white" : ""}`}>
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Sign Out */}
            <div className="p-3 border-t border-gray-50">
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200 group"
                >
                    <LogOut size={22} strokeWidth={2} className="shrink-0 group-hover:translate-x-1 transition-transform" />
                    {!isCollapsed && (
                        <span className="font-semibold text-[15px]">Sign out</span>
                    )}
                </button>
            </div>
        </aside>
    );
}
