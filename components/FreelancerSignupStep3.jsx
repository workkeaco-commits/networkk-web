"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Upload } from "lucide-react";

export default function FreelancerSignupStep3({ onBack, onNext, submitting = false }) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [educationStatus, setEducationStatus] = useState("degree"); // "degree" | "student"
  const [certificates, setCertificates] = useState([0]);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [idImagePreview, setIdImagePreview] = useState(null);

  function handleAddCertificate() {
    setCertificates((prev) => {
      const newId = prev.length ? Math.max(...prev) + 1 : 0;
      return [...prev, newId];
    });
  }
  function handleDeleteCertificate(id) {
    setCertificates((prev) => (prev.length > 1 ? prev.filter((c) => c !== id) : prev));
  }

  function handleProfileImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImagePreview(URL.createObjectURL(file));
  }
  function handleIdImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdImagePreview(URL.createObjectURL(file));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Build education object
    const edu =
      educationStatus === "degree"
        ? {
            status: "degree",
            degreeType: (fd.get("degreeType") || "").toString().trim(),
            degreeDate: (fd.get("degreeDate") || "").toString() || null, // YYYY-MM
          }
        : {
            status: "student",
            studyProgram: (fd.get("studyProgram") || "").toString().trim(),
            expectedGradDate: (fd.get("expectedGradDate") || "").toString() || null, // YYYY-MM
          };

    // Build certificates array from rendered indices
    const certs = certificates
      .map((cid, index) => ({
        name: (fd.get(`certificateName-${index}`) || "").toString().trim(),
        notes: (fd.get(`certificateSkills-${index}`) || "").toString().trim(),
      }))
      .filter((c) => c.name); // keep only filled rows

    // Files
    const profileImage = fd.get("profileImage");
    const nationalIdImage = fd.get("nationalIdImage");

    onNext({ education: edu, certificates: certs, profileImage, nationalIdImage });
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-200 px-6 py-6 md:px-10 md:py-8">
        <div className="mb-10">
          <Image src="/chatgpt-instructions3.jpeg" alt="Networkk" width={128} height={50} className="h-8 w-auto" />
        </div>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">Step 3 of 3</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Education, certificates & verification</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Tell us about your education and courses, then upload your personal photo and national ID.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* EDUCATION */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Education</label>
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="educationStatus"
                  value="degree"
                  checked={educationStatus === "degree"}
                  onChange={() => setEducationStatus("degree")}
                  className="h-4 w-4 text-[#079c02] border-slate-300 focus:ring-[#079c02]"
                />
                <span>I have a degree</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="educationStatus"
                  value="student"
                  checked={educationStatus === "student"}
                  onChange={() => setEducationStatus("student")}
                  className="h-4 w-4 text-[#079c02] border-slate-300 focus:ring-[#079c02]"
                />
                <span>I am currently a student</span>
              </label>
            </div>

            {educationStatus === "degree" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="degreeType" className="block text-xs font-medium text-slate-700 mb-1">
                    Type of degree
                  </label>
                  <input
                    id="degreeType" name="degreeType" type="text" placeholder="e.g. BSc Computer Science"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="degreeDate" className="block text-xs font-medium text-slate-700 mb-1">
                    Date of certificate
                  </label>
                  <input
                    id="degreeDate" name="degreeDate" type="month" max={todayMonth}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {educationStatus === "student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="studyProgram" className="block text-xs font-medium text-slate-700 mb-1">
                    Program / major
                  </label>
                  <input
                    id="studyProgram" name="studyProgram" type="text" placeholder="e.g. BSc Computer Engineering"
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="expectedGradDate" className="block text-xs font-medium text-slate-700 mb-1">
                    Expected graduation date (optional)
                  </label>
                  <input
                    id="expectedGradDate" name="expectedGradDate" type="month" min={todayMonth}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CERTIFICATES */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Certificates & courses</label>
            <div className="space-y-3 mt-1">
              {certificates.map((cid, index) => (
                <div key={cid} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-500">Certificate {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleAddCertificate}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Plus className="h-4 w-4" /> Add another
                      </button>
                      {certificates.length > 1 && (
                        <button type="button" onClick={() => handleDeleteCertificate(cid)}
                          className="text-xs font-medium text-red-500 hover:text-red-600">Delete</button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`certificateName-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                      Certificate / course name
                    </label>
                    <input
                      id={`certificateName-${index}`} name={`certificateName-${index}`} type="text"
                      placeholder="e.g. Deep Learning Specialization – Coursera"
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label htmlFor={`certificateSkills-${index}`} className="block text-xs font-medium text-slate-700 mb-1">
                      Skills learnt from this course
                    </label>
                    <textarea
                      id={`certificateSkills-${index}`} name={`certificateSkills-${index}`} rows={3}
                      placeholder="e.g. CNNs, transfer learning, model deployment..."
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PERSONAL IMAGE */}
          <div className="space-y-2">
            <label htmlFor="profileImage" className="block text-sm font-medium text-slate-700">Personal photo</label>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                <span>Upload image</span>
                <input id="profileImage" name="profileImage" type="file" accept="image/*" className="sr-only" onChange={handleProfileImageChange}/>
              </label>
              {profileImagePreview && (
                <div className="h-16 w-16 rounded-full overflow-hidden border border-slate-200">
                  <img src={profileImagePreview} alt="Profile preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">JPG/PNG, max 5 MB.</p>
          </div>

          {/* NATIONAL ID */}
          <div className="space-y-2">
            <label htmlFor="nationalIdImage" className="block text-sm font-medium text-slate-700">National ID (front)</label>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                <span>Upload ID image</span>
                <input id="nationalIdImage" name="nationalIdImage" type="file" accept="image/*" className="sr-only" onChange={handleIdImageChange}/>
              </label>
              {idImagePreview && (
                <div className="h-16 w-24 rounded-xl overflow-hidden border border-slate-200">
                  <img src={idImagePreview} alt="National ID preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Used for verification only; never shown publicly.</p>
          </div>

          {/* NAV BUTTONS */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl 
                bg-[#079c02] px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                transition hover:bg-[#056b01] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Finish signup
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
