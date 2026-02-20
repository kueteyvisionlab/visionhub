'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  balance: number;
  currency: string;
  last_sync: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  reconciled: boolean;
  order_id?: string;
}

const DEMO_ACCOUNTS: BankAccount[] = [
  { id: '1', bank_name: 'BNP Paribas', iban: 'FR76 •••• •••• •••• 4521', balance: 42850.75, currency: 'EUR', last_sync: '2026-02-20T08:30:00Z' },
  { id: '2', bank_name: 'Crédit Agricole', iban: 'FR76 •••• •••• •••• 8903', balance: 15230.00, currency: 'EUR', last_sync: '2026-02-19T14:00:00Z' },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-02-20', description: 'Virement SCI Les Jardins - Facture #2024-089', amount: 4500.00, category: 'Vente', reconciled: true, order_id: 'ord-1' },
  { id: 't2', date: '2026-02-19', description: 'Paiement Garage Martin', amount: 2800.00, category: 'Vente', reconciled: true },
  { id: 't3', date: '2026-02-19', description: 'Abonnement Brevo - Marketing', amount: -49.00, category: 'Marketing', reconciled: false },
  { id: 't4', date: '2026-02-18', description: 'Loyer bureau - Février 2026', amount: -1200.00, category: 'Loyer', reconciled: true },
  { id: 't5', date: '2026-02-18', description: 'Virement Cabinet Moreau', amount: 3200.00, category: 'Vente', reconciled: false },
  { id: 't6', date: '2026-02-17', description: 'Achat fournitures bureau', amount: -185.50, category: 'Fournitures', reconciled: false },
  { id: 't7', date: '2026-02-17', description: 'Paiement Hotel Le Meridien', amount: 6400.00, category: 'Vente', reconciled: true },
  { id: 't8', date: '2026-02-16', description: 'Facture Hébergement OVH', amount: -29.99, category: 'IT', reconciled: true },
  { id: 't9', date: '2026-02-15', description: 'Paiement Restaurant Le Gourmet', amount: 1850.00, category: 'Vente', reconciled: false },
  { id: 't10', date: '2026-02-15', description: 'Assurance professionnelle', amount: -320.00, category: 'Assurance', reconciled: true },
  { id: 't11', date: '2026-02-14', description: 'Virement Dupont SAS', amount: 5200.00, category: 'Vente', reconciled: false },
  { id: 't12', date: '2026-02-13', description: 'Abonnement Slack Pro', amount: -12.50, category: 'IT', reconciled: true },
];

const CATEGORIES = ['Tous', 'Vente', 'Marketing', 'Loyer', 'Fournitures', 'IT', 'Assurance'];

