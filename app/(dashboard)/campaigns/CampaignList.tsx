/**
 * Campaign List Client Component
 * Handles interactive campaign management with Grid & Kanban Board views
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CampaignCard, CampaignForm, EmptyState } from '@/components/campaigns';
import { Button, LoadingSpinner } from '@/components/ui';
import { useCampaign } from '@/hooks/useCampaign';
import { useAuth } from '@/components/providers/AuthProvider';
import { Campaign, CampaignStatus, CreateCampaignInput } from '@/types/campaign';
import styles from '@/styles/Campaign.module.css';

const STATUS_FILTERS: { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
];

const KANBAN_STAGES: { label: string; status: CampaignStatus; icon: string }[] = [
  { label: 'Draft', status: 'draft', icon: '📝' },
  { label: 'Scheduled', status: 'scheduled', icon: '⏱️' },
  { label: 'Active', status: 'active', icon: '🚀' },
  { label: 'Paused', status: 'paused', icon: '⏸️' },
  { label: 'Completed', status: 'completed', icon: '✓' },
];

/**
 * Kanban Board Component
 */
function CampaignKanbanBoard({
  campaigns,
}: Readonly<{
  campaigns: Campaign[];
}>) {
  return (
    <div className={styles.kanbanBoard}>
      {KANBAN_STAGES.map(stage => {
        const stageCampaigns = campaigns.filter(c => c.status === stage.status);
        return (
          <div key={stage.status} className={styles.kanbanColumn}>
            <div className={styles.kanbanColumnHeader}>
              <span className={styles.kanbanColumnTitle}>
                <span>{stage.icon}</span> {stage.label}
              </span>
              <span className={styles.kanbanBadge}>{stageCampaigns.length}</span>
            </div>

            <div className={styles.kanbanCardsList}>
              {stageCampaigns.length === 0 ? (
                <div
                  style={{
                    padding: '1.5rem 0.5rem',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  No campaigns in {stage.label.toLowerCase()}
                </div>
              ) : (
                stageCampaigns.map(c => (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className={styles.kanbanCard}>
                    <h4 className={styles.kanbanCardTitle}>{c.name}</h4>
                    <div className={styles.kanbanPlatforms}>
                      {c.platforms && c.platforms.length > 0 ? (
                        c.platforms.map(p => (
                          <span key={p.platformId} className={styles.platformChip}>
                            {p.platformName}
                          </span>
                        ))
                      ) : (
                        <span className={styles.platformChip}>Multi-platform</span>
                      )}
                    </div>
                    <div className={styles.kanbanCardFooter}>
                      <span>{c.contentItems?.length || 0} contents</span>
                      <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders the campaign content based on viewMode, loading state and data
 */
function CampaignContent({
  isLoading,
  viewMode,
  campaigns,
  filteredCampaigns,
  onCreateClick,
  onClearFilter,
  onDelete,
  onDuplicate,
}: Readonly<{
  isLoading: boolean;
  viewMode: 'grid' | 'kanban';
  campaigns: Campaign[];
  filteredCampaigns: Campaign[];
  onCreateClick: () => void;
  onClearFilter: () => void;
  onDelete?: (id: string) => boolean;
  onDuplicate?: (id: string) => Campaign | null;
}>) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="lg" />
        <p className={styles.loadingText}>Loading campaigns...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  if (viewMode === 'kanban') {
    return <CampaignKanbanBoard campaigns={campaigns} />;
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No campaigns match the selected filter.</p>
        <Button variant="secondary" onClick={onClearFilter}>
          Clear Filter
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.campaignGrid}>
      {filteredCampaigns.map(campaign => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}

export default function CampaignList() {
  const { campaigns, isLoading, error, createCampaign, deleteCampaign, duplicateCampaign } =
    useCampaign();
  const { isAuthenticated } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

  const handleCreateCampaign = (data: CreateCampaignInput) => {
    createCampaign(data);
    setShowForm(false);
  };

  const filteredCampaigns =
    statusFilter === 'all' ? campaigns : campaigns.filter(c => c.status === statusFilter);

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Campaigns</h1>
        <p className={styles.pageDescription}>
          Create and manage multi-platform content distribution campaigns. Link your content series,
          schedule posts, design creative flyers in the studio, and track engagement across all
          platforms.
        </p>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        {!showForm && campaigns.length > 0 ? (
          <div className={styles.headerActions}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            >
              <div className={styles.viewModeToggle} role="group" aria-label="View Mode">
                <button
                  type="button"
                  className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.viewModeActive : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </button>
                <button
                  type="button"
                  className={`${styles.viewModeButton} ${viewMode === 'kanban' ? styles.viewModeActive : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban Pipeline
                </button>
              </div>

              {viewMode === 'grid' && (
                <div className={styles.filterGroup}>
                  {STATUS_FILTERS.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`${styles.filterButton} ${
                        statusFilter === filter.value ? styles.active : ''
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                leftIcon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                }
              >
                New Campaign
              </Button>
            )}
          </div>
        ) : null}

        {showForm ? (
          <CampaignForm onSubmit={handleCreateCampaign} onCancel={() => setShowForm(false)} />
        ) : null}

        <CampaignContent
          isLoading={isLoading}
          viewMode={viewMode}
          campaigns={campaigns}
          filteredCampaigns={filteredCampaigns}
          onCreateClick={() => setShowForm(true)}
          onClearFilter={() => setStatusFilter('all')}
          onDelete={isAuthenticated ? deleteCampaign : undefined}
          onDuplicate={isAuthenticated ? duplicateCampaign : undefined}
        />

        <div className={styles.navigationLinks}>
          <Link href="/series" className={styles.navLink}>
            ← Manage Content Series
          </Link>
          <Link href="/dashboard" className={styles.navLink}>
            View Dashboard →
          </Link>
        </div>
      </div>
    </>
  );
}
