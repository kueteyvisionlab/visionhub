'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiPatch, apiPost } from '@/lib/api';

const SECTORS = [
  { value: 'real_estate', label: 'Immobilier', icon: '🏠' },
  { value: 'automotive', label: 'Automobile', icon: '🚗' },
  { value: 'hospitality', label: 'Hôtellerie', icon: '🏨' },
  { value: 'healthcare', label: 'Santé', icon: '🏥' },
  { value: 'legal', label: 'Juridique', icon: '⚖️' },
  { value: 'restaurant', label: 'Restauration', icon: '🍽️' },
  { value: 'construction', label: 'BTP', icon: '🏗️' },
  { value: 'consulting', label: 'Conseil', icon: '💼' },
  { value: 'technology', label: 'Technologie', icon: '💻' },
];

const TEAM_SIZES = [
  { value: '1', label: '1 personne (solo)' },
  { value: '2-5', label: '2 à 5 personnes' },
  { value: '6-20', label: '6 à 20 personnes' },
  { value: '20+', label: 'Plus de 20' },
];

const GOALS = [
  { value: 'manage_contacts', label: 'Gérer mes contacts', icon: '👥' },
  { value: 'track_deals', label: 'Suivre mes deals', icon: '💰' },
  { value: 'send_quotes', label: 'Envoyer des devis', icon: '📄' },
  { value: 'email_marketing', label: 'Email marketing', icon: '📧' },
  { value: 'manage_team', label: 'Gérer mon équipe', icon: '🏆' },
  { value: 'analytics', label: 'Analyser mes performances', icon: '📊' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const userName = user?.user_metadata?.full_name || 'Utilisateur';

  function toggleGoal(g: string) {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  async function handleFinish() {
    setSaving(true);
    await apiPatch('/tenants/me', { sector, team_size: teamSize, goals });
    await apiPost('/contacts', {
      first_name: 'Contact',
      last_name: 'Exemple',
      email: 'exemple@vision-crm.fr',
      company: 'Entreprise Démo',
      tags: ['demo'],
    });
    setSaving(false);
    router.push('/dashboard');
  }

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Bienvenue, {userName} !</h1>
      <p className="mt-3 text-lg text-surface-500 dark:text-surface-400">Configurons votre CRM en quelques étapes.</p>
      <button onClick={() => setStep(1)} className="btn-primary mt-8 px-8 py-3 text-base">
        Commencer
        <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
      </button>
    </div>,

    // Step 1: Sector
    <div key="sector">
      <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Quel est votre secteur d&apos;activité ?</h2>
      <p className="mt-2 text-surface-500 dark:text-surface-400">Nous adapterons les fonctionnalités à votre métier.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {SECTORS.map((s) => (
          <button key={s.value} onClick={() => setSector(s.value)} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${sector === s.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 hover:border-surface-300 dark:border-surface-700'}`}>
            <span className="text-2xl">{s.icon}</span>
            <span className="text-sm font-medium text-surface-900 dark:text-white">{s.label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Team size
    <div key="team">
      <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Quelle est la taille de votre équipe ?</h2>
      <p className="mt-2 text-surface-500 dark:text-surface-400">Pour adapter les fonctionnalités collaboratives.</p>
      <div className="mt-6 space-y-3">
        {TEAM_SIZES.map((t) => (
          <button key={t.value} onClick={() => setTeamSize(t.value)} className={`w-full flex items-center p-4 rounded-xl border-2 transition-all text-left ${teamSize === t.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 hover:border-surface-300 dark:border-surface-700'}`}>
            <span className="text-sm font-medium text-surface-900 dark:text-white">{t.label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Goals
    <div key="goals">
      <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Que souhaitez-vous accomplir ?</h2>
      <p className="mt-2 text-surface-500 dark:text-surface-400">Sélectionnez un ou plusieurs objectifs.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {GOALS.map((g) => (
          <button key={g.value} onClick={() => toggleGoal(g.value)} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${goals.includes(g.value) ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 hover:border-surface-300 dark:border-surface-700'}`}>
            <span className="text-2xl">{g.icon}</span>
            <span className="text-sm font-medium text-surface-900 dark:text-white">{g.label}</span>
            {goals.includes(g.value) && (
              <svg className="w-5 h-5 text-brand-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            )}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Done
    <div key="done" className="text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-accent-emerald flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Tout est prêt !</h2>
      <p className="mt-3 text-surface-500 dark:text-surface-400">Votre CRM est configuré. Un contact exemple a été créé pour vous aider à démarrer.</p>
      <div className="mt-6 rounded-xl bg-surface-50 dark:bg-surface-700 p-4 text-left">
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Prochaines étapes :</p>
        <ul className="mt-2 space-y-2 text-sm text-surface-500 dark:text-surface-400">
          <li className="flex items-center gap-2"><svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Ajoutez vos premiers contacts</li>
          <li className="flex items-center gap-2"><svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Créez votre premier deal</li>
          <li className="flex items-center gap-2"><svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Personnalisez votre pipeline</li>
          <li className="flex items-center gap-2"><svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Invitez votre équipe</li>
        </ul>
      </div>
      <button onClick={handleFinish} disabled={saving} className="btn-primary mt-6 px-8 py-3 text-base disabled:opacity-50">
        {saving ? 'Finalisation...' : 'Accéder au tableau de bord'}
      </button>
    </div>,
  ];

  const totalSteps = steps.length;
  const canNext = step === 0 || (step === 1 && sector) || (step === 2 && teamSize) || (step === 3 && goals.length > 0) || step === 4;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Progress */}
        {step > 0 && step < totalSteps - 1 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-surface-400 mb-2">
              <span>Étape {step} sur {totalSteps - 2}</span>
              <span>{Math.round((step / (totalSteps - 2)) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700">
              <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${(step / (totalSteps - 2)) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Step content */}
        {steps[step]}

        {/* Navigation */}
        {step > 0 && step < totalSteps - 1 && (
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(step - 1)} className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Précédent
            </button>
            <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary disabled:opacity-50">
              {step === totalSteps - 2 ? 'Terminer' : 'Suivant'}
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
