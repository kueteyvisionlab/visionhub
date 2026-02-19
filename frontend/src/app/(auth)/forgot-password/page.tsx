'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-surface-900 mb-2">Email envoyé</h2>
        <p className="text-surface-500 mb-6">
          Un email de réinitialisation a été envoyé à <strong className="text-surface-700">{email}</strong>. Vérifiez votre boîte de réception.
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
        <p className="text-surface-500 mt-2">Réinitialisez votre mot de passe</p>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium py-2.5 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
        </button>
      </form>

      {/* Back to login */}
      <p className="mt-6 text-center text-sm text-surface-500">
        <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
