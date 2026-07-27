import type { Metadata } from 'next';
import ContentDetail from './ContentDetail';

export const metadata: Metadata = {
  title: 'Content details',
  description: 'Review content, publishing status, schedule, and selected platforms.',
};

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ContentDetail contentId={id} />;
}
