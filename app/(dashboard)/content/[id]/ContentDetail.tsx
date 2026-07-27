'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  formatContentDate,
  getContentStatusLabel,
  loadStoredContent,
  synchronizeContentStatuses,
  type SchedulerJobSnapshot,
  type StoredContent,
} from '@/lib/content/local-content';
import styles from '@/styles/ContentDetail.module.css';

interface ContentDetailProps {
  readonly contentId: string;
}

function getStatusClass(status: StoredContent['status']): string {
  switch (status) {
    case 'published':
      return styles.statusPublished;
    case 'failed':
      return styles.statusFailed;
    case 'scheduled':
    case 'queued':
    case 'processing':
      return styles.statusScheduled;
    default:
      return styles.statusDraft;
  }
}

export default function ContentDetail({ contentId }: ContentDetailProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState<StoredContent | null | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const stored = loadStoredContent().find(item => item.id === contentId) ?? null;
    setContent(stored);

    if (!stored || !isAuthenticated) return;

    let active = true;
    void fetch('/api/scheduler?limit=100')
      .then(async response => {
        if (!response.ok) return;
        const payload = (await response.json()) as { jobs?: SchedulerJobSnapshot[] };
        const synchronized = synchronizeContentStatuses([stored], payload.jobs ?? [])[0];
        if (active) setContent(synchronized);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [contentId, isAuthenticated]);

  if (isLoading || content === undefined)
    return <LoadingSpinner size="lg" label="Loading content..." />;
  if (!isAuthenticated) return null;

  if (!content) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p className={styles.eyebrow}>Content details</p>
          <h1>That post is not available in this session.</h1>
          <p>Return to your content list or create a new post.</p>
          <div className={styles.actions}>
            <Link href="/content" className={styles.secondaryButton}>
              Back to content
            </Link>
            <Link href="/content/new" className={styles.primaryButton}>
              Create new
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const platforms = content.platforms.filter(platform => platform.enabled);
  const hasSchedule =
    content.status === 'scheduled' ||
    content.status === 'queued' ||
    content.status === 'processing';

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/content" className={styles.backLink}>
          ← All content
        </Link>
        <Link href="/content/new" className={styles.primaryButton}>
          + Create new
        </Link>
      </div>

      <section className={styles.header} aria-labelledby="content-title">
        <div>
          <p className={styles.eyebrow}>Content details</p>
          <h1 id="content-title">{content.title || 'Untitled'}</h1>
          <p className={styles.summary}>
            {content.summary || 'Review the post before its next publishing step.'}
          </p>
        </div>
        <span className={`${styles.status} ${getStatusClass(content.status)}`}>
          {getContentStatusLabel(content.status, content.schedulerJobIds)}
        </span>
      </section>

      <section className={styles.statusPanel} aria-label="Publishing status">
        <div>
          <p className={styles.panelLabel}>{hasSchedule ? 'Publishing time' : 'Created'}</p>
          <p className={styles.panelValue}>
            {hasSchedule
              ? formatContentDate(content.scheduledTime, true)
              : formatContentDate(content.createdAt, true)}
          </p>
        </div>
        <div>
          <p className={styles.panelLabel}>Destinations</p>
          <p className={styles.panelValue}>
            {platforms.length} platform{platforms.length === 1 ? '' : 's'}
          </p>
        </div>
        <div>
          <p className={styles.panelLabel}>Length</p>
          <p className={styles.panelValue}>{content.body.length} characters</p>
        </div>
      </section>

      <section className={styles.detailCard} aria-labelledby="post-copy-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Post copy</p>
            <h2 id="post-copy-heading">Ready for review</h2>
          </div>
          <span className={styles.characterCount}>{content.body.length} characters</span>
        </div>
        <p className={styles.postBody}>{content.body || 'No post copy was saved.'}</p>
      </section>

      <section className={styles.detailCard} aria-labelledby="destinations-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Destinations</p>
            <h2 id="destinations-heading">Selected platforms</h2>
          </div>
        </div>
        {platforms.length > 0 ? (
          <ul className={styles.platformList}>
            {platforms.map(platform => (
              <li key={platform.slug} className={styles.platformItem}>
                <span className={styles.platformInitial} aria-hidden="true">
                  {platform.name.charAt(0)}
                </span>
                <span>{platform.name}</span>
                {platform.hashtags ? (
                  <span className={styles.hashtags}>{platform.hashtags}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyPlatforms}>
            No publishing platforms were selected for this post.
          </p>
        )}
      </section>
    </div>
  );
}
