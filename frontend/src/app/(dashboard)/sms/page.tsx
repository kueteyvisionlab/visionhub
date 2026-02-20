'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  usage_count: number;
  created_at: string;
}

interface SmsCampaign {
  id: string;
  name: string;
  template_id?: string;
  status: 'draft' | 'sent' | 'scheduled';
  recipient_count: number;
  delivered: number;
  sent_at?: string;
  scheduled_at?: string;
  created_at: string;
}

interface SmsConversation {
  id: string;
  contact_name: string;
  contact_phone: string;
  messages: { content: string; direction: 'sent' | 'received'; timestamp: string }[];
}

const DEMO_TEMPLATES: SmsTemplate[] = [
  { id: '1', name: 'Rappel RDV', content: 'Bonjour {{prenom}}, rappel de votre RDV le {{date}} à {{heure}}. Confirmez en répondant OUI.', usage_count: 156, created_at: '2026-01-10T10:00:00Z' },
  { id: '2', name: 'Confirmation commande', content: 'Merci {{prenom}} ! Votre commande #{{ref}} est confirmée. Livraison prévue le {{date}}.', usage_count: 89, created_at: '2026-01-15T14:00:00Z' },
  { id: '3', name: 'Promo flash', content: '{{prenom}}, profitez de -20% sur nos services jusqu\'au {{date}} ! Code: FLASH20. {{entreprise}}', usage_count: 42, created_at: '2026-02-01T09:00:00Z' },
];

const DEMO_CAMPAIGNS: SmsCampaign[] = [
  { id: '1', name: 'Rappels RDV Février', status: 'sent', recipient_count: 85, delivered: 82, sent_at: '2026-02-15T09:00:00Z', created_at: '2026-02-14T16:00:00Z' },
  { id: '2', name: 'Promo Saint-Valentin', status: 'sent', recipient_count: 342, delivered: 328, sent_at: '2026-02-12T08:00:00Z', created_at: '2026-02-10T10:00:00Z' },
  { id: '3', name: 'Relance clients inactifs', status: 'scheduled', recipient_count: 67, delivered: 0, scheduled_at: '2026-02-25T10:00:00Z', created_at: '2026-02-18T11:00:00Z' },
  { id: '4', name: 'Enquête satisfaction', status: 'draft', recipient_count: 0, delivered: 0, created_at: '2026-02-19T15:00:00Z' },
];

const DEMO_CONVERSATIONS: SmsConversation[] = [
  { id: '1', contact_name: 'Marie Dupont', contact_phone: '+33 6 12 34 56 78', messages: [
    { content: 'Bonjour Marie, rappel de votre RDV demain à 14h.', direction: 'sent', timestamp: '2026-02-19T10:00:00Z' },
    { content: 'OUI merci, je serai là !', direction: 'received', timestamp: '2026-02-19T10:15:00Z' },
    { content: 'Parfait, à demain !', direction: 'sent', timestamp: '2026-02-19T10:20:00Z' },
  ]},
  { id: '2', contact_name: 'Pierre Martin', contact_phone: '+33 6 98 76 54 32', messages: [
    { content: 'Bonjour Pierre, votre devis est prêt. Souhaitez-vous en discuter ?', direction: 'sent', timestamp: '2026-02-18T14:00:00Z' },
    { content: 'Oui, vous pouvez m\'appeler demain matin ?', direction: 'received', timestamp: '2026-02-18T16:30:00Z' },
  ]},
  { id: '3', contact_name: 'Sophie Bernard', contact_phone: '+33 7 45 67 89 01', messages: [
    { content: 'Sophie, profitez de -20% avec le code FLASH20 !', direction: 'sent', timestamp: '2026-02-15T09:00:00Z' },
  ]},
];

