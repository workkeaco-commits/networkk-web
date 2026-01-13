"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
    Building2,
    Mail,
    Phone,
    Briefcase,
    Edit3,
    Save,
    X,
    Loader2,
    Globe,
    Shield,
    Settings,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientProfilePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordInputs, setPasswordInputs] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [profile, setProfile] = useState({
        client_id: null,
        first_name: "",
        last_name: "",
        company_name: "",
        email: "",
        phone_number: "",
        field: ""
    });

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            setErrorMsg("");

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/client/sign-in?next=/client/profile");
                return;
            }

            const { data, error } = await supabase
                .from("clients")
                .select("client_id, first_name, last_name, company_name, email, phone_number, field")
                .eq("auth_user_id", user.id)
                .single();

            if (!mounted) return;

            if (error || !data) {
                console.error("Error loading client profile", error);
                setErrorMsg("Could not load your profile. Please contact support.");
            } else {
                setProfile({
                    client_id: data.client_id,
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    company_name: data.company_name || "",
                    email: data.email || "",
                    phone_number: data.phone_number || "",
                    field: data.field || "",
                });
            }

            setLoading(false);
        })();

        return () => {
            mounted = false;
        };
    }, [router]);

    async function handleSave() {
        if (!profile?.client_id) return;

        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const firstName = profile.first_name?.trim() || "";
            const lastName = profile.last_name?.trim() || "";
            const companyName = profile.company_name?.trim() || "";

            const updates: Record<string, string | null> = {
                first_name: firstName || null,
                last_name: lastName || null,
                company_name: companyName || null,
                phone_number: profile.phone_number?.trim() || null,
                field: profile.field?.trim() || null,
            };

            const { error } = await supabase
                .from("clients")
                .update(updates)
                .eq("client_id", profile.client_id);

            if (error) {
                setErrorMsg(error.message || "Failed to save changes.");
                return;
            }

            setSuccessMsg("Profile updated successfully.");
            setEditMode(false);

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
        router.push("/client/signin");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
                <Loader2 className="w-8 h-8 text-[#10b8a6] animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#fafafa]">
            <DashboardSidebar onSignOut={handleSignOut} />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header Section */}
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-[#10b8a6] flex items-center justify-center shadow-lg shadow-teal-500/20">
                                <Building2 className="text-white" size={32} />
                            </div>
                            <div>
                                <motion.h1
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[32px] md:text-[36px] font-semibold text-black tracking-tight leading-tight"
                                >
                                    {profile.company_name?.trim() ||
                                        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
                                        "Owner Profile"}
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-[17px] text-[#86868b] font-medium mt-1"
                                >
                                    {profile.field || (profile.company_name ? "Business Account" : "Personal Account")}
                                </motion.p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <AnimatePresence mode="wait">
                                {editMode ? (
                                    <motion.div
                                        key="edit-actions"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center gap-3"
                                    >
                                        <button
                                            onClick={() => setEditMode(false)}
                                            className="px-6 py-2.5 rounded-full bg-white border border-[#d2d2d7] text-black text-[14px] font-semibold hover:bg-[#fafafa] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-6 py-2.5 rounded-full bg-[#10b8a6] text-white text-[14px] font-semibold hover:bg-[#0e9f8e] transition-all flex items-center gap-2 shadow-md shadow-teal-500/10 disabled:opacity-50"
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
                                        className="px-6 py-2.5 rounded-full bg-black text-white text-[14px] font-semibold hover:bg-[#1d1d1f] transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <Edit3 size={16} />
                                        Edit Profile
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </header>

                    {/* Feedback Messages */}
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

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Info Section */}
                        <div className="lg:col-span-8 space-y-8">
                            <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <User size={20} className="text-[#10b8a6]" />
                                    </div>
                                    <h2 className="text-[21px] font-semibold text-black tracking-tight">Account Information</h2>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">First Name</label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                                    value={profile.first_name}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                                                    placeholder="First name"
                                                />
                                            ) : (
                                                <p className="text-[17px] text-black font-medium px-1">{profile.first_name || "—"}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">Last Name</label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                                    value={profile.last_name}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                                                    placeholder="Last name"
                                                />
                                            ) : (
                                                <p className="text-[17px] text-black font-medium px-1">{profile.last_name || "—"}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">Company Name</label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                                    value={profile.company_name}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                                                    placeholder="Optional"
                                                />
                                            ) : (
                                                <p className="text-[17px] text-black font-medium px-1">{profile.company_name || "—"}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">Business Field</label>
                                            {editMode ? (
                                                <input
                                                    type="text"
                                                    className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                                    value={profile.field}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, field: e.target.value }))}
                                                    placeholder="e.g. Technology, Construction"
                                                />
                                            ) : (
                                                <p className="text-[17px] text-black font-medium px-1">{profile.field || "—"}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">Contact Email</label>
                                        <div className="flex items-center gap-3 px-1">
                                            <Mail size={16} className="text-[#86868b]" />
                                            <p className="text-[17px] text-black font-medium">{profile.email}</p>
                                        </div>
                                        <p className="text-[12px] text-[#86868b] mt-1 ml-1">Primary account email used for communications.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <Phone size={20} className="text-[#10b8a6]" />
                                    </div>
                                    <h2 className="text-[21px] font-semibold text-black tracking-tight">Contact Verification</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider ml-1">Phone Number</label>
                                    {editMode ? (
                                        <input
                                            type="tel"
                                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-3 text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                            value={profile.phone_number}
                                            onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                                            placeholder="+20 ..."
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 px-1">
                                            <p className="text-[17px] text-black font-medium">{profile.phone_number || "Not provided"}</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 space-y-8">
                            <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm overflow-hidden relative">
                                <div className="relative z-10">
                                    <h3 className="text-[17px] font-semibold text-black mb-6">Security</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#fafafa]">
                                            <Shield size={18} className="text-[#10b8a6]" />
                                            <span className="text-[14px] font-medium text-black">Active Account</span>
                                        </div>
                                        <button className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#f5f5f7] transition-all group">
                                            <div className="flex items-center gap-3">
                                                <Settings size={18} className="text-[#86868b] group-hover:text-black transition-colors" />
                                                <span className="text-[14px] text-[#1d1d1f] font-medium">Settings</span>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-[#f0f0f0] space-y-3">
                                        <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-wider">
                                            Change Password
                                        </p>
                                        <input
                                            type="password"
                                            value={passwordInputs.currentPassword}
                                            onChange={(e) =>
                                                setPasswordInputs((prev) => ({ ...prev, currentPassword: e.target.value }))
                                            }
                                            placeholder="Current password"
                                            autoComplete="current-password"
                                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                        />
                                        <input
                                            type="password"
                                            value={passwordInputs.newPassword}
                                            onChange={(e) =>
                                                setPasswordInputs((prev) => ({ ...prev, newPassword: e.target.value }))
                                            }
                                            placeholder="New password"
                                            autoComplete="new-password"
                                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                        />
                                        <input
                                            type="password"
                                            value={passwordInputs.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordInputs((prev) => ({ ...prev, confirmPassword: e.target.value }))
                                            }
                                            placeholder="Confirm password"
                                            autoComplete="new-password"
                                            className="w-full bg-[#f9f9fb] rounded-xl border border-[#ebebeb] px-4 py-2.5 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-[#10b8a6]/10 transition-all"
                                        />
                                        <p className="text-[11px] text-[#86868b]">Minimum 8 characters.</p>
                                        {passwordError && (
                                            <p className="text-[12px] text-[#ff3b30] font-medium">{passwordError}</p>
                                        )}
                                        {passwordSuccess && (
                                            <p className="text-[12px] text-[#1db32e] font-medium">{passwordSuccess}</p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleChangePassword}
                                            disabled={passwordSaving}
                                            className="w-full rounded-xl bg-black text-white py-2.5 text-[13px] font-semibold hover:bg-[#1d1d1f] transition-all disabled:opacity-50"
                                        >
                                            {passwordSaving ? "Updating..." : "Update Password"}
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b8a6]/[0.03] rounded-full blur-3xl -mr-16 -mt-16" />
                            </section>

                            <section className="bg-white rounded-[32px] p-8 border border-[#f5f5f7] shadow-sm">
                                <h3 className="text-[17px] font-semibold text-black mb-6">Company Links</h3>
                                <div className="space-y-3">
                                    <button className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#f5f5f7] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Globe size={18} className="text-[#86868b] group-hover:text-black transition-colors" />
                                            <span className="text-[14px] text-[#1d1d1f] font-medium">Business Website</span>
                                        </div>
                                    </button>
                                    <button className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#f5f5f7] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Briefcase size={18} className="text-[#86868b] group-hover:text-black transition-colors" />
                                            <span className="text-[14px] text-[#1d1d1f] font-medium">Company Profile</span>
                                        </div>
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
