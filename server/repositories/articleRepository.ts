export interface Article {
  id?: string;
  title: string;
  slug: string;
  markdown_content: string;
  html_content: string;
  tags: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface ArticleRepository {
  findAll(): Promise<Article[]>;
  findBySlug(slug: string): Promise<Article | null>;
  upsert(article: Omit<Article, 'id' | 'created_at'>): Promise<Article>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Article[]>;
}

// In-memory implementation for demonstration/preview
export class MemoryArticleRepository implements ArticleRepository {
  private articles: Map<string, Article> = new Map();

  async findAll(): Promise<Article[]> {
    return Array.from(this.articles.values()).sort((a, b) => 
      (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0)
    );
  }

  async findBySlug(slug: string): Promise<Article | null> {
    return Array.from(this.articles.values()).find(a => a.slug === slug) || null;
  }

  async upsert(articleData: Omit<Article, 'id' | 'created_at'>): Promise<Article> {
    const existing = await this.findBySlug(articleData.slug);
    const article: Article = {
      ...articleData,
      id: existing?.id || Math.random().toString(36).substr(2, 9),
      created_at: existing?.created_at || new Date(),
      updated_at: new Date()
    };
    this.articles.set(article.id!, article);
    return article;
  }

  async delete(id: string): Promise<void> {
    this.articles.delete(id);
  }

  async search(query: string): Promise<Article[]> {
    const q = query.toLowerCase();
    return Array.from(this.articles.values()).filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.markdown_content.toLowerCase().includes(q)
    );
  }
}

// Note: In production, we'd use a PostgresArticleRepository here with 'pg'
