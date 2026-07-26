/**
 * Campaign Detail Client Component
 * Full campaign view with content management, scheduling, and metrics
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CampaignForm } from '@/components/campaigns';
import { Button, LoadingSpinner, EmptyState, StatusBadge, FormField } from '@/components/ui';
import { useCampaign } from '@/hooks/useCampaign';
import { useSeries } from '@/hooks/useSeries';
import { useAuth } from '@/components/providers/AuthProvider';
import { Campaign, CampaignContentType, UpdateCampaignInput } from '@/types/campaign';
import styles from '@/styles/Campaign.module.css';

interface CampaignDetailProps {
  readonly campaignId: string;
}

export default function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const router = useRouter();
  const {
    getCampaign,
    updateCampaign,
    deleteCampaign,
    addContent,
    updateContent,
    removeContent,
    togglePlatform,
    updateStatus,
    pauseCampaign,
    resumeCampaign,
    isLoading,
  } = useCampaign();

  const { series } = useSeries();
  const { isAuthenticated } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    body: '',
    type: 'standalone' as CampaignContentType,
  });
  const [editingContent, setEditingContent] = useState<{
    id: string;
    title: string;
    body: string;
    type: CampaignContentType;
  } | null>(null);

  useEffect(() => {
    const found = getCampaign(campaignId);
    setCampaign(found);
  }, [campaignId, getCampaign]);

  // Show loading state while data is being loaded from localStorage
  if (isLoading) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <LoadingSpinner size="lg" />
            <p className={styles.loadingText}>Loading campaign...</p>
          </div>
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <div className={styles.container}>
          <EmptyState
            variant="error"
            title="Campaign not found"
            description="The campaign you're looking for doesn't exist or has been deleted."
            action={{
              label: 'Back to Campaigns',
              onClick: () => router.push('/campaigns'),
            }}
          />
        </div>
      </>
    );
  }

  const linkedSeries = series.filter(s => campaign.seriesIds.includes(s.id));

  const handleUpdateCampaign = (data: UpdateCampaignInput) => {
    const updated = updateCampaign(campaignId, data);
    if (updated) {
      setCampaign(updated);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (globalThis.confirm('Are you sure you want to delete this campaign?')) {
      const success = deleteCampaign(campaignId);
      if (success) {
        router.push('/campaigns');
      } else {
        globalThis.alert('Failed to delete campaign. Please try again.');
      }
    }
  };

  const handleAddContent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newContent.title.trim();
    const trimmedBody = newContent.body.trim();
    if (trimmedTitle && trimmedBody) {
      const updated = addContent(campaignId, {
        type: newContent.type,
        title: trimmedTitle,
        body: trimmedBody,
        adaptations: [],
      });
      if (updated) {
        setCampaign(updated);
      }
      setNewContent({ title: '', body: '', type: 'standalone' });
      setShowAddContent(false);
    }
  };

  const handleRemoveContent = (contentId: string) => {
    if (globalThis.confirm('Remove this content from the campaign?')) {
      const updated = removeContent(campaignId, contentId);
      if (updated) {
        setCampaign(updated);
      }
    }
  };

  const handleStartEditContent = (item: {
    id: string;
    title: string;
    body: string;
    type: CampaignContentType;
  }) => {
    setEditingContent({
      id: item.id,
      title: item.title,
      body: item.body,
      type: item.type,
    });
    setShowAddContent(false);
  };

  const handleSaveEditContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;

    const trimmedTitle = editingContent.title.trim();
    const trimmedBody = editingContent.body.trim();
    if (trimmedTitle && trimmedBody) {
      const updated = updateContent(campaignId, editingContent.id, {
        title: trimmedTitle,
        body: trimmedBody,
        type: editingContent.type,
      });
      if (updated) {
        setCampaign(updated);
      }
      setEditingContent(null);
    }
  };

  const handleCancelEditContent = () => {
    setEditingContent(null);
  };

  const handleTogglePlatform = (platformId: string) => {
    const updated = togglePlatform(campaignId, platformId);
    if (updated) {
      setCampaign(updated);
    }
  };

  const handleStatusAction = () => {
    let updated;
    if (campaign.status === 'paused') {
      updated = resumeCampaign(campaignId);
    } else if (campaign.status === 'active' || campaign.status === 'scheduled') {
      updated = pauseCampaign(campaignId);
    } else if (campaign.status === 'draft') {
      updated = updateStatus(campaignId, 'active');
    }
    if (updated) {
      setCampaign(updated);
    }
  };

  /**
   * Get the action button label based on campaign status
   */
  const getStatusActionLabel = (): string => {
    if (campaign.status === 'paused') return 'Resume';
    if (campaign.status === 'draft') return 'Activate';
    return 'Pause';
  };

  /**
   * Check if the status action button should be shown
   */
  const showStatusActionButton =
    campaign.status === 'draft' ||
    campaign.status === 'active' ||
    campaign.status === 'scheduled' ||
    campaign.status === 'paused';

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerActions}>
          <div>
            <Link href="/campaigns" className={styles.navLink}>
              ← Back to Campaigns
            </Link>
            <h1 className={styles.pageTitle} style={{ marginTop: '1rem' }}>
              {campaign.name}
            </h1>
            <div className={styles.statusRow}>
              <StatusBadge status={campaign.status} />
              <span className={styles.lastUpdated}>
                Last updated:{' '}
                {new Date(campaign.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
          {isAuthenticated && (
            <div className={styles.actionButtons}>
              {showStatusActionButton ? (
                <Button variant="secondary" onClick={handleStatusAction}>
                  {getStatusActionLabel()}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                leftIcon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                }
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                leftIcon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                }
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        {campaign.description ? (
          <p className={styles.pageDescription}>{campaign.description}</p>
        ) : null}

        {isEditing ? (
          <CampaignForm
            initialData={campaign}
            onSubmit={data => handleUpdateCampaign(data as UpdateCampaignInput)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            {/* Metrics Summary */}
            <div className={styles.campaignCard} style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Campaign Metrics</h3>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{campaign.metrics.totalPosts}</span>
                  <span className={styles.metricLabel}>Total Posts</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{campaign.metrics.publishedPosts}</span>
                  <span className={styles.metricLabel}>Published</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{campaign.metrics.scheduledPosts}</span>
                  <span className={styles.metricLabel}>Scheduled</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{campaign.metrics.failedPosts}</span>
                  <span className={styles.metricLabel}>Failed</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{campaign.metrics.totalEngagement}</span>
                  <span className={styles.metricLabel}>Total Engagement</span>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div className={styles.campaignCard} style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Target Platforms</h3>
              <div className={styles.platformSelection}>
                {campaign.platforms.map(platform => (
                  <button
                    key={platform.platformId}
                    type="button"
                    className={`${styles.platformOption} ${platform.enabled ? styles.selected : ''}`}
                    onClick={() => handleTogglePlatform(platform.platformId)}
                    aria-pressed={platform.enabled}
                    style={{ cursor: 'pointer' }}
                  >
                    <span
                      className={styles.platformLogo}
                      style={{
                        backgroundColor: platform.enabled ? '#4f46e5' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: platform.enabled ? 'white' : '#666',
                        fontWeight: 'bold',
                      }}
                    >
                      {platform.platformName.charAt(0)}
                    </span>
                    <span className={styles.platformName}>{platform.platformName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Linked Series */}
            {linkedSeries.length > 0 ? (
              <div className={styles.campaignCard} style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Linked Content Series</h3>
                <div className={styles.seriesSelection}>
                  {linkedSeries.map(s => (
                    <div key={s.id} className={styles.seriesOption}>
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.title}</div>
                        {s.description ? (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>{s.description}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Content Items */}
            <div className={styles.campaignCard}>
              <div className={styles.sectionHeader}>
                <h3>Campaign Content</h3>
                {isAuthenticated && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddContent(true)}
                    leftIcon={
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    }
                  >
                    Add Content
                  </Button>
                )}
              </div>

              {showAddContent ? (
                <form onSubmit={handleAddContent} className={styles.addContentForm}>
                  <FormField label="Title" required>
                    <input
                      type="text"
                      value={newContent.title}
                      onChange={e => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                      className={styles.formInput}
                      placeholder="Content title"
                    />
                  </FormField>
                  <FormField label="Content Type">
                    <select
                      value={newContent.type}
                      onChange={e =>
                        setNewContent(prev => ({
                          ...prev,
                          type: e.target.value as CampaignContentType,
                        }))
                      }
                      className={styles.formSelect}
                    >
                      <option value="standalone">Standalone Post</option>
                      <option value="series-article">Series Article</option>
                      <option value="thread">Thread</option>
                      <option value="announcement">Announcement</option>
                    </select>
                  </FormField>
                  <FormField label="Body" required>
                    <textarea
                      value={newContent.body}
                      onChange={e => setNewContent(prev => ({ ...prev, body: e.target.value }))}
                      className={styles.formTextarea}
                      placeholder="Write your content..."
                      rows={4}
                    />
                  </FormField>
                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddContent(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Add Content
                    </Button>
                  </div>
                </form>
              ) : null}

              {campaign.contentItems.length === 0 ? (
                <EmptyState
                  icon={
                    <svg
                      width="48"
                      height="48"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  }
                  title="No content yet"
                  description="Add content to start building your campaign."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {campaign.contentItems.map(item =>
                    editingContent?.id === item.id ? (
                      <form
                        key={item.id}
                        onSubmit={handleSaveEditContent}
                        className={styles.addContentForm}
                      >
                        <FormField label="Title" required>
                          <input
                            type="text"
                            value={editingContent.title}
                            onChange={e =>
                              setEditingContent(prev =>
                                prev ? { ...prev, title: e.target.value } : null
                              )
                            }
                            className={styles.formInput}
                            placeholder="Content title"
                          />
                        </FormField>
                        <FormField label="Content Type">
                          <select
                            value={editingContent.type}
                            onChange={e =>
                              setEditingContent(prev =>
                                prev
                                  ? { ...prev, type: e.target.value as CampaignContentType }
                                  : null
                              )
                            }
                            className={styles.formSelect}
                          >
                            <option value="standalone">Standalone Post</option>
                            <option value="series-article">Series Article</option>
                            <option value="thread">Thread</option>
                            <option value="announcement">Announcement</option>
                          </select>
                        </FormField>
                        <FormField label="Body" required>
                          <textarea
                            value={editingContent.body}
                            onChange={e =>
                              setEditingContent(prev =>
                                prev ? { ...prev, body: e.target.value } : null
                              )
                            }
                            className={styles.formTextarea}
                            placeholder="Write your content..."
                            rows={6}
                          />
                        </FormField>
                        <div className={styles.formActions}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancelEditContent}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" variant="primary">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div
                        key={item.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div>
                            <h4 style={{ margin: 0 }}>{item.title}</h4>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#666',
                                textTransform: 'capitalize',
                              }}
                            >
                              {item.type.replace('-', ' ')}
                            </span>
                          </div>
                          {isAuthenticated && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleStartEditContent(item)}
                                className={styles.iconButton}
                                title="Edit content"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRemoveContent(item.id)}
                                className={`${styles.iconButton} ${styles.dangerButton}`}
                                title="Remove content"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                        <p
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {item.body.length > 200 ? `${item.body.substring(0, 200)}...` : item.body}
                        </p>
                        {item.adaptations.length > 0 ? (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#666',
                            }}
                          >
                            {item.adaptations.length} platform adaptation
                            {item.adaptations.length === 1 ? '' : 's'}
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className={styles.navigationLinks}>
          <Link href="/campaigns" className={styles.navLink}>
            ← Back to Campaigns
          </Link>
          <Link href="/series" className={styles.navLink}>
            Manage Series →
          </Link>
        </div>
      </div>
    </>
  );
}
