'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  deal_count?: number;
}

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages: Stage[];
  created_at: string;
}

const COLORS = ['#3269ff', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const DEMO_PIPELINES: Pipeline[] = [
  {
    id: '1', name: 'Pipeline principal', is_default: true, created_at: '2026-01-01T10:00:00Z',
    stages: [
      { id: 's1', name: 'Prospection', position: 0, color: '#9ca3b4', deal_count: 45 },
      { id: 's2', name: 'Qualification', position: 1, color: '#3269ff', deal_count: 22 },
      { id: 's3', name: 'Proposition', position: 2, color: '#8b5cf6', deal_count: 12 },
      { id: 's4', name: 'Négociation', position: 3, color: '#f59e0b', deal_count: 8 },
      { id: 's5', name: 'Gagné', position: 4, color: '#10b981', deal_count: 52 },
      { id: 's6', name: 'Perdu', position: 5, color: '#f43f5e', deal_count: 15 },
    ],
  },
  {
    id: '2', name: 'Pipeline immobilier', is_default: false, created_at: '2026-01-15T14:00:00Z',
    stages: [
      { id: 's7', name: 'Nouveau mandat', position: 0, color: '#3269ff', deal_count: 8 },
      { id: 's8', name: 'Visite programmée', position: 1, color: '#8b5cf6', deal_count: 5 },
      { id: 's9', name: 'Offre reçue', position: 2, color: '#f59e0b', deal_count: 3 },
      { id: 's10', name: 'Compromis signé', position: 3, color: '#10b981', deal_count: 2 },
    ],
  },
];

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [stageForm, setStageForm] = useState({ name: '', color: COLORS[0] });
  const [editStageId, setEditStageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPipelines(); }, []);

  async function fetchPipelines() {
    setLoading(true);
    const { data, error } = await apiGet<Pipeline[]>('/pipelines');
    const result = error || !data ? DEMO_PIPELINES : data;
    setPipelines(result);
    if (result.length > 0 && !selectedId) setSelectedId(result[0].id);
    setLoading(false);
  }

  const selected = pipelines.find((p) => p.id === selectedId);

  async function createPipeline() {
    if (!pipelineName.trim()) return;
    setSaving(true);
    const { data } = await apiPost<Pipeline>('/pipelines', { name: pipelineName });
    const newPipeline: Pipeline = data || { id: Date.now().toString(), name: pipelineName, is_default: false, stages: [], created_at: new Date().toISOString() };
    setPipelines((p) => [...p, newPipeline]);
    setSelectedId(newPipeline.id);
    setSaving(false);
    setShowPipelineModal(false);
    setPipelineName('');
  }

  async function deletePipeline(id: string) {
    if (!confirm('Supprimer ce pipeline et toutes ses étapes ?')) return;
    await apiDelete(`/pipelines/${id}`);
    setPipelines((p) => p.filter((pl) => pl.id !== id));
    if (selectedId === id) setSelectedId(pipelines[0]?.id || null);
  }

  async function saveStage() {
    if (!stageForm.name.trim() || !selected) return;
    setSaving(true);
    if (editStageId) {
      await apiPatch(`/pipelines/${selected.id}/stages/${editStageId}`, stageForm);
      setPipelines((prev) => prev.map((p) => p.id === selected.id ? { ...p, stages: p.stages.map((s) => s.id === editStageId ? { ...s, ...stageForm } : s) } : p));
    } else {
      const position = selected.stages.length;
      const { data } = await apiPost<Stage>(`/pipelines/${selected.id}/stages`, { ...stageForm, position });
      const newStage: Stage = data || { id: Date.now().toString(), ...stageForm, position, deal_count: 0 };
      setPipelines((prev) => prev.map((p) => p.id === selected.id ? { ...p, stages: [...p.stages, newStage] } : p));
    }
    setSaving(false);
    setShowStageModal(false);
    setEditStageId(null);
    setStageForm({ name: '', color: COLORS[0] });
  }

  async function deleteStage(stageId: string) {
    if (!selected || !confirm('Supprimer cette étape ?')) return;
    await apiDelete(`/pipelines/${selected.id}/stages/${stageId}`);
    setPipelines((prev) => prev.map((p) => p.id === selected.id ? { ...p, stages: p.stages.filter((s) => s.id !== stageId) } : p));
  }

  function openEditStage(stage: Stage) {
    setEditStageId(stage.id);
    setStageForm({ name: stage.name, color: stage.color });
    setShowStageModal(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Pipelines</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Configurez vos pipelines de vente et leurs étapes.</p>
        </div>
        <button onClick={() => { setPipelineName(''); setShowPipelineModal(true); }} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau pipeline
        </button>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="mt-6 flex gap-6">
          {/* Pipeline list */}
          <div className="w-64 flex-shrink-0 space-y-2">
            {pipelines.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedId === p.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-500' : 'border-surface-200 bg-white hover:border-surface-300 dark:bg-surface-800 dark:border-surface-700'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{p.name}</h3>
                  {p.is_default && <span className="text-[10px] font-medium text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded dark:bg-brand-900/30 dark:text-brand-400">Défaut</span>}
                </div>
                <p className="mt-1 text-xs text-surface-400">{p.stages.length} étapes</p>
              </button>
            ))}
          </div>

          {/* Pipeline detail */}
          {selected ? (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{selected.name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => { setEditStageId(null); setStageForm({ name: '', color: COLORS[selected.stages.length % COLORS.length] }); setShowStageModal(true); }} className="btn-secondary text-sm px-4 py-2">
                    + Ajouter une étape
                  </button>
                  {!selected.is_default && (
                    <button onClick={() => deletePipeline(selected.id)} className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual pipeline */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {selected.stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[100px]">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: stage.color }}>
                        {stage.deal_count || 0}
                      </div>
                      <span className="mt-1 text-xs text-surface-600 dark:text-surface-300 text-center">{stage.name}</span>
                    </div>
                    {i < selected.stages.length - 1 && (
                      <svg className="w-6 h-6 text-surface-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Stages table */}
              <div className="rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 dark:bg-surface-900">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-surface-500">Position</th>
                      <th className="px-4 py-3 text-left font-medium text-surface-500">Couleur</th>
                      <th className="px-4 py-3 text-left font-medium text-surface-500">Nom</th>
                      <th className="px-4 py-3 text-right font-medium text-surface-500">Deals</th>
                      <th className="px-4 py-3 text-right font-medium text-surface-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                    {selected.stages.sort((a, b) => a.position - b.position).map((stage) => (
                      <tr key={stage.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                        <td className="px-4 py-3 text-surface-400">{stage.position + 1}</td>
                        <td className="px-4 py-3"><div className="w-5 h-5 rounded-full" style={{ backgroundColor: stage.color }} /></td>
                        <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">{stage.name}</td>
                        <td className="px-4 py-3 text-right text-surface-600 dark:text-surface-300">{stage.deal_count || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditStage(stage)} className="p-1.5 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-600 dark:hover:bg-surface-700">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                            </button>
                            <button onClick={() => deleteStage(stage.id)} className="p-1.5 rounded hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selected.stages.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">Aucune étape configurée</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-surface-400">Sélectionnez un pipeline</div>
          )}
        </div>
      )}

      {/* Pipeline creation modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPipelineModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Nouveau pipeline</h2>
            <div className="mt-4">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
              <input type="text" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Pipeline commercial" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPipelineModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={createPipeline} disabled={saving || !pipelineName.trim()} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage modal */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowStageModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{editStageId ? 'Modifier l\'étape' : 'Nouvelle étape'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
                <input type="text" value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Nom de l'étape" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setStageForm({ ...stageForm, color: c })} className={`w-8 h-8 rounded-full transition-transform ${stageForm.color === c ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowStageModal(false); setEditStageId(null); }} className="btn-secondary">Annuler</button>
              <button onClick={saveStage} disabled={saving || !stageForm.name.trim()} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editStageId ? 'Modifier' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
