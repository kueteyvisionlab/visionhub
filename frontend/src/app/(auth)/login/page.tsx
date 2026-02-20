'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { apiPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call backend API to get user + tenant + session
      const { data, error: apiError } = await apiPost<{
        user: any;
        tenant: any;
        session: { access_token: string; refresh_token: string; expires_at: number };
      }>('/auth/login', { email, password });

      if (apiError || !data) {
        // Fallback: try direct Supabase auth if backend is unavailable
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(apiError || signInError.message);
          return;
        }
      } else {
        // Set Supabase session with tokens from backend
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

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
        <p className="text-surface-500 mt-2">Connectez-vous à votre espace</p>
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

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium py-2.5 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-surface-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
