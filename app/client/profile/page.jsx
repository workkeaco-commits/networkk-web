"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function ClientProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [profile, setProfile] = useState(null); // { client_id, name, email, phone_number, field }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      // 1) Check auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not signed in → go to sign-in and come back after
        router.replace("/client/sign-in?next=/client/profile");
        return;
      }

      // 2) Load client row for this user
      const { data, error } = await supabase
        .from("clients")
        .select("client_id, name, email, phone_number, field")
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        console.error("Error loading client profile", error);
        setErrorMsg("Could not load your profile. Please contact support.");
        setProfile(null);
      } else {
        setProfile({
          client_id: data.client_id,
          name: data.name || "",
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
      const updates = {
        name: profile.name?.trim() || null,
        phone_number: profile.phone_number?.trim() || null,
        field: profile.field?.trim() || null,
        // email shown but not updated here to keep auth email in sync
      };

      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("client_id", profile.client_id)
        .select("client_id")
        .single();

      if (error) {
        console.error("Error updating profile", error);
        setErrorMsg(error.message || "Failed to save changes.");
        return;
      }

      setSuccessMsg("Profile updated successfully.");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <p className="text-sm text-red-600">
            We couldn&apos;t find your client profile.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Account profile
            </h1>
            <p className="text-sm text-slate-500">
              View and update the information associated with your client
              account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorMsg("");
              setSuccessMsg("");
              setEditMode((prev) => !prev);
            }}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {editMode ? "Cancel editing" : "Edit profile"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {/* Messages */}
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              {successMsg}
            </p>
          )}

          {/* Name */}
          <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-100 pb-4">
            <div className="text-sm font-medium text-slate-700">Name</div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your full name or company name"
                />
              ) : (
                <p className="text-sm text-slate-900">
                  {profile.name || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Email (read-only for now) */}
          <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-100 pb-4">
            <div className="text-sm font-medium text-slate-700">Email</div>
            <div className="col-span-2">
              <p className="text-sm text-slate-900">{profile.email || "—"}</p>
              <p className="mt-1 text-xs text-slate-400">
                This email is linked to your login and can&apos;t be changed
                here.
              </p>
            </div>
          </div>

          {/* Phone number */}
          <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-100 pb-4">
            <div className="text-sm font-medium text-slate-700">
              Phone number
            </div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="tel"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.phone_number}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      phone_number: e.target.value,
                    }))
                  }
                  placeholder="+20 ..."
                />
              ) : (
                <p className="text-sm text-slate-900">
                  {profile.phone_number || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Field / industry */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-slate-700">
              Company field
            </div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.field}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, field: e.target.value }))
                  }
                  placeholder="e.g. Construction, Software, Design"
                />
              ) : (
                <p className="text-sm text-slate-900">
                  {profile.field || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        {editMode && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-950 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
