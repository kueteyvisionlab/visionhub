'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsSummary {
  total_contacts: number;
  total_revenue: number;
  deals_open: number;
  deals_won_this_month: number;
  avg_deal_value: number;
  conversion_rate: number;
}

interface RevenuePoint {
  period: string;
  revenue: number;
}

interface PipelineStat {
  stage_name: string;
  count: number;
}

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;

    async function fetchData() {
      try {
        setLoading(true);

        const [summaryRes, revenueRes, pipelineRes] = await Promise.all([
          apiGet<AnalyticsSummary>('/analytics/summary', session!.access_token),
          apiGet<RevenuePoint[]>('/analytics/revenue?period=monthly', session!.access_token),
          apiGet<PipelineStat[]>('/analytics/pipeline-stats', session!.access_token),
        ]);

        if (!summaryRes.error && summaryRes.data) setAnalytics(summaryRes.data);
        if (!revenueRes.error && revenueRes.data) {
          const rev = Array.isArray(revenueRes.data) ? revenueRes.data : [];
          setRevenue(rev.slice(-6));
        }
        if (!pipelineRes.error && pipelineRes.data) {
          const stats = Array.isArray(pipelineRes.data) ? pipelineRes.data : [];
          setPipelineStats(stats);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session?.access_token]);

  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Build KPIs from analytics data
  const kpis = analytics
    ? [
        { label: "Chiffre d'affaires", value: fmtEur(analytics.total_revenue), change: `${analytics.deals_won_this_month} deals gagnés`, positive: true, period: 'ce mois' },
        { label: 'Contacts', value: fmt(analytics.total_contacts), change: `${analytics.deals_open} deals ouverts`, positive: true, period: 'total' },
        { label: 'Taux de conversion', value: `${analytics.conversion_rate.toFixed(1)}%`, change: `${fmt(analytics.deals_won_this_month)} gagnés ce mois`, positive: true, period: '' },
        { label: 'Panier moyen', value: fmtEur(analytics.avg_deal_value), change: `${analytics.deals_open} deals en cours`, positive: true, period: '' },
      ]
    : [];

  // Build revenue chart data
  const maxRevenue = Math.max(...revenue.map((r) => r.revenue), 1);
  const revenueByMonth = revenue.map((r) => {
    const date = new Date(r.period);
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    return { month, value: r.revenue, pct: Math.round((r.revenue / maxRevenue) * 100) };
  });

  // Build funnel from pipeline stats
  const maxCount = Math.max(...pipelineStats.map((s) => s.count), 1);
  const funnelColors = ['bg-surface-300', 'bg-brand-300', 'bg-brand-400', 'bg-brand-500', 'bg-accent-emerald'];
  const conversionFunnel = pipelineStats.map((s, i) => ({
    stage: s.stage_name,
    count: s.count,
    pct: Math.round((s.count / maxCount) * 100),
    color: funnelColors[i % funnelColors.length],
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-surface-200 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-surface-200 bg-white animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-surface-200 bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Analytiques</h1>
          <p className="mt-1 text-surface-500">Vue d&apos;ensemble de vos performances commerciales.</p>
        </div>
        <select className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          <option>Ce trimestre</option>
          <option>Ce mois</option>
          <option>Cette année</option>
          <option>Personnalisé</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-surface-200 bg-white p-5">
            <p className="text-sm font-medium text-surface-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-surface-900">{kpi.value}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-sm font-medium ${kpi.positive ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                {kpi.change}
              </span>
              {kpi.period && <span className="text-xs text-surface-400">{kpi.period}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Chiffre d&apos;affaires</h2>
          <p className="mt-1 text-sm text-surface-500">Évolution sur les 6 derniers mois</p>
          {revenueByMonth.length > 0 ? (
            <div className="mt-6 flex items-end gap-3" style={{ height: 200 }}>
              {revenueByMonth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-surface-600">{(m.value / 1000).toFixed(0)}k</span>
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all hover:bg-brand-600"
                    style={{ height: `${Math.max(m.pct, 5)}%` }}
                  />
                  <span className="text-xs text-surface-400">{m.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-surface-400">Pas de données de revenus disponibles.</p>
          )}
        </div>

        {/* Top clients placeholder */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Top clients</h2>
          <p className="mt-1 text-sm text-surface-500">Par chiffre d&apos;affaires</p>
          <p className="mt-6 text-sm text-surface-400">Données bientôt disponibles.</p>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-surface-900">Entonnoir de conversion</h2>
        <p className="mt-1 text-sm text-surface-500">Du lead au deal gagné</p>
        {conversionFunnel.length > 0 ? (
          <div className="mt-6 space-y-3">
            {conversionFunnel.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium text-surface-700">{stage.stage}</span>
                <div className="flex-1">
                  <div className="h-8 rounded-lg bg-surface-100">
                    <div
                      className={`flex h-8 items-center rounded-lg px-3 ${stage.color}`}
                      style={{ width: `${Math.max(stage.pct, 8)}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{stage.count}</span>
                    </div>
                  </div>
                </div>
                <span className="w-12 text-right text-sm text-surface-400">{stage.pct}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-surface-400">Pas de données de pipeline disponibles.</p>
        )}
      </div>
    </div>
  );
}
