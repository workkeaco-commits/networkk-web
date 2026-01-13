"use client";

import { motion } from "framer-motion";

export default function MessageBubble({ isMe, body, time, type = "text", onClick = undefined }) {
    // If it's a "proposal" placeholder, rendering is handled by the parent mostly, 
    // but the bubble itself can style generic text. 
    // We can accept a `children` prop for custom content (like proposal cards).

    const isSystem = type === "system";

    if (isSystem) {
        return (
            <div className="flex justify-center my-4">
                <span className="text-xs font-medium text-gray-400 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                    {body}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] sm:max-w-[60%] relative group ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
                <div
                    className={`px-4 py-2.5 text-[16px] leading-relaxed shadow-sm ${isMe
                        ? "bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]"
                        : "bg-[#E9E9EB] text-black rounded-[20px] rounded-bl-[4px]"
                        }`}
                >
                    {body}
                </div>
                {time && (
                    <div className={`text-[10px] text-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-full ${isMe ? "right-1" : "left-1"}`}>
                        {time}
                    </div>
                )}
            </div>
        </div>
    );
}
