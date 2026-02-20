'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { Modal, Button } from '@/components/ui';

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

interface Contact {
  id: number;
  type: 'particulier' | 'entreprise';
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
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
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: number; sourceStageId: number } | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_id: '',
    stage_id: '',
    amount: '',
    expected_close_date: '',
  });

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
        const { data: pipelineData, error: pipelineError } = await apiGet<Pipeline>(
          `/pipelines/${firstPipelineId}`,
          session.access_token
        );

        if (pipelineError || !pipelineData || !pipelineData.stages) {
          setError(pipelineError || 'Impossible de charger le pipeline');
          setLoading(false);
          return;
        }

        setPipeline(pipelineData);

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
        const sortedStages = [...pipelineData.stages].sort((a, b) => a.position - b.position);
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

  // Fetch contacts when modal opens
  useEffect(() => {
    async function fetchContacts() {
      if (!showNewDeal || !session?.access_token) return;

      try {
        const { data: contactsResponse, error: contactsError } = await apiGet<{ data: Contact[] }>(
          '/contacts?limit=100',
          session.access_token
        );

        if (contactsError) {
          console.error('Error fetching contacts:', contactsError);
          return;
        }

        setContacts(contactsResponse?.data || []);
      } catch (err) {
        console.error('Error fetching contacts:', err);
      }
    }

    fetchContacts();
  }, [showNewDeal, session?.access_token]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token || !pipeline) return;

    setFormLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare payload for API
      const payload = {
        name: formData.name,
        pipeline_id: pipeline.id,
        stage_id: parseInt(formData.stage_id),
        contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
        amount: parseFloat(formData.amount),
        expected_close_date: formData.expected_close_date || null,
      };

      const { error } = await apiPost('/deals', payload, session.access_token);

      if (error) {
        setErrorMessage(error);
        setFormLoading(false);
        return;
      }

      setSuccessMessage('Deal créé avec succès');

      // Refresh the page data after a short delay
      setTimeout(() => {
        setShowNewDeal(false);
        setFormData({
          name: '',
          contact_id: '',
          stage_id: '',
          amount: '',
          expected_close_date: '',
        });
        setSuccessMessage('');
        setErrorMessage('');
        // Reload the page to refresh deals
        router.refresh();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating deal:', err);
      setErrorMessage(err.message || 'Une erreur est survenue');
      setFormLoading(false);
    }
  }

  function getContactDisplayName(contact: Contact): string {
    if (contact.type === 'entreprise' && contact.company_name) {
      return contact.company_name;
    }
    return `${contact.first_name} ${contact.last_name}`;
  }

  // --- Drag & Drop Handlers ---
  function handleDragStart(e: React.DragEvent<HTMLDivElement>, deal: Deal) {
    setDraggedDeal({ dealId: deal.id, sourceStageId: deal.stage_id });
    e.dataTransfer.setData('text/plain', JSON.stringify({ dealId: deal.id, sourceStageId: deal.stage_id }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stageId: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  }

  function handleDragLeave() {
    setDragOverStageId(null);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, targetStageId: number) {
    e.preventDefault();
    setDragOverStageId(null);

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;

    const { dealId, sourceStageId } = JSON.parse(raw) as { dealId: number; sourceStageId: number };

    // No-op if dropped on the same column
    if (sourceStageId === targetStageId) {
      setDraggedDeal(null);
      return;
    }

    // Optimistic update: move deal between columns
    const previousColumns = columns;
    setColumns((prev) =>
      prev.map((col) => {
        if (col.stage.id === sourceStageId) {
          return { ...col, deals: col.deals.filter((d) => d.id !== dealId) };
        }
        if (col.stage.id === targetStageId) {
          const movedDeal = previousColumns
            .find((c) => c.stage.id === sourceStageId)
            ?.deals.find((d) => d.id === dealId);
          if (movedDeal) {
            return { ...col, deals: [...col.deals, { ...movedDeal, stage_id: targetStageId }] };
          }
        }
        return col;
      })
    );

    setDraggedDeal(null);

    // Persist to API
    if (session?.access_token) {
      const { error: patchError } = await apiPatch(
        `/deals/${dealId}`,
        { stage_id: targetStageId },
        session.access_token
      );

      if (patchError) {
        console.error('Failed to update deal stage:', patchError);
        // Revert on failure
        setColumns(previousColumns);
      }
    }
  }

  function handleDragEnd() {
    setDraggedDeal(null);
    setDragOverStageId(null);
  }

  const inputClasses =
    'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  const labelClasses = 'block text-sm font-medium text-surface-700 mb-1';

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
        <button
          onClick={() => setShowNewDeal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div
            key={column.stage.id}
            className={`rounded-xl border border-surface-200 bg-surface-50 overflow-hidden border-t-4 ${column.color} transition-all ${dragOverStageId === column.stage.id ? 'ring-2 ring-brand-400 bg-brand-50/50' : ''}`}
            onDragOver={(e) => handleDragOver(e, column.stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.stage.id)}
          >
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
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, deal)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border border-surface-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer ${draggedDeal?.dealId === deal.id ? 'opacity-50' : ''}`}
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

      {/* New Deal Modal */}
      <Modal open={showNewDeal} onClose={() => setShowNewDeal(false)} title="Nouveau deal" size="lg">
        {successMessage ? (
          <div className="flex items-center gap-3 rounded-lg bg-accent-emerald/10 px-4 py-3 text-sm font-medium text-accent-emerald">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="name" className={labelClasses}>Nom du deal</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Ex: Vente projet CRM"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="contact_id" className={labelClasses}>Contact</label>
              <select
                id="contact_id"
                name="contact_id"
                value={formData.contact_id}
                onChange={handleFormChange}
                className={inputClasses}
              >
                <option value="">Sélectionner un contact (optionnel)</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {getContactDisplayName(contact)} - {contact.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stage_id" className={labelClasses}>Étape</label>
              <select
                id="stage_id"
                name="stage_id"
                required
                value={formData.stage_id}
                onChange={handleFormChange}
                className={inputClasses}
              >
                <option value="">Sélectionner une étape</option>
                {pipeline?.stages?.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amount" className={labelClasses}>Montant (€)</label>
              <input
                id="amount"
                name="amount"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={handleFormChange}
                placeholder="Ex: 5000"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="expected_close_date" className={labelClasses}>Date de clôture prévue</label>
              <input
                id="expected_close_date"
                name="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={handleFormChange}
                className={inputClasses}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewDeal(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={formLoading}>
                Créer le deal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
