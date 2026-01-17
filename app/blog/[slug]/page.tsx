import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticleBySlug } from "../articles";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article not found | Networkk Blog",
    };
  }

  return {
    title: `${article.title} | Networkk Blog`,
    description: article.excerpt,
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f]">
      <header className="sticky top-0 z-40 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-[1100px] mx-auto px-6 h-[56px] flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-black">
            Networkk
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/blog" className="hover:text-[#10b8a6] transition-colors">
              Blog
            </Link>
            <Link href="/" className="hover:text-[#10b8a6] transition-colors">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-14 md:py-20">
        <div className="mb-10">
          <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-4">
            {article.category}
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-black">
            {article.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-4">
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span>By {article.author}</span>
          </div>
          <div className="relative w-full aspect-[16/9] rounded-[28px] overflow-hidden bg-gray-100 mt-8">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1100px"
              className="object-cover"
            />
          </div>
          <p className="text-lg text-gray-600 mt-6 max-w-2xl">{article.excerpt}</p>
        </div>

        <section className="space-y-10">
          {article.sections.map((section) => (
            <div key={section.heading} className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
                {section.heading}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-12">
          <Link href="/blog" className="text-[#10b8a6] font-medium hover:underline">
            Back to Blog
          </Link>
        </div>
      </main>
    </div>
  );
}
