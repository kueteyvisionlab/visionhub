'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent-emerald/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-surface-900 mb-2">Compte créé avec succès</h2>
        <p className="text-surface-500 mb-6">
          Vérifiez votre email pour confirmer votre compte.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-6 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Retour à la connexion
        </Link>
      </div>
    );
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