const VARIABLES = ['{{prenom}}', '{{nom}}', '{{entreprise}}', '{{date}}', '{{heure}}', '{{ref}}'];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300',
  sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function SmsPage() {
  const [tab, setTab] = useState<'campaigns' | 'templates' | 'conversations'>('campaigns');
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [conversations, setConversations] = useState<SmsConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [campaignForm, setCampaignForm] = useState({ name: '', template_id: '', audience: 'all', schedule: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [cRes, tRes, cvRes] = await Promise.all([
      apiGet<SmsCampaign[]>('/sms/campaigns'),
      apiGet<SmsTemplate[]>('/sms/templates'),
      apiGet<SmsConversation[]>('/sms/conversations'),
    ]);
    setCampaigns(cRes.error || !cRes.data ? DEMO_CAMPAIGNS : cRes.data);
    setTemplates(tRes.error || !tRes.data ? DEMO_TEMPLATES : tRes.data);
    setConversations(cvRes.error || !cvRes.data ? DEMO_CONVERSATIONS : cvRes.data);
    setLoading(false);
  }

  const smsSegments = (len: number) => len <= 160 ? 1 : len <= 306 ? 2 : Math.ceil(len / 153);

  const stats = {
    sent: campaigns.reduce((s, c) => s + c.delivered, 0),
    deliveryRate: campaigns.filter((c) => c.status === 'sent').length > 0
      ? Math.round(campaigns.filter((c) => c.status === 'sent').reduce((s, c) => s + (c.delivered / c.recipient_count) * 100, 0) / campaigns.filter((c) => c.status === 'sent').length)
      : 0,
  };

  async function saveCampaign() {
    setSaving(true);
    const { data } = await apiPost<SmsCampaign>('/sms/campaigns', campaignForm);
    if (data) setCampaigns((p) => [data, ...p]);
    else {
      const fake: SmsCampaign = { id: Date.now().toString(), name: campaignForm.name, status: campaignForm.schedule ? 'scheduled' : 'draft', recipient_count: 0, delivered: 0, scheduled_at: campaignForm.schedule || undefined, created_at: new Date().toISOString() };
      setCampaigns((p) => [fake, ...p]);
    }
    setSaving(false);
    setShowCampaignModal(false);
  }

  async function saveTemplate() {
    setSaving(true);
    const { data } = await apiPost<SmsTemplate>('/sms/templates', templateForm);
    if (data) setTemplates((p) => [data, ...p]);
    else {
      const fake: SmsTemplate = { id: Date.now().toString(), ...templateForm, usage_count: 0, created_at: new Date().toISOString() };
      setTemplates((p) => [fake, ...p]);
    }
    setSaving(false);
    setShowTemplateModal(false);
  }

  function sendReply() {
    if (!reply.trim() || !selectedConvo) return;
    setConversations((prev) => prev.map((c) => c.id === selectedConvo ? { ...c, messages: [...c.messages, { content: reply, direction: 'sent' as const, timestamp: new Date().toISOString() }] } : c));
    apiPost('/sms/send', { conversation_id: selectedConvo, content: reply });
    setReply('');
  }

  const activeConvo = conversations.find((c) => c.id === selectedConvo);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">SMS</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Campagnes, templates et conversations SMS.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'SMS envoyés ce mois', value: String(stats.sent) },
          { label: 'Taux de livraison', value: `${stats.deliveryRate}%` },
          { label: 'Conversations actives', value: String(conversations.length) },
          { label: 'Templates', value: String(templates.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-surface-200 bg-white p-4 dark:bg-surface-800 dark:border-surface-700">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-surface-200 dark:border-surface-700">
        {(['campaigns', 'templates', 'conversations'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400'}`}>
            {t === 'campaigns' ? 'Campagnes' : t === 'templates' ? 'Templates' : 'Conversations'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="mt-6">
          {/* Campaigns tab */}
          {tab === 'campaigns' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setCampaignForm({ name: '', template_id: '', audience: 'all', schedule: '' }); setShowCampaignModal(true); }} className="btn-primary">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Nouvelle campagne
                </button>
              </div>
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-5 py-4 dark:bg-surface-800 dark:border-surface-700">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{c.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                          {c.status === 'draft' ? 'Brouillon' : c.status === 'sent' ? 'Envoyé' : 'Planifié'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-surface-400">
                        <span>{c.recipient_count} destinataires</span>
                        {c.status === 'sent' && <span>{c.delivered} livrés ({Math.round((c.delivered / c.recipient_count) * 100)}%)</span>}
                        {c.sent_at && <span>Envoyé le {new Date(c.sent_at).toLocaleDateString('fr-FR')}</span>}
                        {c.scheduled_at && <span>Planifié le {new Date(c.scheduled_at).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 && <p className="text-center text-surface-400 py-8">Aucune campagne</p>}
              </div>
            </>
          )}

          {/* Templates tab */}
          {tab === 'templates' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setTemplateForm({ name: '', content: '' }); setShowTemplateModal(true); }} className="btn-primary">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Nouveau template
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800 dark:border-surface-700">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{t.name}</h3>
                    <p className="mt-2 text-xs text-surface-500 dark:text-surface-400 line-clamp-3">{t.content}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-surface-400">
                      <span>{t.content.length} car. • {smsSegments(t.content.length)} SMS</span>
                      <span>{t.usage_count} utilisations</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Conversations tab */}
          {tab === 'conversations' && (
            <div className="flex gap-4 h-[500px]">
              {/* Contact list */}
              <div className="w-72 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-y-auto flex-shrink-0">
                {conversations.map((c) => (
                  <button key={c.id} onClick={() => setSelectedConvo(c.id)} className={`w-full text-left px-4 py-3 border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors ${selectedConvo === c.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{c.contact_name}</p>
                    <p className="text-xs text-surface-400">{c.contact_phone}</p>
                    <p className="mt-1 text-xs text-surface-500 dark:text-surface-400 truncate">{c.messages[c.messages.length - 1]?.content}</p>
                  </button>
                ))}
              </div>

              {/* Thread */}
              <div className="flex-1 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 flex flex-col">
                {activeConvo ? (
                  <>
                    <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">{activeConvo.contact_name}</p>
                      <p className="text-xs text-surface-400">{activeConvo.contact_phone}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeConvo.messages.map((m, i) => (
                        <div key={i} className={`flex ${m.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-xl px-3 py-2 ${m.direction === 'sent' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-white'}`}>
                            <p className="text-sm">{m.content}</p>
                            <p className={`text-[10px] mt-1 ${m.direction === 'sent' ? 'text-brand-200' : 'text-surface-400'}`}>{new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-surface-200 dark:border-surface-700 flex gap-2">
                      <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder="Votre message..." className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
                      <button onClick={sendReply} className="btn-primary px-4">Envoyer</button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">Sélectionnez une conversation</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCampaignModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Nouvelle campagne SMS</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
                <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Template</label>
                <select value={campaignForm.template_id} onChange={(e) => setCampaignForm({ ...campaignForm, template_id: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                  <option value="">Sélectionner un template</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Audience</label>
                <select value={campaignForm.audience} onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                  <option value="all">Tous les contacts</option>
                  <option value="active">Contacts actifs</option>
                  <option value="leads">Leads uniquement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Planifier (optionnel)</label>
                <input type="datetime-local" value={campaignForm.schedule} onChange={(e) => setCampaignForm({ ...campaignForm, schedule: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCampaignModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={saveCampaign} disabled={saving || !campaignForm.name.trim()} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Nouveau template SMS</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
                <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Contenu</label>
                <textarea value={templateForm.content} onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Bonjour {{prenom}}..." />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {VARIABLES.map((v) => (
                      <button key={v} onClick={() => setTemplateForm({ ...templateForm, content: templateForm.content + v })} className="px-2 py-0.5 rounded bg-brand-50 text-xs text-brand-600 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400">{v}</button>
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${templateForm.content.length > 160 ? 'text-accent-amber' : 'text-surface-400'}`}>
                    {templateForm.content.length}/160 • {smsSegments(templateForm.content.length)} SMS
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowTemplateModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={saveTemplate} disabled={saving || !templateForm.name.trim() || !templateForm.content.trim()} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
