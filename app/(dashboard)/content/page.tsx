/**
 * Content List Page
 * Displays created content with status badges and navigation to create/edit.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  formatContentDate,
  fetchAllSchedulerJobs,
  getContentStatusLabel,
  loadStoredContent,
  synchronizeContentStatuses,
  type ContentStatus,
  type StoredContent,
} from '@/lib/content/local-content';
import styles from '@/styles/ContentList.module.css';

// ── Constants ───────────────────────────────────────────────────────────────

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBadgeClass(status: ContentStatus): string {
  switch (status) {
    case 'published':
      return styles.badgePublished;
    case 'scheduled':
    case 'queued':
    case 'processing':
      return styles.badgeScheduled;
    default:
      return styles.badgeDraft;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<StoredContent[]>([]);
  const { track, events } = useAnalytics();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setItems(loadStoredContent());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    void fetchAllSchedulerJobs(controller.signal)
      .then(jobs => {
        if (!controller.signal.aborted)
          setItems(previous => synchronizeContentStatuses(previous, jobs));
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [isAuthenticated]);

  const handleItemClick = useCallback(
    (item: StoredContent) => {
      track(events.FEATURE_USED, { featureName: 'content_view', context: item.id });
    },
    [track, events]
  );

  if (isLoading) return <LoadingSpinner size="lg" label="Loading..." />;
  if (!isAuthenticated) return null;

  // ── Empty state ─────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Content</h1>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            &#9998;
          </div>
          <h2 className={styles.emptyTitle}>No content yet</h2>
          <p className={styles.emptyDescription}>
            Create your first piece of content and publish it across multiple platforms in minutes.
          </p>
          <Link href="/content/new" className={styles.createButton}>
            + Create New Content
          </Link>
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Content</h1>
        <Link href="/content/new" className={styles.createButton}>
          + Create New
        </Link>
      </div>

      <div className={styles.contentList}>
        {items.map(item => {
          const enabledPlatforms = item.platforms.filter(p => p.enabled);
          return (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className={styles.contentItem}
              aria-label={`View details for ${item.title || 'untitled content'}`}
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.contentItemInfo}>
                <h3 className={styles.contentItemTitle}>{item.title || 'Untitled'}</h3>
                <div className={styles.contentItemMeta}>
                  <span>{formatContentDate(item.createdAt)}</span>
                  {item.body && <span>{item.body.length} chars</span>}
                </div>
              </div>
              <div className={styles.contentItemRight}>
                {enabledPlatforms.length > 0 && (
                  <span className={styles.platformCount}>
                    {enabledPlatforms.length} platform{enabledPlatforms.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className={getBadgeClass(item.status)}>
                  {getContentStatusLabel(item.status, item.schedulerJobIds)}
                </span>
                <span className={styles.viewDetails} aria-hidden="true">
                  View details →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default ContentListPage;
