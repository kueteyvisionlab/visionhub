'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

interface SearchResult {
  type: 'contact' | 'deal' | 'order';
  id: string;
  title: string;
  subtitle: string;
}

const typeConfig = {
  contact: { label: 'Contact', color: 'bg-brand-100 text-brand-700', href: '/contacts' },
  deal: { label: 'Deal', color: 'bg-accent-violet/10 text-accent-violet', href: '/deals' },
  order: { label: 'Document', color: 'bg-accent-emerald/10 text-accent-emerald', href: '/orders' },
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { session } = useAuth();

  // Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search with debounce
  const searchTimeout = useRef<NodeJS.Timeout>();
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !session?.access_token) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = session.access_token;
      const [contacts, deals, orders] = await Promise.all([
        apiGet<{ data: any[] }>(`/contacts?search=${encodeURIComponent(q)}&limit=5`, token),
        apiGet<{ data: any[] }>(`/deals?limit=10`, token),
        apiGet<{ data: any[] }>(`/orders?search=${encodeURIComponent(q)}&limit=5`, token),
      ]);

      const items: SearchResult[] = [];

      if (contacts.data?.data) {
        for (const c of contacts.data.data) {
          items.push({
            type: 'contact',
            id: c.id,
            title: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            subtitle: c.email || c.phone || c.company_name || '',
          });
        }
      }

      if (deals.data?.data) {
        const qLower = q.toLowerCase();
        for (const d of deals.data.data) {
          if (d.title?.toLowerCase().includes(qLower) || d.contact_name?.toLowerCase().includes(qLower)) {
            items.push({
              type: 'deal',
              id: d.id,
              title: d.title,
              subtitle: `${d.amount ? d.amount.toLocaleString('fr-FR') + ' €' : ''} ${d.contact_name ? '— ' + d.contact_name : ''}`.trim(),
            });
          }
        }
      }

      if (orders.data?.data) {
        for (const o of orders.data.data) {
          items.push({
            type: 'order',
            id: o.id,
            title: `${o.type === 'invoice' ? 'Facture' : 'Devis'} ${o.reference || o.id.slice(0, 8)}`,
            subtitle: `${o.total_ttc ? o.total_ttc.toLocaleString('fr-FR') + ' €' : ''} ${o.contact_name ? '— ' + o.contact_name : ''}`.trim(),
          });
        }
      }

      setResults(items.slice(0, 10));
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(value), 300);
  }

  function navigate(result: SearchResult) {
    setOpen(false);
    router.push(`${typeConfig[result.type].href}/${result.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-surface-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-surface-200">
          <svg className="w-5 h-5 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher contacts, deals, devis..."
            className="flex-1 py-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-surface-400 bg-surface-100 rounded border border-surface-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-surface-400">
                Aucun résultat pour &laquo; {query} &raquo;
              </div>
            ) : (
              results.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigate(result)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? 'bg-brand-50' : 'hover:bg-surface-50'
                  }`}
                >
                  <span className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${typeConfig[result.type].color}`}>
                    {typeConfig[result.type].label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-900 truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-surface-400 truncate">{result.subtitle}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-200 bg-surface-50 text-[10px] text-surface-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[10px]">&uarr;</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[10px]">&darr;</kbd>
            naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[10px]">&#9166;</kbd>
            ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-surface-200 rounded text-[10px]">esc</kbd>
            fermer
          </span>
        </div>
      </div>
    </div>
  );
}
