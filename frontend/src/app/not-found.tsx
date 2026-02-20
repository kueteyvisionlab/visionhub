import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-brand-500 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-7xl font-bold text-brand-500">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-surface-900">Page introuvable</h2>
        <p className="mt-3 text-surface-500">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Retour au tableau de bord
          </Link>
          <Link href="/help" className="btn-secondary">
            Centre d&apos;aide
          </Link>
        </div>
      </div>
    </div>
  );
}
