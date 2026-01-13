"use client";

import { useState } from "react";

export default function ConversationList({ conversations, selectedId, onSelect, getAvatar, getName, getPreview, getTime, getUnreadCount }) {
    const [imgErrors, setImgErrors] = useState({});

    return (
        <div className="px-3 pb-4 space-y-1">
            {conversations.map((conv) => {
                const isSelected = selectedId === conv.id;
                const name = getName(conv);
                const preview = getPreview(conv);
                const time = getTime(conv);
                const avatar = getAvatar(conv);
                const unreadCount = getUnreadCount ? getUnreadCount(conv) : 0;

                const avatarObj =
                    avatar && typeof avatar === "object" && "url" in avatar
                        ? avatar
                        : null;
                const avatarUrl =
                    (avatarObj?.url && typeof avatarObj.url === "string" && avatarObj.url) ||
                    (typeof avatar === "string" && avatar.startsWith("http") ? avatar : null);
                const fallback =
                    avatarObj?.fallback ||
                    (typeof avatar === "string" && !avatarUrl ? avatar : null);
                const showImage = !!avatarUrl && !imgErrors[conv.id];
                const fallbackText =
                    fallback || (name ? String(name).trim().charAt(0).toUpperCase() : "");

                return (
                    <button
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className={`w-full text-left p-3 rounded-[16px] flex gap-3 transition-all duration-200 group ${isSelected ? "bg-[#e9e9eb] shadow-sm" : "hover:bg-[#f5f5f7] bg-transparent"
                            }`}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0 w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-500 border border-black/5 shadow-sm">
                            {showImage ? (
                                <img
                                    src={avatarUrl}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                    onError={() =>
                                        setImgErrors((prev) => ({ ...prev, [conv.id]: true }))
                                    }
                                />
                            ) : (
                                <span>{fallbackText}</span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-black text-[15px] truncate pr-2 leading-tight tracking-tight">
                                    {name}
                                </span>
                                <span className={`text-[12px] font-medium whitespace-nowrap ${unreadCount > 0 ? "text-blue-600" : "text-gray-400"}`}>
                                    {time}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-[13px] truncate leading-tight flex-1 ${isSelected ? "text-gray-700" : unreadCount > 0 ? "text-black font-semibold" : "text-gray-500"}`}>
                                    {preview}
                                </p>
                                {unreadCount > 0 && (
                                    <div className="shrink-0 min-w-[18px] h-[18px] bg-blue-600 rounded-full flex items-center justify-center px-1 shadow-sm shadow-blue-200">
                                        <span className="text-[10px] font-bold text-white leading-none">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
