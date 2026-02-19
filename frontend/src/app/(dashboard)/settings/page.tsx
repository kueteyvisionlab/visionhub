export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900">Parametres</h1>
      <p className="mt-1 text-surface-500">Gerez les parametres de votre compte et de votre entreprise.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Profil */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Profil</h2>
          <p className="mt-1 text-sm text-surface-500">Informations de votre compte utilisateur.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Nom complet</label>
              <input
                type="text"
                defaultValue="Admin Vision"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Email</label>
              <input
                type="email"
                defaultValue="admin@visioncrm.fr"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Role</label>
              <p className="mt-1 text-sm text-surface-600">Administrateur</p>
            </div>
          </div>
          <button className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Enregistrer
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
                defaultValue="Garage Dupont"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Secteur d&apos;activite</label>
              <select className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option>Garage automobile</option>
                <option>Hotel</option>
                <option>Restaurant</option>
                <option>Salon de coiffure</option>
                <option>Dentiste</option>
                <option>Avocat</option>
                <option>Paysagiste</option>
                <option>Consultant</option>
                <option>E-commerce</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Plan actuel</label>
              <div className="mt-1 flex items-center gap-3">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">Pro</span>
                <span className="text-sm text-surface-500">149 EUR/mois</span>
              </div>
            </div>
          </div>
          <button className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Enregistrer
          </button>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Notifications</h2>
          <p className="mt-1 text-sm text-surface-500">Configurez vos preferences de notification.</p>
          <div className="mt-6 space-y-4">
            {[
              { label: 'Nouveau deal', desc: 'Quand un deal est cree ou deplace', checked: true },
              { label: 'Nouveau contact', desc: 'Quand un contact est ajoute', checked: true },
              { label: 'Devis accepte', desc: 'Quand un client accepte un devis', checked: true },
              { label: 'Rappels', desc: 'Rappels de taches et rendez-vous', checked: true },
              { label: 'Rapports hebdomadaires', desc: 'Resume des KPIs chaque lundi', checked: false },
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
          <h2 className="text-lg font-semibold text-surface-900">Securite</h2>
          <p className="mt-1 text-sm text-surface-500">Gerez la securite de votre compte.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Mot de passe actuel</label>
              <input
                type="password"
                placeholder="********"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">Nouveau mot de passe</label>
              <input
                type="password"
                placeholder="Min. 8 caracteres"
                className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <button className="mt-6 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Changer le mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}
