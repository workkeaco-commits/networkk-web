"use client";
import {
  MessageSquare,
  Shield,
  Zap,
  FileText,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/browser";
import DashboardMockup from "./DashboardMockup";

export default function HomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [communityAvatars, setCommunityAvatars] = useState([]);
  const [showcaseFreelancers, setShowcaseFreelancers] = useState([]);

  /* Auto-scroll carousel */
  useEffect(() => {
    if (!showcaseFreelancers.length) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseFreelancers.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showcaseFreelancers.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadShowcaseFreelancers() {
      const { data, error } = await supabase
        .from("freelancers")
        .select("freelancer_id, first_name, last_name, job_title, personal_img_url")
        .not("personal_img_url", "is", null)
        .limit(8);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load freelancers:", error);
        return;
      }

      const normalized = (data || []).map((row) => ({
        id: row.freelancer_id,
        name:
          [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Freelancer",
        role: row.job_title || "Freelancer",
        image: row.personal_img_url,
      }));

      setShowcaseFreelancers(normalized);
      setCommunityAvatars(normalized.map((row) => row.image).filter(Boolean).slice(0, 3));
    }

    loadShowcaseFreelancers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased overflow-x-hidden">
      {/* Sticky Blurred Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200/50 transition-all duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-[52px] flex items-center justify-between relative">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo-sf-display.png"
              alt="Networkk"
              width={176}
              height={48}
              className="h-[38.4px] w-auto object-contain"
              priority
            />
          </Link>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-[12px] font-medium tracking-wide text-gray-800">
            <Link href="/freelancer/signup" className="hover:text-[#10b8a6] transition-colors">Talent</Link>
            <Link href="#how-it-works" className="hover:text-[#10b8a6] transition-colors">How it Works</Link>
            <Link href="#our-story" className="hover:text-[#10b8a6] transition-colors">Our Story</Link>
            <Link href="/blog" className="hover:text-[#10b8a6] transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/client/signup" className="hidden md:inline-block text-[12px] bg-black text-white px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-48 md:pb-32 px-6">
        <div className="max-w-[980px] mx-auto text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tightest leading-[1.05] mb-6 text-black">
            Hire skilled<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10b8a6] to-[#34d399]">
              freelancers.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto mb-10 delay-100 animate-fade-in opacity-0 fill-mode-forwards">
            Bring your vision to life with Egypt’s trusted experts in engineering, business, and design.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 delay-200 animate-fade-in opacity-0 fill-mode-forwards">
            <button className="bg-[#10b8a6] hover:bg-[#0e9f8e] text-white text-[17px] px-8 py-3 rounded-full transition-all transform hover:scale-105" onClick={() => router.push('/client/signup')}>
              Hire Talent
            </button>
            <a href="#how-it-works" className="text-[#10b8a6] hover:underline text-[17px] flex items-center gap-1 group">
              How it works <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* Premium Dashboard Mockup Visual */}
        <div className="mt-20 max-w-6xl mx-auto md:h-[700px] delay-300 animate-fade-in opacity-0 fill-mode-forwards relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#10b8a6]/10 via-teal-500/5 to-emerald-500/10 rounded-[60px] blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-full"
          >
            <DashboardMockup />
          </motion.div>

          {/* Floating UI Accents */}
          <div className="absolute -bottom-10 -right-10 hidden lg:block animate-fade-in delay-500 opacity-0 fill-mode-forwards">
            <div className="bg-white/90 backdrop-blur-xl border border-gray-100 p-6 rounded-[32px] shadow-2xl shadow-black/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#10b8a6] flex items-center justify-center">
                <MessageSquare className="text-white" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-black leading-tight">Instant Chat</span>
                <span className="text-[12px] text-gray-400 font-medium">Connect with experts in seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section - Large Typography */}
      <section id="our-story" className="py-24 md:py-32 bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-8">Our Story</p>
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
            <div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 leading-tight mb-6">
                Not just a job board.
                <br></br>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#34d399] to-[#0ea5e9]">Ideally better.</span>
              </h2>
            </div>
            <div>
              <p className="text-xl text-gray-600 leading-relaxed font-medium">
                We built Networkk for clients who need outcomes, not overhead. Find trusted specialists, protect your budget with clear milestones, and keep delivery smooth from kickoff to handoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid - Features */}
      <section className="py-24 md:py-32 bg-[#f5f5f7]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-center mb-16">The platform for pros.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="md:col-span-2 bg-white p-10 md:p-14 rounded-[30px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Payments</p>
                <h3 className="text-3xl font-bold mb-4">Milestone Protection.</h3>
                <p className="text-gray-600 text-lg max-w-md">Funds are held safely in escrow until you approve the work. No surprises.</p>
              </div>
              <Shield className="absolute bottom-[-20px] right-[-20px] w-64 h-64 text-gray-100 group-hover:scale-105 transition-transform" strokeWidth={2} />
            </div>

            {/* Card 2 */}
            <div className="bg-white p-10 rounded-[30px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Speed</p>
                <h3 className="text-3xl font-bold mb-4">Fast Hiring.</h3>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-10 h-10 text-[#10b8a6]" strokeWidth={2.5} fill="currentColor" />
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-10 rounded-[30px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between md:col-span-1 group">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Community</p>
                <h3 className="text-3xl font-bold mb-4">Top Talent.</h3>
              </div>
              <div className="mt-8 flex -space-x-4 justify-center">
                {[...communityAvatars, null, null, null].slice(0, 3).map((url, index) => (
                  <div
                    key={`${url || "placeholder"}-${index}`}
                    className="w-12 h-12 rounded-full border-2 border-white bg-gray-200 overflow-hidden"
                  >
                    {url ? (
                      <Image
                        src={url}
                        alt="Freelancer profile"
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4 */}
            <div className="md:col-span-2 bg-white p-10 md:p-14 rounded-[30px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Workflow</p>
                <h3 className="text-3xl font-bold mb-4">Seamless Chat.</h3>
                <p className="text-gray-600 text-lg max-w-md">Connect, refine scope, and share files all in one unified workspace.</p>
              </div>
              <MessageSquare className="absolute bottom-8 right-8 w-32 h-32 text-teal-100 -rotate-12 group-hover:rotate-0 transition-transform" strokeWidth={2} />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Reimagined as a Premium Flow */}
      <section id="how-it-works" className="py-24 md:py-48 bg-white overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-[800px] mb-24 animate-fade-in">
            <h2 className="text-4xl md:text-7xl font-semibold tracking-tightest leading-tight mb-8">
              Hiring talent simplified.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0ea5e9] to-[#10b8a6]">In three simple steps.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1: The Brief */}
            <div className="group relative p-10 rounded-[48px] bg-[#fbfbfd] border border-gray-100 hover:border-[#10b8a6]/20 transition-all duration-700 hover:shadow-2xl hover:shadow-[#10b8a6]/5">
              <div className="absolute top-8 right-10 text-[80px] font-bold text-gray-50/50 group-hover:text-[#10b8a6]/5 transition-colors duration-700 pointer-events-none select-none">01</div>
              <div className="mb-12 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white flex items-center justify-center shadow-xl shadow-sky-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Sparkles className="w-8 h-8" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">Post a Job.</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10">
                Simply describe what you need. Our AI helps you draft the perfect brief that attracts top-tier talent.
              </p>

              {/* Visual Mini-Mockup */}
              <div className="bg-white rounded-[32px] p-6 border border-gray-50 shadow-inner group-hover:translate-y-[-8px] transition-transform duration-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#10b8a6] animate-pulse"></div>
                  <div className="h-2 w-24 bg-gray-100 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-gray-50 rounded-full"></div>
                  <div className="h-2 w-10/12 bg-gray-50 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Step 2: The Hire */}
            <div className="group relative p-10 rounded-[48px] bg-[#fbfbfd] border border-gray-100 hover:border-[#10b8a6]/20 transition-all duration-700 hover:shadow-2xl hover:shadow-[#10b8a6]/5">
              <div className="absolute top-8 right-10 text-[80px] font-bold text-gray-50/50 group-hover:text-[#10b8a6]/5 transition-colors duration-700 pointer-events-none select-none">02</div>
              <div className="mb-12 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#10b8a6] text-white flex items-center justify-center shadow-xl shadow-blue-500/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <Users className="w-8 h-8" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">Hire Expertise.</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10">
                Review proposals, check curated portfolios, and pick the expert that aligns with your vision.
              </p>

              {/* Visual Mini-Mockup */}
              <div className="flex -space-x-3 justify-start mb-2 group-hover:translate-x-2 transition-transform duration-700">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-100"></div>
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-4 border-white bg-[#10b8a6] flex items-center justify-center text-white">
                  <Plus size={16} strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Step 3: The Work */}
            <div className="group relative p-10 rounded-[48px] bg-[#fbfbfd] border border-gray-100 hover:border-[#10b8a6]/20 transition-all duration-700 hover:shadow-2xl hover:shadow-[#10b8a6]/5">
              <div className="absolute top-8 right-10 text-[80px] font-bold text-gray-50/50 group-hover:text-[#10b8a6]/5 transition-colors duration-700 pointer-events-none select-none">03</div>
              <div className="mb-12 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b8a6] to-[#0d9488] text-white flex items-center justify-center shadow-xl shadow-teal-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <ShieldCheck className="w-8 h-8" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">Collaborate Safely.</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10">
                Chat, share files, and pay securely. Funds are only released when you approve the milestones.
              </p>

              {/* Visual Mini-Mockup */}
              <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex items-center gap-4 group-hover:scale-105 transition-transform duration-700">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                </div>
                <div className="h-2 w-24 bg-gray-100 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Freelancer Showcase - Clean Carousel */}
      <section className="py-24 bg-[#fbfbfd]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Meet the talent.</h2>
            <div className="flex gap-2">
              <button onClick={() => { }} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button onClick={() => { }} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-8">
            {showcaseFreelancers.map((f) => (
              <div key={f.id} className="min-w-[300px] md:min-w-[360px] bg-white rounded-[24px] shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="h-[280px] relative">
                  <Image src={f.image} alt={f.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className="text-xl font-semibold">{f.name}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{f.role}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-gray-100 text-[11px] px-2.5 py-1 rounded-full text-gray-600 font-medium">Top Rated</span>
                    <span className="bg-gray-100 text-[11px] px-2.5 py-1 rounded-full text-gray-600 font-medium">Verified</span>
                  </div>
                  <button className="w-full py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:border-black hover:bg-black hover:text-white transition-all">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="bg-white border-t border-gray-200 py-16 text-[12px] text-gray-500">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <p className="mb-4">Copyright © 2025 Networkk Inc. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Service</Link>
            <Link href="#" className="hover:underline">Sales and Refunds</Link>
            <Link href="#" className="hover:underline">Legal</Link>
          </div>
        </div>
      </footer>

      {/* Zap Icon Definition */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <symbol id="zap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </symbol>
        </defs>
      </svg>
    </div>
  );
}
