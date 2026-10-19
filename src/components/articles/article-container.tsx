import { ArticleCard } from "./article-card";
import { getArticleSlug, getSortedArticles } from "@/lib/articles";

export function ArticleContainer() {
  const sortedArticles = getSortedArticles();

  return (
    <div>
      <div className="grid grid-cols-1">
        {sortedArticles.map((article) => (
          <ArticleCard
            key={article.filename}
            title={article.title}
            date={article.date}
            subject={article.subject}
            wordCount={article.wordCount}
            slug={getArticleSlug(article)}
          />
        ))}
      </div>

      {sortedArticles.length === 0 && (
        <div className="text-center pt-12">
          <p className="text-lg text-foreground opacity-60">
            No articles found.
          </p>
        </div>
      )}
    </div>
  );
}
