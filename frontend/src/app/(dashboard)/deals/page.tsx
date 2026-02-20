'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

interface Deal {
  id: number;
  name: string;
  amount: number;
  contact_id: number | null;
  stage_id: number;
  pipeline_id: number;
  status: string;
  expected_close_date: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface Stage {
  id: number;
  name: string;
  probability: number;
  color: string | null;
  position: number;
}

interface Pipeline {
  id: number;
  name: string;
  stages?: Stage[];
}

interface PipelineColumn {
  stage: Stage;
  deals: Deal[];
  color: string;
  headerBg: string;
}

function ScoreBadge({ score }: { score: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    hot: { label: 'Chaud', classes: 'bg-accent-emerald/10 text-accent-emerald' },
    warm: { label: 'Tiède', classes: 'bg-accent-amber/10 text-accent-amber' },
    cold: { label: 'Froid', classes: 'bg-surface-100 text-surface-800' },
  };
  const { label, classes } = config[score] || config.cold;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function formatTotal(deals: Deal[]): string {
  const total = deals.reduce((sum, deal) => sum + deal.amount, 0);
  return total.toLocaleString('fr-FR') + ' €';
}

function getColumnColors(position: number): { color: string; headerBg: string } {
  if (position === 0) {
    return { color: 'border-t-surface-800', headerBg: 'bg-surface-100' };
  } else if (position === 1) {
    return { color: 'border-t-brand-500', headerBg: 'bg-brand-50' };
  } else if (position === 2) {
    return { color: 'border-t-accent-amber', headerBg: 'bg-accent-amber/10' };
  } else {
    return { color: 'border-t-accent-emerald', headerBg: 'bg-accent-emerald/10' };
  }
}

function calculateDaysInStage(updatedAt: string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffTime = Math.abs(now.getTime() - updated.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getContactName(deal: Deal): string {
  if (deal.contact) {
    return `${deal.contact.first_name} ${deal.contact.last_name}`;
  }
  return deal.name;
}

function getContactInitials(deal: Deal): string {
  if (deal.contact) {
    const firstName = deal.contact.first_name || '';
    const lastName = deal.contact.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  }
  const name = deal.name || '';
  const words = name.split(' ');
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return (name[0] || '?').toUpperCase();
}

function getDealScore(deal: Deal): 'hot' | 'warm' | 'cold' {
  const daysInStage = calculateDaysInStage(deal.updated_at);
  if (daysInStage <= 5) return 'hot';
  if (daysInStage <= 14) return 'warm';
  return 'cold';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-surface-200 rounded animate-pulse"></div>
        <div className="h-10 w-36 bg-surface-200 rounded-lg animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-surface-200 bg-surface-50 overflow-hidden">
            <div className="px-4 py-3 bg-surface-100">
              <div className="h-5 w-24 bg-surface-200 rounded animate-pulse"></div>
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="bg-white rounded-lg border border-surface-200 p-4">
                  <div className="h-4 w-3/4 bg-surface-200 rounded animate-pulse mb-2"></div>
                  <div className="h-6 w-1/2 bg-surface-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!session?.access_token) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch all pipelines
        const { data: pipelines, error: pipelinesError } = await apiGet<Pipeline[]>(
          '/pipelines',
          session.access_token
        );

        if (pipelinesError || !pipelines || pipelines.length === 0) {
          setError(pipelinesError || 'Aucun pipeline trouvé');
          setLoading(false);
          return;
        }

        // 2. Fetch the first pipeline with stages
        const firstPipelineId = pipelines[0].id;
        const { data: pipeline, error: pipelineError } = await apiGet<Pipeline>(
          `/pipelines/${firstPipelineId}`,
          session.access_token
        );

        if (pipelineError || !pipeline || !pipeline.stages) {
          setError(pipelineError || 'Impossible de charger le pipeline');
          setLoading(false);
          return;
        }

        // 3. Fetch all deals for this pipeline
        const { data: dealsResponse, error: dealsError } = await apiGet<{ data: Deal[]; pagination?: any }>(
          `/deals?pipeline_id=${firstPipelineId}`,
          session.access_token
        );

        if (dealsError) {
          setError(dealsError);
          setLoading(false);
          return;
        }

        const deals = dealsResponse?.data || [];

        // 4. Group deals by stage_id
        const dealsByStage = deals.reduce((acc, deal) => {
          if (!acc[deal.stage_id]) {
            acc[deal.stage_id] = [];
          }
          acc[deal.stage_id].push(deal);
          return acc;
        }, {} as Record<number, Deal[]>);

        // 5. Build columns
        const sortedStages = [...pipeline.stages].sort((a, b) => a.position - b.position);
        const newColumns: PipelineColumn[] = sortedStages.map((stage) => {
          const { color, headerBg } = getColumnColors(stage.position);
          return {
            stage,
            deals: dealsByStage[stage.id] || [],
            color,
            headerBg,
          };
        });

        setColumns(newColumns);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue');
        setLoading(false);
      }
    }

    fetchData();
  }, [session?.access_token]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-surface-900">Pipeline</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Pipeline</h1>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.stage.id} className={`rounded-xl border border-surface-200 bg-surface-50 overflow-hidden border-t-4 ${column.color}`}>
            {/* Column Header */}
            <div className={`px-4 py-3 ${column.headerBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-surface-900">{column.stage.name}</h3>
                  <span className="text-xs font-medium bg-white text-surface-800 px-2 py-0.5 rounded-full shadow-sm">
                    {column.deals.length}
                  </span>
                </div>
                <span className="text-xs font-semibold text-surface-800">
                  {formatTotal(column.deals)}
                </span>
              </div>
            </div>

            {/* Deal Cards */}
            <div className="p-3 space-y-3">
              {column.deals.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">
                  Aucun deal
                </div>
              ) : (
                column.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white rounded-lg border border-surface-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-surface-900 leading-tight">
                        {deal.name}
                      </h4>
                      <ScoreBadge score={getDealScore(deal)} />
                    </div>
                    <p className="text-lg font-bold text-surface-900">
                      {deal.amount.toLocaleString('fr-FR')} €
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-[10px] font-semibold">
                          {getContactInitials(deal)}
                        </div>
                        <span className="text-xs text-surface-800">{getContactName(deal)}</span>
                      </div>
                      <span className="text-xs text-surface-200">
                        {calculateDaysInStage(deal.updated_at)}j
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
