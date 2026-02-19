'use client';

import { useState, useMemo } from 'react';
import { Button, Modal } from '@/components/ui';

const contacts = [
  {
    id: 1,
    nom: 'Marie Lefebvre',
    email: 'marie.lefebvre@innovatech.fr',
    telephone: '+33 6 12 34 56 78',
    entreprise: 'InnovaTech',
    type: 'Client',
    score: 'hot',
    dernierContact: '19 févr. 2026',
  },
  {
    id: 2,
    nom: 'Pierre Dupont',
    email: 'p.dupont@batigroupe.fr',
    telephone: '+33 6 98 76 54 32',
    entreprise: 'BatiGroupe',
    type: 'Client',
    score: 'hot',
    dernierContact: '18 févr. 2026',
  },
  {
    id: 3,
    nom: 'Sophie Bernard',
    email: 'sophie.bernard@digicom.fr',
    telephone: '+33 7 11 22 33 44',
    entreprise: 'DigiCom',
    type: 'Prospect',
    score: 'warm',
    dernierContact: '17 févr. 2026',
  },
  {
    id: 4,
    nom: 'Jean Martin',
    email: 'jmartin@acmecorp.fr',
    telephone: '+33 6 55 66 77 88',
    entreprise: 'AcmeCorp',
    type: 'Lead',
    score: 'cold',
    dernierContact: '15 févr. 2026',
  },
  {
    id: 5,
    nom: 'Claire Rousseau',
    email: 'c.rousseau@luxehotels.fr',
    telephone: '+33 6 44 55 66 77',
    entreprise: 'LuxeHotels',
    type: 'Client',
    score: 'hot',
    dernierContact: '14 févr. 2026',
  },
  {
    id: 6,
    nom: 'Thomas Moreau',
    email: 'thomas.moreau@greenlogistics.fr',
    telephone: '+33 7 22 33 44 55',
    entreprise: 'GreenLogistics',
    type: 'Prospect',
    score: 'warm',
    dernierContact: '12 févr. 2026',
  },
  {
    id: 7,
    nom: 'Isabelle Petit',
    email: 'isabelle.petit@mediasud.fr',
    telephone: '+33 6 33 44 55 66',
    entreprise: 'MediaSud',
    type: 'Lead',
    score: 'cold',
    dernierContact: '10 févr. 2026',
  },
  {
    id: 8,
    nom: 'Nicolas Garnier',
    email: 'n.garnier@techvision.fr',
    telephone: '+33 7 66 77 88 99',
    entreprise: 'TechVision',
    type: 'Prospect',
    score: 'warm',
    dernierContact: '8 févr. 2026',
  },
];

const emptyForm = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  entreprise: '',
  type: 'prospect',
  notes: '',
};

function ScoreBadge({ score }: { score: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    hot: { label: 'Chaud', classes: 'bg-accent-emerald/10 text-accent-emerald' },
    warm: { label: 'Tiède', classes: 'bg-accent-amber/10 text-accent-amber' },
    cold: { label: 'Froid', classes: 'bg-surface-100 text-surface-800' },
  };
  const { label, classes } = config[score] || config.cold;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, string> = {
    Client: 'bg-brand-100 text-brand-700',
    Prospect: 'bg-accent-violet/10 text-accent-violet',
    Lead: 'bg-accent-amber/10 text-accent-amber',
    Fournisseur: 'bg-accent-emerald/10 text-accent-emerald',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[type] || 'bg-surface-100 text-surface-800'}`}>
      {type}
    </span>
  );
}

export default function ContactsPage() {
  const [showNewContact, setShowNewContact] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Type filter
      if (typeFilter !== 'all' && contact.type.toLowerCase() !== typeFilter) {
        return false;
      }
      // Search filter on name, email, company
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          contact.nom.toLowerCase().includes(q) ||
          contact.email.toLowerCase().includes(q) ||
          (contact.entreprise && contact.entreprise.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, typeFilter]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    // Simulate API call
    console.log('Nouveau contact:', formData);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    setFormLoading(false);
    setSuccessMessage('Contact cree avec succes');

    setTimeout(() => {
      setShowNewContact(false);
      setFormData(emptyForm);
      setSuccessMessage('');
    }, 1500);
  }

  const inputClasses =
    'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  const labelClasses = 'block text-sm font-medium text-surface-700 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Contacts</h1>
        <Button onClick={() => setShowNewContact(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">Tous</option>
          <option value="client">Client</option>
          <option value="prospect">Prospect</option>
          <option value="lead">Lead</option>
          <option value="fournisseur">Fournisseur</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Nom
                </th>
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Email
                </th>
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Telephone
                </th>
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Score
                </th>
                <th className="text-left text-xs font-semibold text-surface-800 uppercase tracking-wider px-6 py-3">
                  Dernier contact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {contact.nom
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span className="text-sm font-medium text-surface-900">{contact.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-800">{contact.email}</td>
                  <td className="px-6 py-4 text-sm text-surface-800">{contact.telephone}</td>
                  <td className="px-6 py-4">
                    <TypeBadge type={contact.type} />
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={contact.score} />
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-800">{contact.dernierContact}</td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-surface-400">
                    Aucun contact ne correspond a votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between">
          <p className="text-sm text-surface-200">
            Affichage de <span className="font-medium text-surface-900">1</span> a{' '}
            <span className="font-medium text-surface-900">{filteredContacts.length}</span> sur{' '}
            <span className="font-medium text-surface-900">1 247</span> contacts
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors disabled:opacity-50" disabled>
              Precedent
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 border border-brand-500 rounded-lg">
              1
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
              2
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
              3
            </button>
            <span className="px-2 text-surface-200">...</span>
            <button className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
              156
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* New Contact Modal */}
      <Modal open={showNewContact} onClose={() => setShowNewContact(false)} title="Nouveau contact" size="lg">
        {successMessage ? (
          <div className="flex items-center gap-3 rounded-lg bg-accent-emerald/10 px-4 py-3 text-sm font-medium text-accent-emerald">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className={labelClasses}>Prenom</label>
                <input
                  id="prenom"
                  name="prenom"
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={handleFormChange}
                  placeholder="Ex: Marie"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="nom" className={labelClasses}>Nom</label>
                <input
                  id="nom"
                  name="nom"
                  type="text"
                  required
                  value={formData.nom}
                  onChange={handleFormChange}
                  placeholder="Ex: Lefebvre"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={labelClasses}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Ex: marie@exemple.fr"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="telephone" className={labelClasses}>Telephone</label>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={handleFormChange}
                  placeholder="Ex: +33 6 12 34 56 78"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="entreprise" className={labelClasses}>Entreprise</label>
                <input
                  id="entreprise"
                  name="entreprise"
                  type="text"
                  value={formData.entreprise}
                  onChange={handleFormChange}
                  placeholder="Ex: InnovaTech"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="type" className={labelClasses}>Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className={inputClasses}
                >
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                  <option value="lead">Lead</option>
                  <option value="fournisseur">Fournisseur</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className={labelClasses}>Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleFormChange}
                placeholder="Notes supplementaires..."
                className={inputClasses}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewContact(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={formLoading}>
                Creer le contact
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
