"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

type ChatLayoutProps = {
    children: ReactNode;
};

type ChatSidebarProps = {
    children: ReactNode;
    title?: string;
};

type ChatWindowProps = {
    children: ReactNode;
    selectedId?: number | string | null;
};

export default function ChatLayout({ children }: ChatLayoutProps) {
    return (
        <div className="flex h-screen bg-white text-[#1d1d1f] antialiased overflow-hidden">
            {children}
        </div>
    );
}

export function ChatSidebar({ children, title = "Messages" }: ChatSidebarProps) {
    return (
        <div className="w-full md:w-[350px] lg:w-[380px] border-r border-gray-200 flex flex-col bg-[#fbfbfd]">
            <div className="p-5 pb-3">
                <h1 className="text-3xl font-bold tracking-tight text-black mb-4">{title}</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-[#e3e3e8] rounded-[10px] pl-9 pr-4 py-2 text-sm placeholder:text-gray-500 text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {children}
            </div>
        </div>
    );
}

export function ChatWindow({ children, selectedId }: ChatWindowProps) {
    if (!selectedId) {
        return (
            <div className="flex-1 hidden md:flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-gray-400 font-medium">Select a conversation to start messaging</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex-1 flex flex-col h-full bg-white relative z-0">
            {children}
        </div>
    );
}