export default function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('Tous');
  const [filterReconciled, setFilterReconciled] = useState<'all' | 'yes' | 'no'>('all');
  const [search, setSearch] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [reconcileId, setReconcileId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [accRes, txRes] = await Promise.all([
      apiGet<BankAccount[]>('/banking/connections'),
      apiGet<Transaction[]>('/banking/transactions'),
    ]);
    setAccounts(accRes.error || !accRes.data ? DEMO_ACCOUNTS : accRes.data);
    setTransactions(txRes.error || !txRes.data ? DEMO_TRANSACTIONS : txRes.data);
    setLoading(false);
  }

  const filtered = transactions.filter((t) => {
    if (filterCategory !== 'Tous' && t.category !== filterCategory) return false;
    if (filterReconciled === 'yes' && !t.reconciled) return false;
    if (filterReconciled === 'no' && t.reconciled) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const monthCredits = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthDebits = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const unreconciled = transactions.filter((t) => !t.reconciled).length;

  async function handleReconcile(txId: string) {
    await apiPost('/banking/reconcile', { transaction_id: txId });
    setTransactions((prev) => prev.map((t) => t.id === txId ? { ...t, reconciled: true } : t));
    setReconcileId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Banque</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Suivez vos transactions et rapprochez vos comptes.</p>
        </div>
        <button onClick={() => setShowConnectModal(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" /></svg>
          Connecter une banque
        </button>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Solde total', value: totalBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }), color: 'text-surface-900 dark:text-white' },
          { label: 'Entrées ce mois', value: `+${monthCredits.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, color: 'text-accent-emerald' },
          { label: 'Sorties ce mois', value: `-${monthDebits.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, color: 'text-accent-rose' },
          { label: 'Non rapprochées', value: String(unreconciled), color: 'text-accent-amber' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800 dark:border-surface-700">
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{kpi.label}</p>
            <p className={`mt-2 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Bank accounts */}
      {loading ? (
        <div className="mt-8 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Comptes connectés</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-900 dark:text-white">{acc.bank_name}</p>
                        <p className="text-xs text-surface-400 font-mono">{acc.iban}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-surface-400">Solde</p>
                      <p className="text-lg font-bold text-surface-900 dark:text-white">{acc.balance.toLocaleString('fr-FR', { style: 'currency', currency: acc.currency })}</p>
                    </div>
                    <p className="text-xs text-surface-400">Sync {new Date(acc.last_sync).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Transactions</h2>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterReconciled} onChange={(e) => setFilterReconciled(e.target.value as 'all' | 'yes' | 'no')} className="rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white">
                <option value="all">Tous statuts</option>
                <option value="yes">Rapproché</option>
                <option value="no">Non rapproché</option>
              </select>
            </div>

            <div className="mt-4 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-surface-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-surface-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-surface-500">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-surface-500">Catégorie</th>
                    <th className="px-4 py-3 text-right font-medium text-surface-500">Montant</th>
                    <th className="px-4 py-3 text-center font-medium text-surface-500">Statut</th>
                    <th className="px-4 py-3 text-right font-medium text-surface-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-surface-900 dark:text-white">{tx.description}</td>
                      <td className="px-4 py-3"><span className="inline-flex rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">{tx.category}</span></td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${tx.amount >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.reconciled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-accent-emerald"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Rapproché</span>
                        ) : (
                          <span className="text-xs text-accent-amber">En attente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!tx.reconciled && (
                          <button onClick={() => setReconcileId(tx.id)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Rapprocher</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-400">Aucune transaction</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Connect bank modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConnectModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Connecter une banque</h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Sélectionnez votre établissement bancaire pour synchroniser vos transactions.</p>
            <div className="mt-4 space-y-2">
              {['BNP Paribas', 'Crédit Agricole', 'Société Générale', 'Caisse d\'Épargne', 'LCL', 'Boursorama'].map((bank) => (
                <button key={bank} onClick={() => { apiPost('/banking/connect/init', { provider: bank }); setShowConnectModal(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-surface-200 hover:bg-surface-50 hover:border-brand-300 transition-colors dark:border-surface-700 dark:hover:bg-surface-700">
                  <div className="w-8 h-8 rounded bg-surface-100 dark:bg-surface-600 flex items-center justify-center text-xs font-bold text-surface-600 dark:text-surface-300">{bank[0]}</div>
                  <span className="text-sm font-medium text-surface-900 dark:text-white">{bank}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowConnectModal(false)} className="mt-4 w-full btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Reconcile modal */}
      {reconcileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReconcileId(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Rapprocher la transaction</h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Associez cette transaction à une facture ou un devis existant.</p>
            <div className="mt-4 space-y-2">
              {['Facture #2024-089 — 4 500 €', 'Facture #2024-090 — 3 200 €', 'Devis #D-2024-045 — 1 850 €'].map((match) => (
                <button key={match} onClick={() => handleReconcile(reconcileId)} className="w-full text-left px-4 py-3 rounded-lg border border-surface-200 hover:bg-brand-50 hover:border-brand-300 transition-colors text-sm text-surface-700 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-brand-900/20">{match}</button>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setReconcileId(null)} className="flex-1 btn-secondary">Annuler</button>
              <button onClick={() => handleReconcile(reconcileId)} className="flex-1 btn-primary">Rapprocher manuellement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
