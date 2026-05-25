import { Request, Response } from 'express';
import { ArticleService } from '../services/articleService';

export class ArticleController {
  constructor(private service: ArticleService) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const articles = q 
        ? await this.service.searchArticles(q as string)
        : await this.service.getAllArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      const article = await this.service.getArticleBySlug(req.params.slug);
      if (!article) return res.status(404).json({ error: 'Article not found' });
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.service.deleteArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete article' });
    }
  };
}
