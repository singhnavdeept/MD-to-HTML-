import { Article, ArticleRepository } from '../repositories/articleRepository';

export class ArticleService {
  constructor(private repository: ArticleRepository) {}

  async getAllArticles(): Promise<Article[]> {
    return this.repository.findAll();
  }

  async getArticleBySlug(slug: string): Promise<Article | null> {
    return this.repository.findBySlug(slug);
  }

  async searchArticles(query: string): Promise<Article[]> {
    if (!query) return this.getAllArticles();
    return this.repository.search(query);
  }

  async deleteArticle(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
