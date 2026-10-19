import articlesData from "@/data/articles.json";
import type { Article } from "@/types";

export const articles: Article[] = articlesData;

export function getArticleSlug(article: Pick<Article, "filename">) {
  return article.filename.replace(/\.md$/i, "");
}

export function getArticleHref(article: Pick<Article, "filename">) {
  return `/articles/${getArticleSlug(article)}`;
}

export function getSortedArticles() {
  return [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getArticleBySlug(slug: string) {
  return articles.find((article) => getArticleSlug(article) === slug);
}
