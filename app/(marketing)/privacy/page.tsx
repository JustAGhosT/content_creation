import type { Metadata } from 'next';
import styles from '@/styles/Privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | OmniPost',
  description: 'How OmniPost collects, uses, protects, and shares personal information.',
};

const EFFECTIVE_DATE = '28 July 2026';

export default function PrivacyPage() {
  return (
    <article className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Effective {EFFECTIVE_DATE}</p>
          <p className={styles.intro}>
            This policy explains how OmniPost collects, uses, stores, and shares information when
            you use our website and social publishing service.
          </p>
        </header>

        <section>
          <h2>Information we collect</h2>
          <p>We collect information in the following categories:</p>
          <ul>
            <li>
              <strong>Account information:</strong> your username, email address, authentication
              information, and account role.
            </li>
            <li>
              <strong>Content and workflow information:</strong> drafts, campaign details,
              schedules, approvals, publishing results, and other content you choose to provide.
            </li>
            <li>
              <strong>Connected-platform information:</strong> account identifiers, permissions, and
              access credentials supplied through a platform authorisation flow. Provider
              credentials are encrypted before storage and are not returned through our APIs.
            </li>
            <li>
              <strong>Usage and security information:</strong> product events, request metadata, IP
              address, browser or device information, and audit records used to operate and protect
              the service.
            </li>
            <li>
              <strong>Support and contact information:</strong> information you send when you ask
              for support, submit a form, or communicate with us.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies and similar technologies</h2>
          <p>
            OmniPost uses cookies and similar browser storage where needed to keep you signed in,
            protect authorisation flows, remember service state, and understand product usage. You
            can control cookies through your browser, but blocking essential cookies may prevent
            parts of the service from working.
          </p>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>We use information to:</p>
          <ul>
            <li>provide, secure, maintain, and improve OmniPost;</li>
            <li>authenticate users and keep accounts separated;</li>
            <li>adapt, schedule, publish, and track content at your direction;</li>
            <li>connect to third-party platforms you authorise;</li>
            <li>measure service reliability and investigate abuse or security incidents; and</li>
            <li>respond to support requests and comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2>Third-party platforms and service providers</h2>
          <p>
            When you connect a social platform, OmniPost sends and receives information through that
            platform&apos;s API according to the permissions you grant. Your use of that platform
            remains subject to its own terms and privacy policy. We also use infrastructure,
            database, authentication, email, monitoring, and AI service providers to operate
            OmniPost. Those providers process information under their own agreements and privacy
            commitments while helping us deliver the service.
          </p>
        </section>

        <section>
          <h2>Sharing</h2>
          <p>
            We do not sell personal information. We share information with service providers and
            connected platforms as described above, when you direct us to do so, when required by
            law, or when necessary to protect OmniPost, our users, or others. If OmniPost is
            involved in a merger, acquisition, financing, or sale of assets, information may be
            transferred as part of that transaction subject to applicable law.
          </p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>
            We retain information for as long as needed to provide the service, meet legal and
            security obligations, resolve disputes, and enforce agreements. Retention periods vary
            by data type and operational need. You can disconnect a platform to revoke
            OmniPost&apos;s access. To request account or data deletion, email us at the address
            below.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            We use administrative, technical, and organisational safeguards designed to protect
            information. No online service can guarantee absolute security, so please use a strong
            password and protect access to your accounts.
          </p>
        </section>

        <section>
          <h2>Your choices and rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete, restrict,
            or receive a copy of your personal information, or to object to certain processing. You
            may also withdraw a connected platform&apos;s permission through OmniPost or that
            platform. Contact us to make a request. We may need to verify your identity before
            completing it.
          </p>
        </section>

        <section>
          <h2>International processing</h2>
          <p>
            OmniPost and its providers may process information in countries other than the one where
            you live. Where required, we use appropriate safeguards for international data
            transfers.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            OmniPost is not directed to children under 13, and we do not knowingly collect their
            personal information. If you believe a child has provided information to us, please
            contact us.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as OmniPost changes. We will post the updated policy here and
            revise the effective date. If a change materially affects your rights, we will provide
            additional notice where required.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions or privacy requests can be sent to{' '}
            <a href="mailto:omniposthq@gmail.com">omniposthq@gmail.com</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
