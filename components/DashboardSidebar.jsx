"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    User,
    MessageSquare,
    Wallet,
    LogOut,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Settings,
    FileText
} from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import { supabase } from "@/lib/supabase/browser";

export default function DashboardSidebar({ onSignOut }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();

    const menuItems = [
        { name: "Dashboard", icon: LayoutDashboard, href: "/client/dashboard" },
        { name: "Profile", icon: User, href: "/client/profile" },
        { name: "Messages", icon: MessageSquare, href: "/client/messages" },
        { name: "Contracts", icon: FileText, href: "/client/contracts" },
        { name: "Financials", icon: Wallet, href: "/client/financials" },
    ];

    useEffect(() => {
        let cancelled = false;

        const fetchUnread = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                if (!cancelled) setUnreadCount(0);
                return;
            }

            const { data, error } = await supabase.rpc("count_unread_for_client");
            if (cancelled) return;
            if (error) {
                console.error("unread count error", error);
                return;
            }
            setUnreadCount(typeof data === "number" ? data : 0);
        };

        fetchUnread();
        const id = setInterval(fetchUnread, 15000);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

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
                        src={isCollapsed ? "/favicon.ico" : "/logo-sf-display.png"}
                        alt="networkk"
                        className={`h-9 transition-all duration-300 ${isCollapsed ? "w-9 object-contain" : "w-auto"}`}
                    />
                </div>
            </div>

            {/* Notifications */}
            <div className={`px-3 mb-3 ${isCollapsed ? "flex justify-center" : ""}`}>
                <NotificationsBell role="client" showLabel={!isCollapsed} />
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
                            className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                                ? "bg-teal-50 text-[#10b8a6]"
                                : "text-gray-500 hover:bg-gray-50 hover:text-black"
                                }`}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`shrink-0 ${isActive ? "text-[#10b8a6]" : "group-hover:scale-110 transition-transform"}`}
                            />
                            {!isCollapsed && (
                                <span className={`font-semibold text-[15px] ${isActive ? "text-[#10b8a6]" : ""}`}>
                                    {item.name}
                                </span>
                            )}
                            {item.name === "Messages" && unreadCount > 0 && (
                                <span
                                    className={`inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white ${isCollapsed ? "absolute right-3 top-2" : "ml-auto"}`}
                                >
                                    {unreadCount > 99 ? "99+" : unreadCount}
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
