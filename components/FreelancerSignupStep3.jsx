"use client";

import { useRef, useState } from "react";
import { GraduationCap, BookOpen, Plus, X, Camera, ShieldCheck, ChevronRight, UploadCloud, Loader2 } from "lucide-react";
import ImageCropperModal from "@/components/ImageCropperModal";

export default function FreelancerSignupStep3({ onBack, onNext, submitting = false }) {
  const [eduStatus, setEduStatus] = useState("graduated"); // "graduated" | "student" | "none"
  const [certs, setCerts] = useState([0]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [activeCrop, setActiveCrop] = useState(null);
  const [fileError, setFileError] = useState("");

  const profileInputRef = useRef(null);
  const idInputRef = useRef(null);

  function handleAddCert() {
    setCerts((prev) => [...prev, prev.length ? Math.max(...prev) + 1 : 0]);
  }
  function handleDeleteCert(v) {
    setCerts((prev) => prev.filter((c) => c !== v));
  }

  function isHeicFile(file) {
    if (!file) return false;
    const type = (file.type || "").toLowerCase();
    return type.includes("heic") || type.includes("heif") || /\.(heic|heif)$/i.test(file.name || "");
  }

  async function normalizeImageFile(file) {
    if (!isHeicFile(file)) return file;
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      if (!blob || !blob.size) throw new Error("Empty HEIC conversion.");
      const baseName = (file.name || "image").replace(/\.(heic|heif)$/i, "");
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } catch (err) {
      setFileError("HEIC/HEIF images are not supported. Please upload a JPG or PNG image.");
      return null;
    }
  }

  async function handleFileChange(e, type) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    if (!file.size) {
      setFileError("That file is empty. Please choose another image.");
      return;
    }
    setFileError("");

    const normalized = await normalizeImageFile(file);
    if (!normalized) return;
    if (!normalized.size) {
      setFileError("That file is empty after processing. Please upload a JPG or PNG image.");
      return;
    }

    if (type === "id") {
      const url = URL.createObjectURL(normalized);
      if (idPreview) URL.revokeObjectURL(idPreview);
      setIdPreview(url);
      setNationalIdFile(normalized);
      return;
    }
    setActiveCrop({ type, file: normalized });
  }

  function handleCropConfirm(croppedFile) {
    if (!croppedFile || !croppedFile.size) {
      setFileError("We couldn't process that image. Please upload a JPG or PNG image.");
      setActiveCrop(null);
      return;
    }
    const url = URL.createObjectURL(croppedFile);
    if (activeCrop?.type === "profile") {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePreview(url);
      setProfileFile(croppedFile);
    }
    if (activeCrop?.type === "id") {
      if (idPreview) URL.revokeObjectURL(idPreview);
      setIdPreview(url);
      setNationalIdFile(croppedFile);
    }
    setFileError("");
    setActiveCrop(null);
  }

  function handleCropCancel() {
    setActiveCrop(null);
  }

  function handleRemoveProfile() {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(null);
    setProfileFile(null);
    if (profileInputRef.current) profileInputRef.current.value = "";
  }

  function handleRemoveId() {
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(null);
    setNationalIdFile(null);
    if (idInputRef.current) idInputRef.current.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!profileFile || !nationalIdFile) {
      setFileError("Profile photo and national ID scan are required.");
      return;
    }
    if (!profileFile.size || !nationalIdFile.size) {
      setFileError("Uploaded files cannot be empty. Please choose another image.");
      return;
    }
    const fd = new FormData(e.currentTarget);

    const education = {
      status: eduStatus,
      school: (fd.get("university") || "").toString().trim(),
      degree: (fd.get("degree") || "").toString().trim(),
      major: (fd.get("major") || "").toString().trim(),
      graduationYear: (fd.get("graduationYear") || "").toString().trim(),
    };

    const certList = certs.map((cid, index) => ({
      name: (fd.get(`certName-${index}`) || "").toString().trim(),
      org: (fd.get(`certOrg-${index}`) || "").toString().trim(),
      year: (fd.get(`certYear-${index}`) || "").toString().trim(),
    })).filter(c => c.name || c.org);

    onNext({ education, certificates: certList, profileImage: profileFile, nationalIdImage: nationalIdFile });
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-12 pb-12">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-[720px] bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-white">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-teal-50 text-[#10b8a6] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">Step 3 of 3</p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Finalize your profile
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Verify your identity and add your educational background.
            </p>
          </div>

          <div className="h-px bg-gray-100 w-full mb-12" />

          <form className="space-y-12" onSubmit={handleSubmit}>
            {/* EDUCATION SECTION */}
            <div className="space-y-6 text-left">
              <label className="text-[14px] font-semibold text-gray-900 ml-1">Education Status</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setEduStatus("graduated")}
                  className={`flex flex-col items-center p-6 rounded-[32px] border-2 transition-all group ${eduStatus === "graduated" ? "border-[#10b8a6] bg-white shadow-lg shadow-[#10b8a6]/5" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${eduStatus === "graduated" ? "bg-[#10b8a6] text-white" : "bg-white text-gray-400"
                    }`}>
                    <GraduationCap className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="font-semibold text-gray-900">Graduated</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEduStatus("student")}
                  className={`flex flex-col items-center p-6 rounded-[32px] border-2 transition-all group ${eduStatus === "student" ? "border-[#10b8a6] bg-white shadow-lg shadow-[#10b8a6]/5" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${eduStatus === "student" ? "bg-[#10b8a6] text-white" : "bg-white text-gray-400"
                    }`}>
                    <BookOpen className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="font-semibold text-gray-900">Student</span>
                </button>
              </div>

              {eduStatus !== "none" && (
                <div className="space-y-4 pt-4 animate-fade-in">
                  <div className="space-y-2">
                    <label htmlFor="university" className="text-[13px] font-medium text-gray-500 ml-1">University</label>
                    <input
                      id="university" name="university" type="text" placeholder="e.g. Cairo University"
                      className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="degree" className="text-[13px] font-medium text-gray-500 ml-1">Degree</label>
                      <input
                        id="degree" name="degree" type="text" placeholder="e.g. Bachelor's"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="major" className="text-[13px] font-medium text-gray-500 ml-1">Major</label>
                      <input
                        id="major" name="major" type="text" placeholder="e.g. Computer Science"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="graduationYear" className="text-[13px] font-medium text-gray-500 ml-1">
                      {eduStatus === "graduated" ? "Graduation Year" : "Expected Grad Year"}
                    </label>
                    <input
                      id="graduationYear" name="graduationYear" type="text" placeholder="2024"
                      className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CERTIFICATES SECTION */}
            <div className="space-y-6 pt-4 border-t border-gray-100 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[14px] font-semibold text-gray-900 ml-1 block mb-1">Certifications</label>
                  <p className="text-sm text-gray-500 ml-1">Add any professional certifications you have.</p>
                </div>
                <button type="button" onClick={handleAddCert}
                  className="text-[#10b8a6] hover:text-[#0e9f8e] font-semibold text-sm flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> Add another
                </button>
              </div>

              <div className="space-y-4">
                {certs.map((cid, index) => (
                  <div key={cid} className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4 shadow-sm relative group animate-fade-in">
                    {certs.length > 1 && (
                      <button type="button" onClick={() => handleDeleteCert(cid)}
                        className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <input
                      id={`certName-${index}`} name={`certName-${index}`} type="text"
                      placeholder="Certification Name (e.g. AWS Certified Developer)"
                      className="w-full text-lg font-semibold bg-transparent placeholder:text-gray-200 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        id={`certOrg-${index}`} name={`certOrg-${index}`} type="text" placeholder="Organization"
                        className="w-full bg-gray-50 border-none rounded-[14px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none"
                      />
                      <input
                        id={`certYear-${index}`} name={`certYear-${index}`} type="text" placeholder="Year"
                        className="w-full bg-gray-50 border-none rounded-[14px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UPLOADS SECTION */}
            <div className="space-y-6 pt-4 border-t border-gray-100 text-left">
              {fileError && (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600 animate-fade-in">
                  {fileError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Photo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="w-4 h-4 text-gray-400" />
                    <label className="text-[14px] font-semibold text-gray-900">Profile Photo</label>
                    <span className="text-[11px] font-semibold text-gray-400">Required</span>
                  </div>
                  <div className="relative group">
                    <input
                      ref={profileInputRef}
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      name="profileImage"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e, "profile")}
                    />
                    <label
                      htmlFor="profileImage"
                      className={`aspect-square rounded-[40px] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden bg-gray-50/50 cursor-pointer ${profilePreview ? "border-[#10b8a6] bg-white" : "border-gray-200 group-hover:border-gray-300"
                        }`}
                    >
                      {profilePreview ? (
                        <img src={profilePreview} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-gray-300 mb-2 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-gray-500">Upload photo</span>
                        </>
                      )}
                    </label>
                    {profilePreview && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => profileInputRef.current?.click()}
                          className="text-sm font-semibold text-[#10b8a6] hover:text-[#0e9f8e] transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveProfile}
                          className="text-sm font-semibold text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* National ID */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <label className="text-[14px] font-semibold text-gray-900">National ID Scan</label>
                    <span className="text-[11px] font-semibold text-gray-400">Required</span>
                  </div>
                  <div className="relative group">
                    <input
                      ref={idInputRef}
                      id="nationalIdImage"
                      type="file"
                      accept="image/*"
                      name="nationalIdImage"
                      className="sr-only"
                      onChange={(e) => handleFileChange(e, "id")}
                    />
                    <label
                      htmlFor="nationalIdImage"
                      className={`rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden bg-gray-50/50 cursor-pointer ${idPreview ? "border-[#10b8a6] bg-white" : "border-gray-200 group-hover:border-gray-300"
                        } ${idPreview ? "py-0" : "py-10"}`}
                    >
                      {idPreview ? (
                        <img src={idPreview} alt="ID" className="w-full h-auto object-contain animate-fade-in" />
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-gray-300 mb-2 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-gray-500">Upload ID</span>
                        </>
                      )}
                    </label>
                    {idPreview && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => idInputRef.current?.click()}
                          className="text-sm font-semibold text-[#10b8a6] hover:text-[#0e9f8e] transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveId}
                          className="text-sm font-semibold text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* NAV BUTTONS */}
            <div className="pt-8 flex items-center justify-between border-t border-gray-100">
              <button type="button" onClick={onBack} className="text-lg font-medium text-gray-400 hover:text-black transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#10b8a6] hover:bg-[#0e9f8e] text-white font-semibold rounded-full px-10 py-4 text-lg shadow-lg shadow-[#10b8a6]/20 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    Complete signup
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <ImageCropperModal
        open={!!activeCrop}
        file={activeCrop?.file || null}
        aspect={activeCrop?.type === "id" ? 16 / 9 : 1}
        title={activeCrop?.type === "id" ? "Crop ID scan" : "Crop profile photo"}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
