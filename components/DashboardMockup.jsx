"use client";

import { motion } from "framer-motion";
import {
    Plus,
    Briefcase,
    Users,
    MessageSquare,
    Settings,
    PieChart,
    Layout,
    Zap,
    Star,
    ShieldCheck
} from "lucide-react";

export default function DashboardMockup() {
    return (
        <div className="w-full h-full bg-[#fbfbfd] rounded-3xl overflow-hidden shadow-2xl border border-gray-200/50 flex flex-col md:flex-row">
            {/* Mock Sidebar */}
            <div className="hidden md:flex w-20 lg:w-48 bg-white border-r border-gray-100 flex-col p-4">
                <div className="mb-10 px-2 lg:px-4">
                    <img src="/logo-sf-display.png" alt="Logo" className="h-6 w-auto" />
                </div>

                <div className="space-y-2">
                    {[
                        { icon: Layout, label: "Dashboard", active: true },
                        { icon: Briefcase, label: "Jobs" },
                        { icon: MessageSquare, label: "Messages", badge: "2" },
                        { icon: Users, label: "Talent" },
                        { icon: PieChart, label: "Insights" },
                        { icon: Settings, label: "Settings" }
                    ].map((item, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${item.active ? "bg-[#f4f4f5] text-black" : "text-gray-400 hover:bg-[#fbfbfd] hover:text-gray-600"
                                }`}
                        >
                            <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
                            <span className={`hidden lg:block text-[13px] font-semibold ${item.active ? "opacity-100" : "opacity-70"}`}>
                                {item.label}
                            </span>
                            {item.badge && (
                                <span className="hidden lg:flex ml-auto w-4 h-4 bg-red-500 rounded-full text-[9px] text-white items-center justify-center font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Mock Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mock Top bar */}
                <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-white rounded-full border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden">
                            <img src="/logo-icon-only.png" alt="Logo" className="w-[14px] h-[14px] object-contain" />
                        </div>
                        <span className="text-sm font-semibold">Project Space</span>
                    </div>
                    <button className="bg-black text-white text-[12px] font-bold px-4 py-2 rounded-full hover:opacity-80 transition-all flex items-center gap-2">
                        <Plus size={14} strokeWidth={3} /> New Job Post
                    </button>
                </div>

                {/* Scrollable Content Mock */}
                <div className="flex-1 p-6 md:p-10 overflow-hidden space-y-10">
                    {/* AI Assistant Mockup */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#10b8a6] via-teal-500 to-emerald-500 rounded-[48px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white border border-gray-100/50 rounded-[48px] p-10 md:p-14 shadow-sm flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-8 shadow-xl shadow-black/10">
                                <Zap className="text-white fill-white" size={28} />
                            </div>
                            <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-8">What do you need help with?</h3>
                            <div className="w-full max-w-lg relative">
                                <div className="w-full bg-[#f4f4f5] rounded-[28px] py-5 px-8 text-left text-[17px] text-gray-400 font-medium flex items-center gap-3">
                                    <span className="animate-pulse">|</span> Describe what you're looking for...
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Jobs Listing Mockup */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                title: "UI Designer for Fintech App",
                                budget: "45,000 EGP",
                                proposals: 12,
                                tag: "High Priority",
                                status: "active"
                            },
                            {
                                title: "Senior React Developer",
                                budget: "90,000 EGP",
                                proposals: 8,
                                tag: "Verified",
                                status: "active"
                            }
                        ].map((job, i) => (
                            <div key={i} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-500 cursor-default group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${i === 0 ? "border-teal-100 text-[#10b8a6] bg-teal-50" : "border-green-100 text-green-600 bg-green-50"
                                        }`}>
                                        {job.tag}
                                    </div>
                                    {job.proposals > 0 && (
                                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-2 py-0.5 shadow-sm">
                                            <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-[10px] font-bold text-gray-700">{job.proposals} Proposals</span>
                                        </div>
                                    )}
                                </div>
                                <h4 className="text-[18px] font-bold tracking-tight text-gray-900 mb-4 line-clamp-1 group-hover:text-[#10b8a6] transition-colors">
                                    {job.title}
                                </h4>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tight">Est. Budget</span>
                                        <span className="text-[14px] font-bold text-gray-800">{job.budget}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                        <Users size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Floating Verification Badge Mockup */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-gray-100 px-6 py-3 rounded-full shadow-lg shadow-gray-100/40">
                            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                <ShieldCheck size={18} className="text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-black leading-tight">Secured Payments</span>
                                <span className="text-[10px] text-gray-400 font-medium">Milestone based releases</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Glossy Overlay Reflection Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-50"></div>
        </div>
    );
}
