/**
 * Campaign List Client Component
 * Handles interactive campaign management with CRUD operations
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

/**
 * Renders the campaign content based on loading state and data
 */
function CampaignContent({
  isLoading,
  campaigns,
  filteredCampaigns,
  onCreateClick,
  onClearFilter,
  onDelete,
  onDuplicate,
}: Readonly<{
  isLoading: boolean;
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
          schedule posts, and track engagement across all platforms.
        </p>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        {!showForm && campaigns.length > 0 ? (
          <div className={styles.headerActions}>
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
