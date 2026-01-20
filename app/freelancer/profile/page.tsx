"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import FreelancerSidebar from "@/components/FreelancerSidebar";
import {
    User,
    Mail,
    Phone,
    Code,
    Edit3,
    Save,
    X,
    Loader2,
    Camera,
    Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ImageCropperModal from "@/components/ImageCropperModal";

export default function FreelancerProfilePage() {
    const router = useRouter();

    type FreelancerProfile = {
        freelancer_id: number | null;
        first_name: string;
        last_name: string;
        job_title: string;
        bio: string;
        email: string;
        phone_number: string;
        skills: string;
        personal_img_url: string | null;
    };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [avatarCrop, setAvatarCrop] = useState<{ file: File } | null>(null);
    const [passwordInputs, setPasswordInputs] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const [profile, setProfile] = useState<FreelancerProfile>({
        freelancer_id: null,
        first_name: "",
        last_name: "",
        job_title: "",
        bio: "",
        email: "",
        phone_number: "",
        skills: "",
        personal_img_url: null
    });

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/freelancer/sign-in?next=/freelancer/profile");
                return;
            }

            const { data, error } = await supabase
                .from("freelancers")
                .select("freelancer_id, first_name, last_name, job_title, bio, email, phone_number, skills, personal_img_url")
                .eq("auth_user_id", user.id)
                .single();

            if (!mounted) return;

            if (error || !data) {
                console.error("Error loading freelancer profile", error);
                setErrorMsg("Could not load your profile. Please complete signup.");
            } else {
                setProfile({
                    freelancer_id: data.freelancer_id,
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    job_title: data.job_title || "",
                    bio: data.bio || "",
                    email: data.email || "",
                    phone_number: data.phone_number || "",
                    personal_img_url: data.personal_img_url,
                    skills: typeof data.skills === "string"
                        ? data.skills
                        : Array.isArray(data.skills)
                            ? data.skills.join(", ")
                            : "",
                });
            }

            setLoading(false);
        })();

        return () => {
            mounted = false;
        };
    }, [router]);

    const isHeicFile = (file: File | null) => {
        if (!file) return false;
        const type = (file.type || "").toLowerCase();
        const name = (file.name || "").toLowerCase();
        return type.includes("heic") || type.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
    };

    const normalizeImageFile = async (file: File) => {
        if (!isHeicFile(file)) return file;
        try {
            const heic2any = (await import("heic2any")).default;
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const blob = Array.isArray(converted) ? converted[0] : converted;
            if (!blob || !blob.size) throw new Error("Empty HEIC conversion.");
            const baseName = (file.name || "image").replace(/\.(heic|heif)$/i, "");
            return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
        } catch (err) {
            throw new Error("HEIC/HEIF images are not supported. Please upload a JPG or PNG image.");
        }
    };

    const uploadAvatar = async (file: File) => {
        if (!file.size) {
            setErrorMsg("That file is empty. Please upload a JPG or PNG image.");
            return;
        }
        if (!profile?.freelancer_id) {
            setErrorMsg("Missing profile details. Please refresh and try again.");
            return;
        }

        setErrorMsg("");
        setSuccessMsg("");
        setAvatarUploading(true);

        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) throw new Error("You must be signed in to update your photo.");

            const avatarPath = `avatars/${auth.user.id}-${Date.now()}`;
            const { error: uploadError } = await supabase
                .storage
                .from("public-avatars")
                .upload(avatarPath, file, { upsert: false, contentType: file.type || "image/jpeg" });
            if (uploadError) {
                console.error("[profile avatar] upload failed", uploadError);
                const extra = (uploadError as { details?: string; hint?: string } | null) || {};
                const details = [uploadError.message, extra.details, extra.hint].filter(Boolean).join(" ");
                throw new Error(details || "Avatar upload failed.");
            }

            const { data: pub } = supabase.storage.from("public-avatars").getPublicUrl(avatarPath);
            const publicUrl = pub.publicUrl;

            const { error: updateError } = await supabase
                .from("freelancers")
                .update({ personal_img_url: publicUrl })
                .eq("freelancer_id", profile.freelancer_id);
            if (updateError) {
                console.error("[profile avatar] profile update failed", updateError);
                const extra = (updateError as { details?: string; hint?: string } | null) || {};
                const details = [updateError.message, extra.details, extra.hint].filter(Boolean).join(" ");
                throw new Error(details || "Profile update failed.");
            }

            setProfile((prev) => ({ ...prev, personal_img_url: publicUrl }));
            setSuccessMsg("Profile photo updated.");
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to update profile photo.");
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        if (avatarUploading) return;
        if (!file.size) {
            setErrorMsg("That file is empty. Please upload a JPG or PNG image.");
            return;
        }

        try {
            const normalized = await normalizeImageFile(file);
            if (!normalized.size) throw new Error("That file is empty after processing. Please upload a JPG or PNG image.");
            setErrorMsg("");
            setSuccessMsg("");
            setAvatarCrop({ file: normalized });
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to update profile photo.");
        }
    };

    const handleAvatarCropConfirm = (croppedFile: File) => {
        setAvatarCrop(null);
        if (!croppedFile || !croppedFile.size) {
            setErrorMsg("We couldn't process that image. Please upload a JPG or PNG image.");
            return;
        }
        void uploadAvatar(croppedFile);
    };

    const handleAvatarCropCancel = () => setAvatarCrop(null);

    async function handleSave() {
        if (!profile?.freelancer_id) return;

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const updates = {
                first_name: profile.first_name?.trim() || null,
                last_name: profile.last_name?.trim() || null,
                job_title: profile.job_title?.trim() || null,
                bio: profile.bio?.trim() || null,
                phone_number: profile.phone_number?.trim() || null,
                skills: profile.skills?.trim() || null,
            };

            const { error } = await supabase
                .from("freelancers")
                .update(updates)
                .eq("freelancer_id", profile.freelancer_id);

            if (error) {
                setErrorMsg(error.message || "Failed to save changes.");
                return;
            }

            setSuccessMsg("Profile updated successfully.");
            setEditMode(false);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword() {
        setPasswordError("");
        setPasswordSuccess("");

        if (!passwordInputs.currentPassword) {
            setPasswordError("Please enter your current password.");
            return;
        }
        if (!passwordInputs.newPassword) {
            setPasswordError("Please enter a new password.");
            return;
        }
        if (passwordInputs.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            return;
        }
        if (passwordInputs.newPassword !== passwordInputs.confirmPassword) {
            setPasswordError("Passwords do not match.");
            return;
        }
        if (!profile.email) {
            setPasswordError("Missing account email.");
            return;
        }

        setPasswordSaving(true);
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: passwordInputs.currentPassword,
        });
        if (reauthError) {
            setPasswordError("Current password is incorrect.");
            setPasswordSaving(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: passwordInputs.newPassword,
        });

        if (error) {
            setPasswordError(error.message || "Failed to update password.");
            setPasswordSaving(false);
            return;
        }

        setPasswordInputs({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordSuccess("Password updated successfully.");
        setPasswordSaving(false);
        setTimeout(() => setPasswordSuccess(""), 3000);
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/freelancer/signin");
    };

    const renderSecuritySection = () => (
        <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                    <Shield size={18} className="text-black" />
                </div>
                <h3 className="text-[17px] font-semibold text-black">Security</h3>
            </div>

            <div className="space-y-3">
                {!showPasswordForm ? (
                    <button
                        type="button"
                        onClick={() => setShowPasswordForm(true)}
                        className="w-full rounded-xl bg-black text-white py-2.5 text-[13px] font-semibold hover:bg-[#1d1d1f] transition-all"
                    >
                        Change Password
                    </button>
                ) : (
                    <>
                        <input
                            type="password"
                            value={passwordInputs.currentPassword}
                            onChange={(e) =>
                                setPasswordInputs((prev) => ({ ...prev, currentPassword: e.target.value }))
                            }
                            placeholder="Current password"
                            autoComplete="current-password"
                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        />
                        <input
                            type="password"
                            value={passwordInputs.newPassword}
                            onChange={(e) =>
                                setPasswordInputs((prev) => ({ ...prev, newPassword: e.target.value }))
                            }
                            placeholder="New password"
                            autoComplete="new-password"
                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        />
                        <input
                            type="password"
                            value={passwordInputs.confirmPassword}
                            onChange={(e) =>
                                setPasswordInputs((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            }
                            placeholder="Confirm password"
                            autoComplete="new-password"
                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        />
                        <p className="text-[11px] text-[#86868b]">Minimum 8 characters.</p>
                        {passwordError && (
                            <p className="text-[12px] text-[#ff3b30] font-medium">{passwordError}</p>
                        )}
                        {passwordSuccess && (
                            <p className="text-[12px] text-[#1db32e] font-medium">{passwordSuccess}</p>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPasswordForm(false)}
                                className="w-full rounded-xl border border-[#d2d2d7] bg-white text-black py-2.5 text-[13px] font-semibold hover:bg-[#fafafa] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                disabled={passwordSaving}
                                className="w-full rounded-xl bg-black text-white py-2.5 text-[13px] font-semibold hover:bg-[#1d1d1f] transition-all disabled:opacity-50"
                            >
                                {passwordSaving ? "Updating..." : "Update Password"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    );

    const renderHeader = (isEditing: boolean, variant: "page" | "modal") => {
        const headerSpacing = variant === "modal" ? "mb-8" : "mb-12";
        return (
            <header className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${headerSpacing}`}>
                <div className="flex items-center gap-6">
                    <div className="relative group group-hover:cursor-pointer">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] overflow-hidden bg-white border border-[#f0f0f0] shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-gray-300">
                            {profile.personal_img_url ? (
                                <img
                                    src={profile.personal_img_url}
                                    alt={`${profile.first_name} ${profile.last_name}`.trim()}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#f9f9fb]">
                                    <User size={40} className="text-[#d2d2d7]" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleAvatarChange}
                            disabled={avatarUploading}
                        />
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[32px] ${avatarUploading ? "pointer-events-none" : "cursor-pointer"}`}
                            aria-label="Change profile photo"
                        >
                            {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="text-white" size={24} />}
                        </button>
                    </div>
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[32px] md:text-[40px] font-semibold text-black tracking-tight leading-tight"
                        >
                            {[profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Name not set"}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-[17px] md:text-[19px] text-[#86868b] font-medium mt-1"
                        >
                            {profile.job_title || "Professional Freelancer"}
                        </motion.p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence mode="wait">
                        {isEditing ? (
                            <motion.div
                                key="edit-actions"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-3"
                            >
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-6 py-2.5 rounded-full bg-white border border-[#d2d2d7] text-black text-[14px] font-semibold hover:bg-[#fafafa] transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-full bg-black text-white text-[14px] font-semibold hover:bg-[#1d1d1f] transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="edit-trigger"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => setEditMode(true)}
                                className="px-6 py-2.5 rounded-full bg-black text-white text-[14px] font-semibold hover:bg-[#1d1d1f] hover:-translate-y-0.5 hover:shadow-md transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                                <Edit3 size={16} />
                                Edit Profile
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </header>
        );
    };

    const renderFeedback = (show: boolean) => {
        if (!show) return null;
        return (
            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-8 p-4 bg-[#fff1f1] border border-[#ff3b30]/10 rounded-2xl flex items-center gap-3 text-[#ff3b30] text-[14px] font-medium"
                    >
                        <X size={18} />
                        {errorMsg}
                    </motion.div>
                )}
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-8 p-4 bg-[#f2faf3] border border-[#1db32e]/10 rounded-2xl flex items-center gap-3 text-[#1db32e] text-[14px] font-medium"
                    >
                        <Save size={18} />
                        {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    const renderProfileGrid = (isEditing: boolean) => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Details */}
            <div className="lg:col-span-2 space-y-8">
                {/* About / Bio */}
                <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                            <User size={20} className="text-black" />
                        </div>
                        <h2 className="text-[21px] font-semibold text-black tracking-tight">About</h2>
                    </div>

                    {isEditing ? (
                        <textarea
                            rows={6}
                            className="w-full bg-[#f9f9fb] rounded-2xl border border-[#ebebeb] p-4 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none"
                            value={profile.bio}
                            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell us about yourself..."
                        />
                    ) : (
                        <p className="text-[17px] text-[#424245] leading-relaxed whitespace-pre-wrap">
                            {profile.bio || "No bio added yet."}
                        </p>
                    )}
                </section>

                {/* Skills */}
                <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                            <Code size={20} className="text-black" />
                        </div>
                        <h2 className="text-[21px] font-semibold text-black tracking-tight">Skills & Expertise</h2>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                value={profile.skills}
                                onChange={(e) => setProfile(prev => ({ ...prev, skills: e.target.value }))}
                                placeholder="e.g. Design, React, Node.js"
                            />
                            <p className="text-[13px] text-[#86868b]">Separate skills with commas</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {profile.skills ? profile.skills.split(",").map((skill, i) => (
                                <span
                                    key={i}
                                    className="px-4 py-2 bg-[#f5f5f7] hover:bg-[#ebebeb] text-black text-[14px] font-medium rounded-full transition-colors cursor-default"
                                >
                                    {skill.trim()}
                                </span>
                            )) : (
                                <span className="text-[#86868b] italic">No skills added yet.</span>
                            )}
                        </div>
                    )}
                </section>

                {/* Contact Info */}
                <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                    <h3 className="text-[17px] font-semibold text-black mb-6">Contact Information</h3>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center shrink-0">
                                <Mail size={18} className="text-[#86868b]" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider mb-0.5">Email</p>
                                <p className="text-[15px] text-black font-semibold break-all">{profile.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-[#f5f5f7] rounded-xl flex items-center justify-center shrink-0">
                                <Phone size={18} className="text-[#86868b]" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider mb-0.5">Phone</p>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        className="w-full bg-[#f9f9fb] rounded-lg border border-[#ebebeb] px-3 py-1.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                        value={profile.phone_number}
                                        onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                                        placeholder="+20 ..."
                                    />
                                ) : (
                                    <p className="text-[15px] text-black font-semibold">{profile.phone_number || "Not provided"}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Right Column - Account Settings */}
            <div className="space-y-8">
                {renderSecuritySection()}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#fafafa]">
            <FreelancerSidebar onSignOut={handleSignOut} />

            <main className={`flex-1 ml-64 p-8 lg:p-12 ${editMode ? "relative overflow-hidden" : ""}`}>
                <div className={`max-w-4xl mx-auto transition-all duration-300 ${editMode ? "pointer-events-none select-none opacity-60" : ""}`}>
                    {renderHeader(false, "page")}
                    {renderFeedback(!editMode)}
                    {renderProfileGrid(false)}
                </div>

                {editMode && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
                        <div
                            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
                            onClick={() => setEditMode(false)}
                        />
                        <div className="relative w-full max-w-5xl" role="dialog" aria-modal="true" aria-label="Edit profile">
                            <div className="rounded-[36px] border border-white/40 bg-white/60 shadow-[0_30px_80px_rgba(15,15,15,0.25)] backdrop-blur-2xl">
                                <div className="max-h-[85vh] overflow-y-auto p-8 lg:p-10">
                                    {renderHeader(true, "modal")}
                                    {renderFeedback(true)}
                                    {renderProfileGrid(true)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <ImageCropperModal
                open={!!avatarCrop}
                file={avatarCrop?.file || null}
                aspect={1}
                title="Crop profile photo"
                onCancel={handleAvatarCropCancel}
                onConfirm={handleAvatarCropConfirm}
            />
        </div>
    );
}
