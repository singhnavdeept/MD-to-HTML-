import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer as createViteServer } from 'vite';

import { ArticleController } from './server/controllers/articleController';
import { ArticleService } from './server/services/articleService';
import { MemoryArticleRepository } from './server/repositories/articleRepository';
import { MarkdownProcessor } from './server/processor';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Dependencies
  const repository = new MemoryArticleRepository(); // Defaulting to memory for preview
  const service = new ArticleService(repository);
  const controller = new ArticleController(service);
  const processor = new MarkdownProcessor(repository);

  // Middlewares
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev mode
  }));
  app.use(morgan('dev'));
  app.use(express.json());

  // Background Services
  await processor.start();

  // API Routes
  const router = express.Router();
  router.get('/', controller.getAll);
  router.get('/:slug', controller.getBySlug);
  router.delete('/:id', controller.delete);

  app.use('/api/articles', router);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Markdown Platform running on http://localhost:${PORT}`);
  });
}

startServer();
