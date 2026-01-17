import Link from "next/link";
import Image from "next/image";
import { articles } from "./articles";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <header className="sticky top-0 z-40 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-[1200px] mx-auto px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-sf-display.png"
              alt="Networkk"
              width={176}
              height={48}
              className="h-[38.4px] w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#10b8a6] transition-colors">
              Home
            </Link>
            <Link href="/freelancer/signup" className="hover:text-[#10b8a6] transition-colors">
              Talent
            </Link>
            <Link href="/client/signup" className="hover:text-[#10b8a6] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
        <div className="mb-12">
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
            Blog
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-black">
            Insights for hiring and freelance success.
          </h1>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl">
            Short guides on hiring, collaboration, and payments built for teams working with top
            freelancers.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group block"
              aria-label={`Read ${article.title}`}
            >
              <article className="rounded-[24px] bg-white border border-gray-200/70 p-6 shadow-sm group-hover:shadow-md transition-shadow h-full">
                <div className="relative w-full aspect-[16/9] rounded-[18px] overflow-hidden bg-gray-100 mb-5">
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                  <span className="font-semibold text-[#10b8a6]">{article.category}</span>
                  <span>{article.date}</span>
                </div>
                <h2 className="text-xl font-semibold mt-4 mb-3 text-gray-900">{article.title}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{article.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{article.readTime}</span>
                  <span className="text-[#10b8a6] font-medium">Read article</span>
                </div>
              </article>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
