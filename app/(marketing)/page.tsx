/**
 * Landing Page — CRO-optimized for conversion
 * Server component with minimal client islands (ScrollLink)
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { ScrollLink } from '@/components/ui/ScrollLink';
import styles from '@/styles/Landing.module.css';

export const metadata: Metadata = {
  title: 'OmniPost — Publish Once. Reach Every Platform.',
  description:
    'AI-powered content publishing for creators who want to grow everywhere — without the busywork. Publish to Facebook, Instagram, LinkedIn, and Twitter from one place.',
  keywords: [
    'omnipost',
    'multi-platform publishing',
    'content creation',
    'AI content',
    'social media management',
    'content scheduling',
    'social media automation',
  ],
  openGraph: {
    title: 'OmniPost — Publish Once. Reach Every Platform.',
    description:
      'AI-powered content publishing for creators who want to grow everywhere — without the busywork.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.headline}>
            Publish Once. Reach <span className={styles.gradText}>Every Platform</span>.
          </h1>
          <p className={styles.subheadline}>
            AI-powered content publishing for creators who want to grow everywhere &mdash; without
            the busywork.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.ctaPrimary}>
              Start Publishing Free
            </Link>
            <ScrollLink targetId="features" className={styles.ctaSecondary}>
              See How It Works
            </ScrollLink>
          </div>

          <div className={styles.platformIcons} aria-label="Supported platforms">
            <span className={styles.platformIcon}>
              <span className={styles.platformBadge} aria-hidden="true">
                f
              </span>
              <span>Facebook</span>
            </span>
            <span className={styles.platformIcon}>
              <span className={styles.platformBadge} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span>Instagram</span>
            </span>
            <span className={styles.platformIcon}>
              <span className={styles.platformBadge} aria-hidden="true">
                in
              </span>
              <span>LinkedIn</span>
            </span>
            <span className={styles.platformIcon}>
              <span className={styles.platformBadge} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </span>
              <span>Twitter</span>
            </span>
          </div>
        </div>
      </section>

      {/* ---- Problem ---- */}
      <section className={`${styles.section} ${styles.problemSection}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Tired of copying and pasting across 5 platforms?</h2>
          <p className={styles.sectionSubtitle}>
            Managing multiple channels manually is slow, error-prone, and unsustainable.
          </p>

          <div className={styles.painPoints}>
            <article className={styles.painPoint}>
              <h3>Hours Lost Reformatting</h3>
              <p>
                Every platform has different character limits, image sizes, and hashtag rules. You
                end up editing the same post four times.
              </p>
            </article>
            <article className={styles.painPoint}>
              <h3>Inconsistent Posting Schedule</h3>
              <p>
                Without a unified queue, posts slip through the cracks and your audience engagement
                drops.
              </p>
            </article>
            <article className={styles.painPoint}>
              <h3>No Unified Analytics</h3>
              <p>
                Jumping between dashboards to piece together performance data means you never see
                the full picture.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---- Features / Solution ---- */}
      <section id="features" className={`${styles.section} ${styles.featuresSection}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>One Tool. Every Channel. Zero Hassle.</h2>
          <p className={styles.sectionSubtitle}>
            OmniPost handles the busywork so you can focus on creating great content.
          </p>

          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="5" r="2.2" />
                  <circle cx="5" cy="19" r="2.2" />
                  <circle cx="19" cy="19" r="2.2" />
                  <path d="M12 7.2v6M12 13.2L6.6 17M12 13.2l5.4 3.8" />
                </svg>
              </div>
              <h3>Multi-Platform Publishing</h3>
              <p>
                Publish to Facebook, Instagram, LinkedIn, and Twitter from a single editor. One
                click, every platform.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
                  <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
                </svg>
              </div>
              <h3>AI Content Adaptation</h3>
              <p>
                Our AI automatically reformats your content for each platform&apos;s requirements —
                character limits, hashtags, and image crops.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3.2 2" />
                </svg>
              </div>
              <h3>Smart Scheduling</h3>
              <p>
                Queue content and publish at the times your audience is most active. Set it and
                forget it.
              </p>
            </article>

            <article className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 19V10M12 19V5M19 19v-6" />
                </svg>
              </div>
              <h3>Unified Analytics</h3>
              <p>
                See engagement, reach, and conversions across every platform in one dashboard. No
                more tab-switching.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---- Project Status ---- */}
      <section className={`${styles.section} ${styles.socialProofSection}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Early Access, Built in the Open</h2>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>Open Source</span>
              <span className={styles.metricLabel}>MIT Licensed</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>Alpha</span>
              <span className={styles.metricLabel}>First tester cohort</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>WIP</span>
              <span className={styles.metricLabel}>Publishing flow in progress</span>
            </div>
          </div>

          <div className={styles.statusNotes}>
            <article className={styles.statusNote}>
              <p className={styles.statusNoteText}>
                OmniPost is currently being shaped with direct tester feedback before public launch.
              </p>
              <p className={styles.statusNoteMeta}>
                <strong>Alpha note</strong> — Product status
              </p>
            </article>

            <article className={styles.statusNote}>
              <p className={styles.statusNoteText}>
                The focus is a practical first posting flow with AI-assisted wording for each
                platform.
              </p>
              <p className={styles.statusNoteMeta}>
                <strong>Current scope</strong> — Platform adaptation
              </p>
            </article>

            <article className={styles.statusNote}>
              <p className={styles.statusNoteText}>
                Metrics, scheduling depth, and advanced platform workflows will grow after the first
                live path is stable.
              </p>
              <p className={styles.statusNoteMeta}>
                <strong>Roadmap</strong> — Alpha readiness
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2>Ready to Publish Everywhere?</h2>
          <Link href="/signup" className={styles.ctaPrimary}>
            Start Publishing Free
          </Link>
          <div className={styles.trustSignals}>
            <span className={styles.trustSignal}>Free forever plan</span>
            <span className={styles.trustSignal}>No credit card required</span>
            <span className={styles.trustSignal}>Set up in 2 minutes</span>
          </div>
        </div>
      </section>
    </>
  );
}
