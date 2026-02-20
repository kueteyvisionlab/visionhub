'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, Modal } from '@/components/ui';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: number;
  type: 'particulier' | 'entreprise';
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  score: 'hot' | 'warm' | 'cold';
  last_contact_at: string | null;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ContactsResponse {
  data: Contact[];
  pagination: PaginationData;
}

const emptyForm = {
  type: 'particulier' as 'particulier' | 'entreprise',
  first_name: '',
  last_name: '',
  company_name: '',
  email: '',
  phone: '',
  preferred_channel: 'email' as 'email' | 'phone' | 'sms',
  tags: [] as string[],
  gdpr_consent: false,
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
    Particulier: 'bg-brand-100 text-brand-700',
    Entreprise: 'bg-accent-violet/10 text-accent-violet',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[type] || 'bg-surface-100 text-surface-800'}`}>
      {type}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

function getDisplayName(contact: Contact): string {
  if (contact.type === 'entreprise' && contact.company_name) {
    return contact.company_name;
  }
  return `${contact.first_name} ${contact.last_name}`.trim() || 'Sans nom';
}

function getInitials(contact: Contact): string {
  if (contact.type === 'entreprise' && contact.company_name) {
    return contact.company_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
  const firstInitial = contact.first_name?.[0] || '';
  const lastInitial = contact.last_name?.[0] || '';
  return (firstInitial + lastInitial).toUpperCase() || '?';
}

export default function ContactsPage() {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewContact, setShowNewContact] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await apiGet<ContactsResponse>(
        `/contacts?${params.toString()}`,
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data;
      setContacts(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, currentPage, debouncedSearch, typeFilter, pagination.limit]);

  // Fetch contacts on mount and when filters change
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;

    setFormLoading(true);
    try {
      // Prepare payload for API
      const payload = {
        type: formData.type,
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        preferred_channel: formData.preferred_channel,
        tags: formData.tags,
        gdpr_consent: formData.gdpr_consent,
      };

      await apiPost('/contacts', payload, session.access_token);

      setSuccessMessage('Contact créé avec succès');

      // Refresh the contacts list
      setTimeout(() => {
        setShowNewContact(false);
        setFormData(emptyForm);
        setSuccessMessage('');
        fetchContacts();
      }, 1500);
    } catch (error) {
      console.error('Error creating contact:', error);
      setSuccessMessage('');
    } finally {
      setFormLoading(false);
    }
  }

  function handlePreviousPage() {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }

  function handlePageClick(page: number) {
    setCurrentPage(page);
  }

  // Generate page numbers to display
  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    const totalPages = pagination.totalPages;
    const current = currentPage;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }

  const inputClasses =
    'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  const labelClasses = 'block text-sm font-medium text-surface-700 mb-1';

  const startRecord = contacts.length > 0 ? (currentPage - 1) * pagination.limit + 1 : 0;
  const endRecord = Math.min(currentPage * pagination.limit, pagination.total);

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
          <option value="particulier">Particulier</option>
          <option value="entreprise">Entreprise</option>
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
                  Téléphone
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-surface-400">
                    Chargement...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-surface-400">
                    Aucun contact ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {getInitials(contact)}
                        </div>
                        <span className="text-sm font-medium text-surface-900 hover:text-brand-600">
                          {getDisplayName(contact)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-800">{contact.email}</td>
                    <td className="px-6 py-4 text-sm text-surface-800">{contact.phone || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <TypeBadge type={contact.type === 'particulier' ? 'Particulier' : 'Entreprise'} />
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBadge score={contact.score} />
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-800">
                      {formatDate(contact.last_contact_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between">
          <p className="text-sm text-surface-200">
            Affichage de <span className="font-medium text-surface-900">{startRecord}</span> à{' '}
            <span className="font-medium text-surface-900">{endRecord}</span> sur{' '}
            <span className="font-medium text-surface-900">{pagination.total}</span> contacts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-surface-200">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageClick(pageNum)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${
                    pageNum === currentPage
                      ? 'text-white bg-brand-500 border border-brand-500'
                      : 'text-surface-800 bg-white border border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={handleNextPage}
              disabled={currentPage === pagination.totalPages || loading || pagination.totalPages === 0}
              className="px-3 py-1.5 text-sm font-medium text-surface-800 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
            <div>
              <label htmlFor="type" className={labelClasses}>Type de contact</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                className={inputClasses}
              >
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className={labelClasses}>Prénom</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleFormChange}
                  placeholder="Ex: Marie"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="last_name" className={labelClasses}>Nom</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleFormChange}
                  placeholder="Ex: Lefebvre"
                  className={inputClasses}
                />
              </div>
            </div>

            {formData.type === 'entreprise' && (
              <div>
                <label htmlFor="company_name" className={labelClasses}>Nom de l'entreprise</label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleFormChange}
                  placeholder="Ex: InnovaTech"
                  className={inputClasses}
                />
              </div>
            )}

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
                <label htmlFor="phone" className={labelClasses}>Téléphone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Ex: +33 6 12 34 56 78"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label htmlFor="preferred_channel" className={labelClasses}>Canal préféré</label>
              <select
                id="preferred_channel"
                name="preferred_channel"
                value={formData.preferred_channel}
                onChange={handleFormChange}
                className={inputClasses}
              >
                <option value="email">Email</option>
                <option value="phone">Téléphone</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="gdpr_consent"
                name="gdpr_consent"
                type="checkbox"
                checked={formData.gdpr_consent}
                onChange={handleFormChange}
                className="w-4 h-4 rounded border-surface-200 text-brand-500 focus:ring-2 focus:ring-brand-500"
              />
              <label htmlFor="gdpr_consent" className="text-sm text-surface-700">
                Consentement RGPD obtenu
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewContact(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={formLoading}>
                Créer le contact
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
