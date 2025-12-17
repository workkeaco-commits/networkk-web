"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

export default function FreelancerProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [profile, setProfile] = useState(null); // { freelancer_id, full_name, job_title, bio, email, phone_number, skills }

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
        router.replace("/freelancer/sign-in?next=/freelancer/profile");
        return;
      }

      // 2) Load freelancer row
      const { data, error } = await supabase
        .from("freelancers")
        .select(
          "freelancer_id, full_name, job_title, bio, email, phone_number, skills"
        )
        .eq("auth_user_id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        console.error("Error loading freelancer profile", error);
        setErrorMsg(
          "Could not load your freelancer profile. Please complete signup."
        );
        setProfile(null);
      } else {
        setProfile({
          freelancer_id: data.freelancer_id,
          full_name: data.full_name || "",
          job_title: data.job_title || "",
          bio: data.bio || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          skills:
            typeof data.skills === "string"
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

  async function handleSave() {
    if (!profile?.freelancer_id) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updates = {
        full_name: profile.full_name?.trim() || null,
        job_title: profile.job_title?.trim() || null,
        bio: profile.bio?.trim() || null,
        phone_number: profile.phone_number?.trim() || null,
        // store skills as comma-separated string (you can change this to an array if your column is array type)
        skills: profile.skills?.trim() || null,
      };

      const { error } = await supabase
        .from("freelancers")
        .update(updates)
        .eq("freelancer_id", profile.freelancer_id)
        .select("freelancer_id")
        .single();

      if (error) {
        console.error("Error updating freelancer profile", error);
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
            We couldn&apos;t find your freelancer profile.
          </p>
          <button
            onClick={() => router.push("/freelancer/signup")}
            className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-950"
          >
            Go to freelancer signup
          </button>
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
              Freelancer profile
            </h1>
            <p className="text-sm text-slate-500">
              View and update the information that clients see.
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
            <div className="text-sm font-medium text-slate-700">Full name</div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Your full name"
                />
              ) : (
                <p className="text-sm text-slate-900">
                  {profile.full_name || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Job title */}
          <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-100 pb-4">
            <div className="text-sm font-medium text-slate-700">Job title</div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.job_title}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      job_title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Senior Data Scientist"
                />
              ) : (
                <p className="text-sm text-slate-900">
                  {profile.job_title || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
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

          {/* Phone */}
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

          {/* Bio */}
          <div className="grid grid-cols-3 gap-4 items-start border-b border-slate-100 pb-4">
            <div className="text-sm font-medium text-slate-700">Bio</div>
            <div className="col-span-2">
              {editMode ? (
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Short summary about your experience and what you do."
                />
              ) : (
                <p className="text-sm text-slate-900 whitespace-pre-line">
                  {profile.bio || "—"}
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-sm font-medium text-slate-700">Skills</div>
            <div className="col-span-2">
              {editMode ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={profile.skills}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, skills: e.target.value }))
                  }
                  placeholder="e.g. Python, Computer Vision, Django"
                />
              ) : profile.skills ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.split(",").map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-800"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-900">—</p>
              )}
            </div>
          </div>
        </div>

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
