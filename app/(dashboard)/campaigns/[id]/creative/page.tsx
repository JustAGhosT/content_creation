/**
 * Campaign Creative Studio Page (App Router)
 */

import { Metadata } from 'next';
import CreativeComposer from '@/components/creative/CreativeComposer';

export const metadata: Metadata = {
  title: 'Creative Studio | OmniPost',
  description: 'Design and render deterministic template-driven creative assets for campaigns',
};

export default async function CampaignCreativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CreativeComposer campaignId={id} />;
}
