import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import fm from 'front-matter';
import { marked } from 'marked';
import { ArticleRepository } from './repositories/articleRepository';

export class MarkdownProcessor {
  private watcher: FSWatcher;
  private watchPath: string;

  constructor(
    private repository: ArticleRepository,
    pathStr: string = './raw_articles'
  ) {
    this.watchPath = path.resolve(process.cwd(), pathStr);
    this.watcher = chokidar.watch(this.watchPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });
  }

  public async start() {
    console.log(`[Processor] Watching for articles in: ${this.watchPath}`);
    
    // Ensure directory exists
    try {
      await fs.mkdir(this.watchPath, { recursive: true });
    } catch (err) {
      console.error('[Processor] Error creating watch directory:', err);
    }

    this.watcher.on('add', async (filePath) => {
      if (path.extname(filePath) === '.md') {
        console.log(`[Processor] New article detected: ${path.basename(filePath)}`);
        await this.processArticle(filePath);
      }
    });

    this.watcher.on('change', async (filePath) => {
      if (path.extname(filePath) === '.md') {
        console.log(`[Processor] Article updated: ${path.basename(filePath)}`);
        await this.processArticle(filePath);
      }
    });
  }

  private async processArticle(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { attributes, body } = fm<any>(content);
      
      const title = attributes.title || path.basename(filePath, '.md');
      const slug = attributes.slug || this.generateSlug(title);
      const tags = attributes.tags || [];
      const htmlContent = await marked.parse(body);

      const articleData = {
        title,
        slug,
        markdown_content: body,
        html_content: htmlContent,
        tags,
        updated_at: new Date()
      };

      await this.repository.upsert(articleData);
      console.log(`[Processor] Successfully processed: ${slug}`);
    } catch (error) {
      console.error(`[Processor] Failed to process ${filePath}:`, error);
    }
  }

  private generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }
}
