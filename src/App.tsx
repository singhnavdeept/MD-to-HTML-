import React, { useState, useEffect } from 'react';
import { Search, Hash, Clock, ArrowRight, BookOpen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Article {
  id: string;
  title: string;
  slug: string;
  html_content: string;
  tags: string[];
  created_at: string;
}

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, [searchQuery]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles?q=${searchQuery}`);
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      fetchArticles();
      if (selectedArticle?.id === id) setSelectedArticle(null);
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setSelectedArticle(null)}
          >
            <div className="bg-neutral-900 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">Publisher<span className="text-neutral-400 font-light">OS</span></span>
          </div>

          <div className="relative max-w-md w-full ml-4 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search articles, tags, or content..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-full text-sm focus:ring-2 focus:ring-neutral-900/10 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 lg:py-12">
        <AnimatePresence mode="wait">
          {!selectedArticle ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero/Featured Section */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-900">
                  Engineering <br /> Documentation.
                </h1>
                <p className="text-xl text-neutral-500 max-w-2xl leading-relaxed">
                  Automated markdown publishing platform built with cloud-native principles. 
                  Drop a file, see it live.
                </p>
              </div>

              {/* Search Mobile */}
              <div className="relative w-full sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Article Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-64 bg-neutral-200 rounded-3xl animate-pulse" />
                  ))
                ) : articles.length > 0 ? (
                  articles.map((article, idx) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setSelectedArticle(article)}
                      className="group relative flex flex-col justify-between p-8 bg-white border border-neutral-200 rounded-3xl hover:border-neutral-900 hover:shadow-2xl hover:shadow-neutral-200 transition-all cursor-pointer"
                    >
                      <button 
                        onClick={(e) => deleteArticle(article.id, e)}
                        className="absolute top-4 right-4 p-2 text-neutral-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                          {article.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                              <Hash size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-2xl font-bold leading-tight group-hover:text-neutral-900 transition-colors">
                          {article.title}
                        </h3>
                      </div>

                      <div className="mt-8 flex items-center justify-between pt-6 border-t border-neutral-100">
                        <div className="flex items-center gap-2 text-neutral-400 text-xs">
                          <Clock size={12} />
                          {new Date(article.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-neutral-900 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                          <ArrowRight size={20} />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <p className="text-neutral-400 text-lg">No articles found matching your search.</p>
                    <p className="text-neutral-300 text-sm">Try adding a .md file to the raw_articles folder.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="article"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <button 
                onClick={() => setSelectedArticle(null)}
                className="mb-12 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <ArrowRight size={20} className="rotate-180" />
                Back to Feed
              </button>

              <div className="space-y-8">
                <div className="space-y-4 border-b border-neutral-200 pb-12">
                  <div className="flex gap-3">
                    {selectedArticle.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">#{tag}</span>
                    ))}
                  </div>
                  <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-4 text-neutral-400 text-sm pt-2">
                    <div className="flex items-center gap-1.5"><Clock size={16} /> Created on {new Date(selectedArticle.created_at).toDateString()}</div>
                  </div>
                </div>

                <div 
                  className="prose prose-neutral max-w-none prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-a:text-neutral-900 underline-offset-4 prose-p:leading-relaxed prose-pre:bg-neutral-900 prose-pre:rounded-2xl"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.html_content }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="mt-20 border-t border-neutral-200 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2">
            <span className="font-bold text-lg">Publisher<span className="text-neutral-400 font-light">OS</span></span>
            <p className="text-neutral-500 text-sm italic">Built for scale, designed for speed.</p>
          </div>
          <div className="flex gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-black">API Docs</a>
            <a href="#" className="hover:text-black">Architecture</a>
            <a href="#" className="hover:text-black">Terraform</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
