import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/accounting');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
        <p className="mt-3 text-sm font-medium">Loading Accounting Dashboard...</p>
      </div>
    </div>
  );
}
