"use client";
import {
  Search,
  MessageSquare,
  CheckCircle,
  Star,
  MapPin,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Upload,
  Zap,
  Users,
  Target,
  Shield,
  Rocket,
} from "lucide-react";
import Image from "next/image";

import { useState, useEffect } from "react";

const HERO_VIDEO_SRC = "/hero.mp4"; // file in /public/hero.mp4

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const freelancers = [
    {
      name: "Amira Hassan",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
      location: "Cairo, Egypt",
      skills: ["UI/UX", "Web Design", "Prototyping"],
    },
    {
      name: "Omar Khalil",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      location: "Alexandria, Egypt",
      skills: ["Full Stack", "React", "MongoDB"],
    },
    {
      name: "Layla Ahmed",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
      location: "Giza, Egypt",
      skills: ["SEO", "Copywriting", "KnowledgeGraph"],
    },
    {
      name: "Hassan Mahmoud",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
      location: "Cairo, Egypt",
      skills: ["Mobile Dev", "Flutter", "iOS"],
    },
    {
      name: "Nour El-Din",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      location: "Giza, Egypt",
      skills: ["Graphic Design", "Branding", "Illustration"],
    },
  ];

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % freelancers.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [freelancers.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % freelancers.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + freelancers.length) % freelancers.length,
    );
  };

  return (
    <div className="min-h-screen bg-white font-[-apple-system,BlinkMacSystemFont,'SF_Pro','Segoe_UI',sans-serif]">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-1.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/cropped_logo.jpg"
                alt="Networkk"
                width={160}   // base intrinsic ratio (approx 4:1)
                height={40}
                className="h-8 w-auto"  // actual rendered size, keeps aspect ratio
              />
            </div>

            {/* Centered nav */}
            <nav className="hidden md:flex flex-1 justify-center gap-6 text-sm">
              <a
                href="#"
                className="text-gray-700 hover:text-gray-900 py-1"
              >
                Browse Talent
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-gray-900 py-1"
              >
                How It Works
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-gray-900 py-1"
              >
                Our Story
              </a>
              <a
                href="#"
                className="text-gray-700 hover:text-gray-900 py-1"
              >
                For Freelancers
              </a>
            </nav>

            {/* CTA button – smaller & thinner */}
            <button className="border border-[#00BFA5] text-[#00BFA5] px-5 py-1.5 rounded-full text-sm font-medium bg-transparent hover:bg-white/10">
              Get Started
            </button>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover z-0"
          src="/networkvideo.mp4"  // must be in /public/networkvideo.mp4
          autoPlay
          muted
          loop
          playsInline
        >
          Your browser does not support the video tag.
        </video>

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* Text content on top */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-8">
            <p className="text-gray-200 mb-3 flex items-center justify-center gap-2 font-bold">
              <span>🇪🇬</span> Egypt&apos;s Premier Marketplace for Freelance Jobs
            </p>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Hire skilled freelancers.
              <br />
              Bring your{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #10b8a6 0%, #00D9CC 25%, #10b8a6 50%, #0fa0c1 75%, #00B8A6 100%)",
                }}
              >
                vision
              </span>{" "}
              to life.
            </h2>
            <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
              Hire trusted experts in engineering, business, and design—anytime,
              anywhere.
            </p>

            <div className="flex gap-4 justify-center items-center">
              {/* White outlined button */}
              <button
                className="px-8 py-3 rounded-full font-medium border border-white text-white bg-transparent hover:bg-white/10 transition"
              >
                Hire Freelancers
              </button>

              {/* White text link to how-it-works section */}
              <a
                href="#how-it-works"
                className="font-medium text-white hover:underline"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Our Story Section - Apple Music Style */}
      <section className="bg-gray-100 py-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* First Block */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#00bfa5] via-[#00a5cf] to-[#0080ff]">
                Our Story
              </p>
              <h2 className="text-6xl md:text-7xl font-bold leading-tight mb-0 bg-clip-text text-transparent bg-gradient-to-r from-[#00bfa5] via-[#00a5cf] to-[#0080ff]">
                <span>It&apos;s not</span>
                <br />
                <span>just a job board.</span>
                <br />
                <span>It&apos;s way</span>
                <br />
                <span>better.</span>
              </h2>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-[#00bfa5] via-[#00a5cf] to-[#0080ff] rounded-3xl p-12 text-white shadow-2xl">
                <div className="mb-8">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop"
                    alt="Team collaboration"
                    className="w-full h-64 object-cover rounded-2xl"
                  />
                </div>
                <p className="text-2xl font-semibold mb-3">
                  How did we build something
                  <br />
                  this powerful for Egypt?
                </p>
                <p className="text-lg opacity-80 mb-2">By listening.</p>
                <p className="text-xl font-bold">To freelancers like you.</p>
              </div>
            </div>
          </div>

      {/* Second Block - Reversed */}
      <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
        <div className="relative md:order-1">
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl overflow-visible">
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-lg z-10">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop"
                alt="Freelancer 1"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-lg z-10">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                alt="Freelancer 2"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-8 left-1/4 w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-lg z-10">
              <img
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop"
                alt="Freelancer 3"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Card with orange gradient */}
            <div className="bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#fb923c] rounded-2xl p-8 pt-16 pb-20">
              <h3 className="text-3xl font-bold text-white mb-2">
                Egypt&apos;s Creative
                <br />
                Community
              </h3>
              <p className="text-white/80 text-lg">
                Developers, designers, sales, and more—all in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="md:order-2">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]">
            Built Different
          </p>
          <h2 className="text-5xl md:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c]">
            Get talented
            <br />
            people in
            <br />
            the mix.
          </h2>
        </div>
      </div>


          {/* Third Block */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#00bfa5] via-[#00a5cf] to-[#4f46e5]">
                Our Mission
              </p>
              <h2 className="text-5xl md:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00bfa5] via-[#00a5cf] to-[#4f46e5]">
                <span>We&apos;re building</span>
                <br />
                <span>the future</span>
                <br />
                <span>of remote work.</span>
              </h2>
            </div>

            <div className="bg-gradient-to-br from-[#00bfa5] via-[#00a5cf] to-[#4f46e5] rounded-3xl p-12 text-white shadow-2xl">
              <p className="text-3xl font-bold leading-tight mb-6">
                Every project deserves exceptional talent.
              </p>
              <p className="text-xl opacity-90 mb-4">
                Every freelancer deserves meaningful work.
              </p>
              <p className="text-2xl font-bold">We make both happen.</p>
            </div>
          </div>
        </div>
      </section>


{/* How It Works Section – Apple-style, light + minimal */}
<section
  id="how-it-works"
  className="bg-white py-24 md:py-32 border-t border-b border-slate-100"
>
  <div className="max-w-5xl mx-auto px-6">
    {/* Title */}
    <div className="text-center mb-16">
      <p className="text-xs md:text-sm font-semibold tracking-[0.22em] uppercase text-slate-400 mb-3">
        How it works
      </p>
      <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
        Four simple steps to hire on Networkk.
      </h3>
    </div>

    {/* ROW 1 – Steps 1–3 side by side */}
    <div className="grid gap-16 md:grid-cols-3 mb-20">
      {/* Step 1 */}
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-300">
            <Upload className="h-7 w-7 text-slate-700" />
          </div>
        </div>
        <h4 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3">
          Post your job.
        </h4>
        <p className="text-sm md:text-base leading-relaxed text-slate-500 max-w-xs mx-auto">
          Describe the work, budget, and timeline. Your job is shared with
          freelancers who match what you need.
        </p>
      </div>

      {/* Step 2 */}
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-300">
            <CheckCircle className="h-7 w-7 text-slate-700" />
          </div>
        </div>
        <h4 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3">
          Review proposals.
        </h4>
        <p className="text-sm md:text-base leading-relaxed text-slate-500 max-w-xs mx-auto">
          Compare profiles, messages, and milestones. Choose the freelancer who
          feels right for your project.
        </p>
      </div>

      {/* Step 3 – Connect */}
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-300">
            <MessageSquare className="h-7 w-7 text-slate-700" />
          </div>
        </div>
        <h4 className="text-xl md:text-2xl font-semibold text-slate-900 mb-3">
          Connect in chat.
        </h4>
        <p className="text-sm md:text-base leading-relaxed text-slate-500 max-w-xs mx-auto">
          Ask questions, refine the scope, and align on milestones before you
          commit to a proposal.
        </p>
      </div>
    </div>

{/* ROW 2 – Step 4 with sub-steps */}
<div className="border-t border-slate-100 pt-12">
  {/* Full-width black main block */}
  <div className="mb-10 rounded-3xl bg-black px-6 py-10 md:px-12 md:py-12 text-center w-full">
    <div className="mb-6 flex justify-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-500/60 bg-black">
        <Shield className="h-7 w-7 text-slate-100" />
      </div>
    </div>
    <h4 className="text-xl md:text-2xl font-semibold text-white mb-3">
      Your payments, protected
    </h4>
    <p className="text-sm md:text-base leading-relaxed text-slate-300 max-w-xl mx-auto">
      Keep everything in one place—from first message to final payment—
      with milestones that protect both sides.
    </p>
  </div>

  {/* Sub-steps beside each other */}
  <div className="max-w-3xl mx-auto text-center">
    <div className="grid gap-8 md:grid-cols-3">
      <div>
        <div className="mb-2 flex justify-center">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700">
            1
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">
          Fund milestones.
        </p>
        <p className="text-xs md:text-sm text-slate-500">
          Add funds to escrow so freelancers can start with confidence.
        </p>
      </div>

      <div>
        <div className="mb-2 flex justify-center">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700">
            2
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">
          Approve work.
        </p>
        <p className="text-xs md:text-sm text-slate-500">
          Review delivered milestones, request changes, and keep a clear record
          of decisions.
        </p>
      </div>

      <div>
        <div className="mb-2 flex justify-center">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-700">
            3
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">
          Release payment.
        </p>
        <p className="text-xs md:text-sm text-slate-500">
          Release each payment when you&apos;re satisfied—money only moves when
          the work is completed.
        </p>
      </div>
    </div>
  </div>
</div>

  </div>
</section>

      {/* Featured Freelancers Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Featured freelancers.
            </h3>
            <p className="text-gray-600">
              Meet some of Egypt's top-rated professionals ready to bring your
              projects to life.
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * (100 / 3)}%)`,
                }}
              >
                {freelancers.map((freelancer, index) => (
                  <div key={index} className="min-w-[33.333%] px-4">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                      <div className="relative">
                        <img
                          src={freelancer.image}
                          alt={freelancer.name}
                          className="w-full h-80 object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 mb-2 text-center">
                          {freelancer.name}
                        </h4>
                        <div className="flex items-center justify-center text-gray-600 text-sm mb-4">
                          <MapPin className="w-4 h-4 mr-1" />
                          {freelancer.location}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6 justify-center">
                          {freelancer.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-center">
                          <button className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 w-full max-w-xs">
                            Hire Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 z-10"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 z-10"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {freelancers.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? "bg-blue-600 w-8" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">networkk</h1>
          <p className="text-gray-600 text-sm">
            © 2025 networkk. Empowering Egypt's creative economy.
          </p>
        </div>
      </footer>
    </div>
  );
}
