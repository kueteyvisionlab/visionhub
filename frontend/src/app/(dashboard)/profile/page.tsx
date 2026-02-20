'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiPatch } from '@/lib/api';

export default function ProfilePage() {
  const { user } = useAuth();
  const meta = user?.user_metadata || {};

  const [form, setForm] = useState({
    full_name: meta.full_name || '',
    phone: meta.phone || '',
    job_title: meta.job_title || '',
    bio: meta.bio || '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const email = user?.email || '';
  const initials = (form.full_name || email)
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSaveProfile() {
    setSaving(true);
    setSuccess('');
    setError('');
    const { error: err } = await apiPatch('/auth/me', { user_metadata: form });
    if (err) setError('Erreur lors de la mise à jour.');
    else setSuccess('Profil mis à jour avec succès.');
    setSaving(false);
  }

  async function handleChangePassword() {
    if (passwordForm.newPass.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSavingPwd(true);
    setSuccess('');
    setError('');
    const { error: err } = await apiPatch('/auth/password', {
      current_password: passwordForm.current,
      new_password: passwordForm.newPass,
    });
    if (err) setError(err);
    else {
      setSuccess('Mot de passe modifié avec succès.');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    }
    setSavingPwd(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Mon profil</h1>
      <p className="mt-1 text-surface-500 dark:text-surface-400">Gérez vos informations personnelles.</p>

      {(success || error) && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'}`}>
          {success || error}
        </div>
      )}

      {/* Avatar + Info */}
      <div className="mt-8 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{form.full_name || 'Utilisateur'}</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">{email}</p>
            {form.job_title && <p className="text-xs text-surface-400 mt-0.5">{form.job_title}</p>}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Informations personnelles</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom complet</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
              <input type="email" value={email} disabled className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm bg-surface-50 text-surface-400 dark:bg-surface-700 dark:border-surface-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Téléphone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="+33 6 12 34 56 78" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Poste</label>
              <input type="text" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Directeur commercial" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Quelques mots sur vous..." />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Changer le mot de passe</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Mot de passe actuel</label>
            <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nouveau mot de passe</label>
              <input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Confirmer</label>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleChangePassword} disabled={savingPwd || !passwordForm.current || !passwordForm.newPass} className="btn-primary disabled:opacity-50">
            {savingPwd ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Sessions actives</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">Session actuelle</p>
                <p className="text-xs text-surface-400">Navigateur web • {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-accent-emerald"><span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
