import dynamic from 'next/dynamic';
import Dashboard from '@/components/dashboard';

const DepthBg = dynamic(() => import('@/components/depth-bg'), { ssr: false });

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <DepthBg />
      <Dashboard />
    </div>
  );
}
