import Link from "next/link";

interface ArticleCardProps {
  title: string;
  date: string;
  subject: string;
  wordCount: number;
  slug: string;
}

export function ArticleCard({
  title,
  date,
  subject,
  wordCount,
  slug,
}: ArticleCardProps) {
  return (
    <article className="mb-8 last:mb-0 group">
      <Link href={`/articles/${slug}`} className="block article-page w-fit">
        <h2 className="text-2xl font-normal transition-colors duration-300 group-hover:text-pink">
          {title}
        </h2>
        <p className="mt-1 text-base text-list-text opacity-65">
          {date} • {subject} • {wordCount} words
        </p>
      </Link>
    </article>
  );
}
