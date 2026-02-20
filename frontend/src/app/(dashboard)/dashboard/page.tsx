'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import Link from 'next/link';

interface AnalyticsSummary {
  total_contacts: number;
  total_revenue: number;
  deals_open: number;
  deals_won_this_month: number;
  avg_deal_value: number;
  conversion_rate: number;
}

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface Stage {
  id: string;
  name: string;
  order: number;
  deals?: Deal[];
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string;
  contact?: {
    name: string;
  };
  updated_at: string;
}

export default function DashboardPage() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch analytics summary
        const { data: analyticsData, error: analyticsErr } = await apiGet<AnalyticsSummary>(
          '/analytics/summary',
          session.access_token
        );
        if (!analyticsErr && analyticsData) setAnalytics(analyticsData);

        // Fetch revenue chart data
        const { data: revenueResponse, error: revenueErr } = await apiGet<{ data: RevenueDataPoint[] }>(
          '/analytics/revenue',
          session.access_token
        );
        if (!revenueErr && revenueResponse?.data) {
          setRevenueData(revenueResponse.data.slice(-6));
        }

        // Fetch pipelines
        const { data: pipelinesData, error: pipelinesErr } = await apiGet<Pipeline[]>(
          '/pipelines',
          session.access_token
        );

        // Get first pipeline with details
        const pipelines = pipelinesErr ? [] : (pipelinesData || []);
        if (pipelines.length > 0) {
          const firstPipeline = pipelines[0];
          const { data: pipelineDetails } = await apiGet<Pipeline>(
            `/pipelines/${firstPipeline.id}`,
            session.access_token
          );
          if (pipelineDetails) setPipeline(pipelineDetails);

          // Fetch deals for activity feed
          const { data: dealsData } = await apiGet<{ data: Deal[] }>(
            `/deals?pipeline_id=${firstPipeline.id}`,
            session.access_token
          );
          const dealsList = dealsData?.data || [];
          if (dealsList.length > 0) {
            const sortedDeals = [...dealsList].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setDeals(sortedDeals.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.access_token]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Greeting name: prefer full_name from user metadata, fallback to email prefix
  const greetingName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Admin';

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else {
      return `Il y a ${diffDays}j`;
    }
  };

  // Helper function to get avatar color
  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-accent-emerald',
      'bg-accent-violet',
      'bg-brand-500',
      'bg-accent-amber',
      'bg-accent-rose',
    ];
    return colors[index % colors.length];
  };

  // Helper to format revenue amounts
  const formatRevenue = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M€`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} k€`;
    }
    return `${amount.toLocaleString('fr-FR')} €`;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-surface-100 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-surface-100 rounded animate-pulse mt-2"></div>
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-100 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 shadow-sm border border-surface-200"
            >
              <div className="h-4 w-24 bg-surface-100 rounded animate-pulse"></div>
              <div className="h-8 w-32 bg-surface-100 rounded animate-pulse mt-2"></div>
              <div className="h-4 w-28 bg-surface-100 rounded animate-pulse mt-3"></div>
            </div>
          ))}
        </div>

        {/* Revenue chart skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 h-72 animate-pulse"></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 h-96"></div>
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 h-96"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Bonjour, {greetingName}
          </h1>
          <p className="text-sm text-surface-200 mt-1 capitalize">{dateStr}</p>
        </div>
        <div className="bg-accent-rose/10 border border-accent-rose/20 rounded-xl p-6">
          <p className="text-accent-rose font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Build KPI cards from analytics data
  const kpiCards = analytics
    ? [
        {
          title: 'Contacts',
          value: analytics.total_contacts.toLocaleString('fr-FR'),
          change: `${analytics.conversion_rate.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}% taux de conversion`,
          changeType: 'positive' as const,
          bgColor: 'bg-accent-emerald/10',
          iconColor: 'text-accent-emerald',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          ),
        },
        {
          title: 'Deals en cours',
          value: analytics.deals_open.toLocaleString('fr-FR'),
          change: `${analytics.avg_deal_value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € valeur moyenne`,
          changeType: 'neutral' as const,
          bgColor: 'bg-accent-violet/10',
          iconColor: 'text-accent-violet',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          ),
        },
        {
          title: 'Deals gagnés',
          value: analytics.deals_won_this_month.toLocaleString('fr-FR'),
          change: `${analytics.conversion_rate.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}% taux acceptation`,
          changeType: 'positive' as const,
          bgColor: 'bg-accent-amber/10',
          iconColor: 'text-accent-amber',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          ),
        },
        {
          title: 'CA total',
          value: `${analytics.total_revenue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`,
          change: `${analytics.deals_won_this_month} deals ce mois`,
          changeType: 'positive' as const,
          bgColor: 'bg-accent-emerald/10',
          iconColor: 'text-accent-emerald',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          ),
        },
      ]
    : [];

  // Build recent activity from latest deals
  const recentActivity = deals.map((deal, index) => {
    const contactName = deal.contact?.name || 'Contact inconnu';
    const stageName = pipeline?.stages?.find((s) => s.id === deal.stage_id)?.name || 'Stage';

    return {
      initials: getInitials(contactName),
      name: contactName,
      action: 'a été déplacé vers',
      target: stageName,
      time: getTimeAgo(deal.updated_at),
      color: getAvatarColor(index),
    };
  });

  // Build pipeline columns from stages
  const pipelineColumns = pipeline?.stages
    ? [...pipeline.stages]
        .sort((a, b) => a.order - b.order)
        .map((stage) => {
          const stageDeals = stage.deals || [];
          const count = stageDeals.length;
          const totalAmount = stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

          // Determine colors based on stage name
          let color = 'bg-surface-200';
          let barColor = 'bg-surface-800';

          const stageLower = stage.name.toLowerCase();
          if (stageLower.includes('gagn') || stageLower.includes('won')) {
            color = 'bg-accent-emerald/20';
            barColor = 'bg-accent-emerald';
          } else if (stageLower.includes('négociation') || stageLower.includes('negociation')) {
            color = 'bg-accent-amber/20';
            barColor = 'bg-accent-amber';
          } else if (stageLower.includes('proposition') || stageLower.includes('proposal')) {
            color = 'bg-brand-100';
            barColor = 'bg-brand-500';
          }

          return {
            name: stage.name,
            count,
            amount: `${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`,
            color,
            barColor,
          };
        })
    : [];

  // Calculate max count for bar width calculation
  const maxCount = Math.max(...pipelineColumns.map((col) => col.count), 1);

  // Revenue chart calculations
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);

  // Quick action items
  const quickActions = [
    {
      label: 'Nouveau contact',
      href: '/contacts',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: 'Nouveau deal',
      href: '/deals',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: 'Nouveau devis',
      href: '/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: 'Voir analytiques',
      href: '/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          Bonjour, {greetingName}
        </h1>
        <p className="text-sm text-surface-200 mt-1 capitalize">{dateStr}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-surface-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-200">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-surface-900 group-hover:text-brand-500 transition-colors duration-200">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-surface-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-200">{card.title}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-sm mt-3 font-medium ${
              card.changeType === 'positive'
                ? 'text-accent-emerald'
                : card.changeType === 'neutral'
                ? 'text-accent-violet'
                : 'text-accent-rose'
            }`}>
              {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200">
        <div className="px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">Revenus mensuels</h2>
        </div>
        <div className="p-6">
          {revenueData.length > 0 ? (
            <div className="flex items-end gap-4 h-56">
              {revenueData.map((point) => {
                const heightPercent = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                return (
                  <div
                    key={point.month}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-full max-w-[60px] bg-brand-500 hover:bg-brand-600 rounded-t-md transition-colors duration-200 cursor-pointer relative group"
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        title={`${point.month}: ${point.revenue.toLocaleString('fr-FR')} €`}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-900 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          {formatRevenue(point.revenue)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-surface-200 truncate max-w-full">
                      {point.month}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-surface-200">
              Aucune donnée de revenus
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Activity + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200">
          <div className="px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">Activité récente</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full ${activity.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
                    {activity.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-900">
                      <span className="font-medium">{activity.name}</span>{' '}
                      {activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-surface-200 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-surface-200">
                Aucune activité récente
              </div>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200">
          <div className="px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">Pipeline</h2>
          </div>
          <div className="p-6 space-y-5">
            {pipelineColumns.length > 0 ? (
              pipelineColumns.map((col) => (
                <div key={col.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900">{col.name}</span>
                      <span className="text-xs font-medium bg-surface-100 text-surface-800 px-2 py-0.5 rounded-full">
                        {col.count}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-surface-900">{col.amount}</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${col.color}`}>
                    <div
                      className={`h-3 rounded-full ${col.barColor}`}
                      style={{ width: `${maxCount > 0 ? (col.count / maxCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-surface-200">
                Aucune donnée de pipeline
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
