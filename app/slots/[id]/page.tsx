import SlotPageClient from '@/components/slot-page-client';

export default function SlotDetailPage({ params }: { params: { id: string } }) {
  return <SlotPageClient slotId={params.id} />;
}
