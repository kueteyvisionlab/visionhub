'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface Contact {
  first_name: string;
  last_name: string;
  company_name?: string;
}

interface Stage {
  id: string;
  name: string;
  probability: number;
  position: number;
}

interface Deal {
  id: string;
  name: string;
  amount: number;
  pipeline_id: string;
  stage_id: string;
  contact_id: string;
  status: string;
  expected_close_date?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  activities?: Activity[];
  contact?: Contact;
  stage?: Stage;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { session } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingStage, setMovingStage] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!session?.access_token) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch deal data
        const { data: dealData, error: dealError } = await apiGet<Deal>(
          `/deals/${params.id}`,
          session.access_token
        );

        if (dealError || !dealData) {
          setError(dealError || 'Failed to fetch deal');
          return;
        }

        setDeal(dealData);

        // Fetch pipeline stages if we have pipeline_id
        if (dealData.pipeline_id) {
          const { data: pipelineData, error: pipelineError } = await apiGet<Pipeline>(
            `/pipelines/${dealData.pipeline_id}`,
            session.access_token
          );

          if (!pipelineError && pipelineData) {
            setPipeline(pipelineData);
          }
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching deal:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, session?.access_token]);

  const handleMoveStage = async (stageId: string) => {
    if (!session?.access_token || !deal) return;

    try {
      setMovingStage(true);
      const { data, error } = await apiPatch<Deal>(
        `/deals/${params.id}/stage`,
        { stage_id: stageId },
        session.access_token
      );

      if (error || !data) {
        alert('Erreur lors du déplacement de l\'étape');
        return;
      }

      setDeal(data);
      setShowStageDropdown(false);
    } catch (err) {
      console.error('Error moving stage:', err);
      alert('Erreur lors du déplacement de l\'étape');
    } finally {
      setMovingStage(false);
    }
  };

  // Calculate days in stage
  const calculateDaysInStage = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format date in French locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Format date for timeline (short format)
  const formatTimelineDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Get activity color based on type
  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      quote: 'bg-brand-500',
      stage_change: 'bg-violet-500',
      call: 'bg-emerald-500',
      email: 'bg-amber-500',
      note: 'bg-blue-500',
      meeting: 'bg-purple-500',
      task: 'bg-orange-500',
      created: 'bg-surface-400',
    };
    return colorMap[type] || 'bg-surface-400';
  };

  // Calculate score (simplified - you might have a different algorithm)
  const calculateScore = (probability: number, amount: number) => {
    // Simple score calculation: weighted combination of probability and amount
    const normalizedAmount = Math.min(amount / 10000, 1) * 50;
    const normalizedProbability = (probability / 100) * 50;
    return Math.round(normalizedAmount + normalizedProbability);
  };

  // Get score label
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Chaud';
    if (score >= 50) return 'Tiède';
    return 'Froid';
  };

  // Build stage history from activities
  const buildStageHistory = () => {
    if (!deal?.activities) return [];

    const stageChanges = deal.activities
      .filter(a => a.type === 'stage_change')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return stageChanges.map((activity, index) => {
      const stageName = activity.metadata?.stage_name || activity.description;
      const enteredDate = formatDate(activity.created_at);

      // Calculate duration
      let duration = '';
      if (index < stageChanges.length - 1) {
        const nextChange = stageChanges[index + 1];
        const days = calculateDaysInStage(activity.created_at) - calculateDaysInStage(nextChange.created_at);
        duration = `${Math.abs(days)} jours`;
      } else {
        const days = calculateDaysInStage(activity.created_at);
        duration = `${days} jours (en cours)`;
      }

      return {
        stage: stageName,
        entered: enteredDate,
        duration,
      };
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-24 bg-surface-200 rounded animate-pulse" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-8 w-64 bg-surface-200 rounded animate-pulse" />
            <div className="mt-2 h-4 w-48 bg-surface-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-surface-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-surface-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="mt-6 h-20 bg-surface-200 rounded-xl animate-pulse" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-32 bg-surface-200 rounded-xl animate-pulse" />
            <div className="h-64 bg-surface-200 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-surface-200 rounded-xl animate-pulse" />
            <div className="h-48 bg-surface-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !deal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-surface-900">Erreur</h3>
          <p className="mt-2 text-sm text-surface-600">{error || 'Deal introuvable'}</p>
          <Link href="/deals" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Retour au pipeline
          </Link>
        </div>
      </div>
    );
  }

  const contactName = deal.contact
    ? `${deal.contact.first_name} ${deal.contact.last_name}`
    : 'N/A';
  const companyName = deal.contact?.company_name || 'N/A';
  const currentStage = deal.stage;
  const probability = currentStage?.probability || 0;
  const score = calculateScore(probability, deal.amount);
  const scoreLabel = getScoreLabel(score);
  const daysInStage = calculateDaysInStage(deal.updated_at);
  const sortedStages = pipeline?.stages.sort((a, b) => a.position - b.position) || [];
  const stageHistory = buildStageHistory();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/deals" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Pipeline
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{deal.name}</h1>
          <p className="mt-1 text-surface-500">{companyName} — {contactName}</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Modifier
          </button>
          <div className="relative">
            <button
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              disabled={movingStage || sortedStages.length === 0}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {movingStage ? 'Déplacement...' : 'Déplacer l\'étape'}
            </button>
            {showStageDropdown && sortedStages.length > 0 && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-surface-200 bg-white shadow-lg z-10">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase">
                    Déplacer vers
                  </p>
                  {sortedStages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleMoveStage(stage.id)}
                      disabled={stage.id === deal.stage_id}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                        stage.id === deal.stage_id
                          ? 'bg-brand-50 text-brand-700 font-medium cursor-default'
                          : 'text-surface-700 hover:bg-surface-50'
                      }`}
                    >
                      {stage.name}
                      {stage.id === deal.stage_id && (
                        <span className="ml-2 text-xs text-brand-500">(actuelle)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage progress */}
      {sortedStages.length > 0 && (
        <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6">
          <div className="flex items-center gap-2">
            {sortedStages.map((stage, i) => {
              const isActive = stage.id === deal.stage_id;
              const isPast = stage.position < (currentStage?.position || 0);
              return (
                <div key={stage.id} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium ${
                    isActive ? 'bg-brand-500 text-white' :
                    isPast ? 'bg-brand-100 text-brand-700' :
                    'bg-surface-100 text-surface-400'
                  }`}>
                    {stage.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left - Details + Activity */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Montant</p>
              <p className="mt-1 text-xl font-bold text-surface-900">
                {deal.amount.toLocaleString('fr-FR')} EUR
              </p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Probabilité</p>
              <p className="mt-1 text-xl font-bold text-surface-900">{probability}%</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Score</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-bold text-surface-900">{score}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  scoreLabel === 'Chaud' ? 'bg-emerald-50 text-emerald-700' :
                  scoreLabel === 'Tiède' ? 'bg-amber-50 text-amber-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {scoreLabel}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Jours en étape</p>
              <p className="mt-1 text-xl font-bold text-surface-900">{daysInStage}j</p>
            </div>
          </div>

          {/* Description */}
          {deal.description && (
            <div className="rounded-xl border border-surface-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-surface-900">Description</h2>
              <p className="mt-3 leading-relaxed text-surface-600">{deal.description}</p>
            </div>
          )}

          {/* Activity timeline */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-surface-900">Activité</h2>
            {deal.activities && deal.activities.length > 0 ? (
              <div className="mt-4 space-y-0">
                {deal.activities
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((activity, i) => (
                    <div key={activity.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${getActivityColor(activity.type)}`} />
                        {i < (deal.activities?.length || 0) - 1 && <div className="mt-1 w-px flex-1 bg-surface-200" />}
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="text-sm text-surface-900">{activity.description}</p>
                        <p className="mt-0.5 text-xs text-surface-400">
                          {formatTimelineDate(activity.created_at)}/
                          {new Date(activity.created_at).getFullYear()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-surface-500">Aucune activité enregistrée</p>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Deal info */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Informations</h3>
            <dl className="mt-4 space-y-3">
              {[
                ['Contact', contactName],
                ['Entreprise', companyName],
                ['Statut', deal.status],
                ['Créé le', formatDate(deal.created_at)],
                ['Clôture prévue', deal.expected_close_date ? formatDate(deal.expected_close_date) : 'Non définie'],
                ['Dernière activité', formatDate(deal.updated_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-surface-500">{label}</dt>
                  <dd className="text-sm font-medium text-surface-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Stage history */}
          {stageHistory.length > 0 && (
            <div className="rounded-xl border border-surface-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-surface-900">Historique des étapes</h3>
              <div className="mt-4 space-y-3">
                {stageHistory.map((h) => (
                  <div key={h.stage + h.entered} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-surface-900">{h.stage}</p>
                      <p className="text-xs text-surface-400">Depuis le {h.entered}</p>
                    </div>
                    <span className="text-xs text-surface-500">{h.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents - Placeholder for now */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Documents liés</h3>
            <div className="mt-4">
              <p className="text-sm text-surface-500">Aucun document lié</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
