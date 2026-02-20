'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { apiPost } from '@/lib/api';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);

    try {
      const slug = slugify(companyName);
      if (!slug) {
        setError('Le nom d\'entreprise est invalide.');
        setLoading(false);
        return;
      }

      // Call backend API which creates tenant + user + session
      const { data, error: apiError } = await apiPost<{
        user: any;
        tenant: any;
        session: { access_token: string; refresh_token: string; expires_at: number };
      }>('/auth/register', {
        email,
        password,
        full_name: fullName,
        tenant_name: companyName,
        tenant_slug: slug,
        phone: phone || undefined,
      });

      if (apiError || !data) {
        setError(apiError || 'Erreur lors de la création du compte.');
        return;
      }

      // Set Supabase session with tokens from backend
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-surface-900">
          Vision <span className="text-brand-500">CRM</span>
        </h1>
        <p className="text-surface-500 mt-2">Créez votre compte</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-accent-rose px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-surface-700 mb-1.5">
            Nom complet
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jean Dupont"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 mb-1.5">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-surface-700 mb-1.5">
            Nom d&apos;entreprise
          </label>
          <input
            id="companyName"
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ma Société SAS"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
          {companyName && (
            <p className="mt-1 text-xs text-surface-400">
              URL : votre-crm.vision/{slugify(companyName)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-surface-700 mb-1.5">
            Téléphone <span className="text-surface-400">(optionnel)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium py-2.5 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Création en cours...' : 'Créer mon compte'}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-surface-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
