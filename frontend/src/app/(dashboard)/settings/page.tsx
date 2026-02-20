'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  plan: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const planLabels: Record<string, { label: string; price: string }> = {
  free: { label: 'Free', price: 'Gratuit' },
  starter: { label: 'Starter', price: '49 €/mois' },
  pro: { label: 'Pro', price: '149 €/mois' },
  enterprise: { label: 'Enterprise', price: 'Sur devis' },
};

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  super_admin: 'Super Admin',
  viewer: 'Lecteur',
};

const industries = [
  'garage_automobile',
  'hotel',
  'restaurant',
  'salon_coiffure',
  'dentiste',
  'avocat',
  'paysagiste',
  'consultant',
  'ecommerce',
];

const industryLabels: Record<string, string> = {
  garage_automobile: 'Garage automobile',
  hotel: 'Hôtel',
  restaurant: 'Restaurant',
  salon_coiffure: 'Salon de coiffure',
  dentiste: 'Dentiste',
  avocat: 'Avocat',
  paysagiste: 'Paysagiste',
  consultant: 'Consultant',
  ecommerce: 'E-commerce',
};

export default function SettingsPage() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Tenant form
  const [tenantName, setTenantName] = useState('');
  const [industry, setIndustry] = useState('');
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantSuccess, setTenantSuccess] = useState('');

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Team members
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general');

  useEffect(() => {
    if (!session?.access_token) return;

    async function fetchSettings() {
      try {
        const { data: meData } = await apiGet<{ user: UserProfile; tenant: Tenant }>(
          '/auth/me',
          session!.access_token
        );

        if (meData) {
          if (meData.user) {
            setProfile(meData.user);
            setFullName(meData.user.full_name || '');
          }
          if (meData.tenant) {
            setTenant(meData.tenant);
            setTenantName(meData.tenant.name || '');
            setIndustry(meData.tenant.industry || '');
          }
        }
        // Fetch team members
        const { data: usersData } = await apiGet<{ data: TeamMember[] }>(
          '/users',
          session!.access_token
        );
        if (usersData?.data) {
          setMembers(usersData.data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [session?.access_token]);

  async function handleProfileSave() {
    if (!session?.access_token || !profile) return;
    setProfileSaving(true);
    setProfileSuccess('');

    const { error } = await apiPatch(
      `/users/${profile.id}`,
      { full_name: fullName },
      session.access_token
    );

    setProfileSaving(false);
    if (!error) {
      setProfileSuccess('Profil mis à jour');
      setTimeout(() => setProfileSuccess(''), 3000);
    }
  }

  async function handleTenantSave() {
    if (!session?.access_token || !tenant) return;
    setTenantSaving(true);
    setTenantSuccess('');

    const { error } = await apiPatch(
      `/tenants/${tenant.id}`,
      { name: tenantName, industry },
      session.access_token
    );

    setTenantSaving(false);
    if (!error) {
      setTenantSuccess('Entreprise mise à jour');
      setTimeout(() => setTenantSuccess(''), 3000);
    }
  }

  async function handlePasswordChange() {
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      setPasswordSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess('Mot de passe modifié');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-surface-200 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-surface-200 bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = planLabels[tenant?.plan || 'free'] || planLabels.free;

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900">Paramètres</h1>
      <p className="mt-1 text-surface-500">Gérez les paramètres de votre compte et de votre entreprise.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-surface-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-brand-500 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700'}`}
        >
          Général
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'team' ? 'border-brand-500 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700'}`}
        >
          Équipe ({members.length})
        </button>
      </div>

      {/* Team tab */}
      {activeTab === 'team' && (
        <div className="mt-6">
          <div className="rounded-xl border border-surface-200 bg-white">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Membres de l&apos;équipe</h2>
                <p className="text-sm text-surface-500">{members.length} membre{members.length > 1 ? 's' : ''}</p>
              </div>
              <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                Inviter un membre
              </button>
            </div>
            <div className="divide-y divide-surface-100">
              {members.length > 0 ? members.map((member) => (
                <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${member.is_active ? 'bg-brand-500' : 'bg-surface-300'}`}>
                    {(member.full_name || member.email).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900">{member.full_name || 'Sans nom'}</p>
                    <p className="text-xs text-surface-400">{member.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    member.role === 'admin' ? 'bg-brand-50 text-brand-700' :
                    member.role === 'super_admin' ? 'bg-accent-violet/10 text-accent-violet' :
                    'bg-surface-100 text-surface-600'
                  }`}>
                    {roleLabels[member.role] || member.role}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-accent-emerald' : 'bg-surface-300'}`} title={member.is_active ? 'Actif' : 'Inactif'} />
                </div>
              )) : (
                <div className="px-6 py-12 text-center text-surface-400">
                  <p>Aucun membre trouvé.</p>
                  <p className="text-xs mt-1">Les membres de votre équipe apparaîtront ici.</p>
                </div>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="mt-6 rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-6">
            <h2 className="text-lg font-semibold text-accent-rose">Zone dangereuse</h2>
            <p className="mt-1 text-sm text-surface-500">Actions irréversibles sur votre compte.</p>
            <div className="mt-4 flex items-center gap-4">
              <button className="rounded-lg border border-accent-rose/30 px-4 py-2 text-sm font-medium text-accent-rose hover:bg-accent-rose/10 transition-colors">
                Supprimer toutes les données
              </button>
              <button className="rounded-lg border border-accent-rose/30 px-4 py-2 text-sm font-medium text-accent-rose hover:bg-accent-rose/10 transition-colors">
                Supprimer le compte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General tab */}
      {activeTab === 'general' && <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Profil */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Profil</h2>
          <p className="mt-1 text-sm text-surface-500">Informations de votre compte utilisateur.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Rôle</label>
              <p className="mt-1 text-sm text-surface-600">{roleLabels[profile?.role || 'user'] || profile?.role}</p>
            </div>
          </div>
          {profileSuccess && (
            <p className="mt-3 text-sm text-accent-emerald">{profileSuccess}</p>
          )}
          <button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Entreprise */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Entreprise</h2>
          <p className="mt-1 text-sm text-surface-500">Informations de votre entreprise.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Nom de l&apos;entreprise</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Secteur d&apos;activité</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Sélectionner...</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {industryLabels[ind] || ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Plan actuel</label>
              <div className="mt-1 flex items-center gap-3">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                  {currentPlan.label}
                </span>
                <span className="text-sm text-surface-500">{currentPlan.price}</span>
              </div>
            </div>
          </div>
          {tenantSuccess && (
            <p className="mt-3 text-sm text-accent-emerald">{tenantSuccess}</p>
          )}
          <button
            onClick={handleTenantSave}
            disabled={tenantSaving}
            className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {tenantSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Notifications</h2>
          <p className="mt-1 text-sm text-surface-500">Configurez vos préférences de notification.</p>
          <div className="mt-6 space-y-4">
            {[
              { label: 'Nouveau deal', desc: 'Quand un deal est créé ou déplacé', checked: true },
              { label: 'Nouveau contact', desc: "Quand un contact est ajouté", checked: true },
              { label: 'Devis accepté', desc: 'Quand un client accepte un devis', checked: true },
              { label: 'Rappels', desc: 'Rappels de tâches et rendez-vous', checked: true },
              { label: 'Rapports hebdomadaires', desc: 'Résumé des KPIs chaque lundi', checked: false },
            ].map((notif) => (
              <label key={notif.label} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  defaultChecked={notif.checked}
                  className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-medium text-surface-700">{notif.label}</p>
                  <p className="text-xs text-surface-400">{notif.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Securite */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Sécurité</h2>
          <p className="mt-1 text-sm text-surface-500">Gérez la sécurité de votre compte.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 caractères"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          {passwordError && (
            <p className="mt-3 text-sm text-accent-rose">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="mt-3 text-sm text-accent-emerald">{passwordSuccess}</p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={passwordSaving || !newPassword}
            className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {passwordSaving ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>}
    </div>
  );
}
