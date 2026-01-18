export default function ClientSignupFailedPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] antialiased">
      <main className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">
            Client signup
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-black">
            Failed
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Please contact:{" "}
            <a className="text-[#10b8a6] hover:underline" href="mailto:contact@networkk.co">
              contact@networkk.co
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
