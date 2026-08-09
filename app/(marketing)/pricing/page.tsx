/**
 * Pricing Page
 * Displays pricing tiers, feature comparison, and FAQ for OmniPost.
 * Uses monthly/annual billing toggle with pricing psychology best practices.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from '@/styles/Pricing.module.css';

/* ---------- Data Types ---------- */

interface PricingTier {
  name: string;
  target: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ComparisonRow {
  feature: string;
  free: string;
  pro: string;
  team: string;
  enterprise: string;
}

/* ---------- Data ---------- */

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    target: 'For getting started',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '2 connected platforms',
      '10 posts per month',
      'Basic analytics',
      'Standard formatting',
      'Community support',
    ],
    cta: 'Get Started Free',
    href: '/signup',
  },
  {
    name: 'Pro',
    target: 'For solo creators',
    monthlyPrice: 19,
    annualPrice: 190,
    features: [
      'Unlimited platforms',
      'Unlimited posts',
      'AI-powered formatting',
      'Advanced scheduling',
      'Full analytics dashboard',
      'Priority email support',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    target: 'For small teams',
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Client workspaces',
      'Shared content calendars',
      'Role-based permissions',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=team',
  },
];

const ENTERPRISE_FEATURES = ['SSO / SAML', 'API access', 'Dedicated support', 'Custom SLA'];

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Connected platforms',
    free: '2',
    pro: 'Unlimited',
    team: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Posts per month',
    free: '10',
    pro: 'Unlimited',
    team: 'Unlimited',
    enterprise: 'Unlimited',
  },
  { feature: 'AI formatting', free: '\u2014', pro: '\u2713', team: '\u2713', enterprise: '\u2713' },
  { feature: 'Scheduling', free: '\u2014', pro: '\u2713', team: '\u2713', enterprise: '\u2713' },
  { feature: 'Analytics', free: 'Basic', pro: 'Full', team: 'Full', enterprise: 'Full + custom' },
  {
    feature: 'Team collaboration',
    free: '\u2014',
    pro: '\u2014',
    team: '\u2713',
    enterprise: '\u2713',
  },
  {
    feature: 'Client workspaces',
    free: '\u2014',
    pro: '\u2014',
    team: '\u2713',
    enterprise: '\u2713',
  },
  {
    feature: 'Shared calendars',
    free: '\u2014',
    pro: '\u2014',
    team: '\u2713',
    enterprise: '\u2713',
  },
  { feature: 'SSO / SAML', free: '\u2014', pro: '\u2014', team: '\u2014', enterprise: '\u2713' },
  { feature: 'API access', free: '\u2014', pro: '\u2014', team: '\u2014', enterprise: '\u2713' },
  {
    feature: 'Dedicated support',
    free: '\u2014',
    pro: '\u2014',
    team: '\u2014',
    enterprise: '\u2713',
  },
  { feature: 'SLA', free: '\u2014', pro: '\u2014', team: '\u2014', enterprise: 'Custom' },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is there really a free plan?',
    answer:
      'Yes! The Free plan is free forever with no credit card required. It includes 2 platforms and 10 posts per month to help you get started.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer:
      'When you sign up for Pro or Team, you get full access to all features for 14 days. No credit card is required to start. If you decide not to continue, your account automatically reverts to the Free plan.',
  },
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Absolutely. You can upgrade, downgrade, or cancel at any time. When you upgrade, you get immediate access to new features. When you downgrade, the change takes effect at the end of your current billing period.',
  },
  {
    question: 'What happens to my content if I cancel?',
    answer:
      'Your content is always yours. If you cancel a paid plan, you retain access to all your published content. You can export your data at any time from account settings.',
  },
  {
    question: 'Do you offer discounts for nonprofits or education?',
    answer:
      'Yes, we offer 50% off Pro and Team plans for registered nonprofits and educational institutions. Contact our sales team with proof of status to get your discount applied.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) and process payments securely through Stripe. Annual plans can also be paid via invoice for Team and Enterprise tiers.',
  },
];

/* ---------- Helper ---------- */

function formatAnnualAsMonthly(annualPrice: number): string {
  return (annualPrice / 12).toFixed(2);
}

/* ---------- Sub-components ---------- */

function CheckIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 4.5L6.5 11.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingCard({
  tier,
  isAnnual,
  onPlanSelect,
}: {
  readonly tier: PricingTier;
  readonly isAnnual: boolean;
  readonly onPlanSelect?: (planName: string) => void;
}) {
  const isFree = tier.monthlyPrice === 0;
  const displayPrice = isFree
    ? 0
    : isAnnual
      ? Number(formatAnnualAsMonthly(tier.annualPrice))
      : tier.monthlyPrice;

  return (
    <div className={`${styles.card} ${tier.highlighted ? styles.cardHighlighted : ''}`}>
      {tier.highlighted && <span className={styles.popularBadge}>Most Popular</span>}
      <h3 className={styles.cardName}>{tier.name}</h3>
      <p className={styles.cardTarget}>{tier.target}</p>

      <div className={styles.priceWrapper}>
        <span className={styles.priceAmount}>{isFree ? '$0' : `$${displayPrice}`}</span>
        {!isFree && <span className={styles.pricePeriod}>/mo</span>}
        {!isFree && isAnnual && (
          <span className={styles.priceAnnualNote}>Billed annually (${tier.annualPrice}/yr)</span>
        )}
      </div>

      <ul className={styles.featureList}>
        {tier.features.map(feature => (
          <li key={feature} className={styles.featureItem}>
            <CheckIcon className={styles.featureIcon} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={tier.href}
        className={`${styles.ctaButton} ${tier.highlighted ? styles.ctaPrimary : styles.ctaSecondary}`}
        onClick={() => onPlanSelect?.(tier.name)}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

function FaqAccordionItem({ item }: { readonly item: FaqItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqQuestion}
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        type="button"
      >
        <span>{item.question}</span>
        <ChevronDownIcon
          className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
        />
      </button>
      {isOpen && <p className={styles.faqAnswer}>{item.answer}</p>}
    </div>
  );
}

/* ---------- Page Component ---------- */

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { track, events } = useAnalytics({ trackPageView: false });

  useEffect(() => {
    track(events.PRICING_PAGE_VIEWED, { source: 'direct' });
  }, [track, events]);

  const handlePlanSelect = (planName: string) => {
    track(events.PLAN_SELECTED, { planName, billingPeriod: isAnnual ? 'annual' : 'monthly' });
  };

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Simple, Transparent Pricing</h1>
          <p className={styles.subtitle}>
            Start free, scale as you grow. No surprises, no hidden fees.
          </p>
        </header>

        {/* Billing Toggle */}
        <div className={styles.toggleWrapper}>
          <span
            className={`${styles.toggleLabel} ${!isAnnual ? styles.toggleLabelActive : ''}`}
            onClick={() => setIsAnnual(false)}
            role="presentation"
          >
            Monthly
          </span>
          <button
            className={styles.toggle}
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual billing"
            onClick={() => setIsAnnual(prev => !prev)}
            type="button"
          >
            <span className={styles.toggleKnob} />
          </button>
          <span
            className={`${styles.toggleLabel} ${isAnnual ? styles.toggleLabelActive : ''}`}
            onClick={() => setIsAnnual(true)}
            role="presentation"
          >
            Annual
          </span>
          {isAnnual && <span className={styles.savingsBadge}>Save up to 17%</span>}
        </div>

        {/* Trust Signals */}
        <div className={styles.trustSignals} aria-label="Trust signals">
          <span className={styles.trustItem}>
            <span className={styles.trustIcon} aria-hidden="true">
              &#10003;
            </span>
            14-day free trial
          </span>
          <span className={styles.trustItem}>
            <span className={styles.trustIcon} aria-hidden="true">
              &#10003;
            </span>
            No credit card required
          </span>
          <span className={styles.trustItem}>
            <span className={styles.trustIcon} aria-hidden="true">
              &#10003;
            </span>
            Cancel anytime
          </span>
        </div>

        {/* Pricing Cards */}
        <div className={styles.cardsGrid}>
          {TIERS.map(tier => (
            <PricingCard
              key={tier.name}
              tier={tier}
              isAnnual={isAnnual}
              onPlanSelect={handlePlanSelect}
            />
          ))}
        </div>

        {/* Enterprise Row */}
        <div className={styles.enterpriseRow}>
          <div className={styles.enterpriseInfo}>
            <h3 className={styles.enterpriseName}>Enterprise</h3>
            <p className={styles.enterpriseDescription}>
              Need more? Custom solutions for large organizations with dedicated support and SLA
              guarantees.
            </p>
            <ul className={styles.enterpriseFeatures}>
              {ENTERPRISE_FEATURES.map(feature => (
                <li key={feature} className={styles.enterpriseFeatureItem}>
                  <CheckIcon className={styles.featureIcon} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.enterpriseCta}>
            <a
              href="mailto:sales@omnipost.dev"
              className={`${styles.ctaButton} ${styles.ctaOutline}`}
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <section className={styles.comparisonSection} aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className={styles.sectionTitle}>
            Compare Plans
          </h2>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Free</th>
                <th scope="col" className={styles.highlightCol}>
                  Pro
                </th>
                <th scope="col">Team</th>
                <th scope="col">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(row => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    {row.free === '\u2713' ? (
                      <span className={styles.checkMark} aria-label="Included">
                        &#10003;
                      </span>
                    ) : row.free === '\u2014' ? (
                      <span className={styles.dashMark} aria-label="Not included">
                        &mdash;
                      </span>
                    ) : (
                      row.free
                    )}
                  </td>
                  <td className={styles.highlightCol}>
                    {row.pro === '\u2713' ? (
                      <span className={styles.checkMark} aria-label="Included">
                        &#10003;
                      </span>
                    ) : row.pro === '\u2014' ? (
                      <span className={styles.dashMark} aria-label="Not included">
                        &mdash;
                      </span>
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td>
                    {row.team === '\u2713' ? (
                      <span className={styles.checkMark} aria-label="Included">
                        &#10003;
                      </span>
                    ) : row.team === '\u2014' ? (
                      <span className={styles.dashMark} aria-label="Not included">
                        &mdash;
                      </span>
                    ) : (
                      row.team
                    )}
                  </td>
                  <td>
                    {row.enterprise === '\u2713' ? (
                      <span className={styles.checkMark} aria-label="Included">
                        &#10003;
                      </span>
                    ) : row.enterprise === '\u2014' ? (
                      <span className={styles.dashMark} aria-label="Not included">
                        &mdash;
                      </span>
                    ) : (
                      row.enterprise
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* FAQ Section */}
        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={styles.sectionTitle}>
            Frequently Asked Questions
          </h2>
          <div className={styles.faqList}>
            {FAQ_ITEMS.map(item => (
              <FaqAccordionItem key={item.question} item={item} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export { PricingPage };
