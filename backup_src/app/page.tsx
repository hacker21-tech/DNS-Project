'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6">
      <div className="relative group">
         <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
         <div className="relative bg-slate-900 ring-1 ring-slate-800 rounded-full p-6 shadow-2xl">
            <Shield size={64} className="text-blue-500" />
         </div>
      </div>

      <h1 className="mt-8 text-6xl font-black text-center tracking-tight">
        DNS <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">GUARDIAN</span>
      </h1>
      <p className="mt-4 text-slate-400 text-xl text-center max-w-lg">
        Enterprise-grade DNS security auditing and protection. Detect vulnerabilities, monitor blacklists, and secure your domain infrastructure.
      </p>

      <div className="mt-12 flex gap-4">
         <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 font-bold h-14 text-lg shadow-[0_10px_20px_rgba(37,99,235,0.3)] transform transition hover:-translate-y-1" onClick={() => router.push('/login')}>
           Get Started
         </Button>
         <Button size="lg" variant="outline" className="border-slate-800 px-8 font-bold h-14 text-lg hover:bg-slate-900 transform transition hover:-translate-y-1" onClick={() => router.push('/signup')}>
           Create Account
         </Button>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
         <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-blue-400 font-bold mb-2">Security Auditing</h3>
            <p className="text-slate-500 text-sm">Deep inspection of SPF, DKIM, DMARC and DNSSEC records to ensure maximum mail and domain security.</p>
         </div>
         <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-emerald-400 font-bold mb-2">Real-time Blacklists</h3>
            <p className="text-slate-500 text-sm">Automated checking against global RBLs to keep your IP reputation clean and avoid delivery issues.</p>
         </div>
         <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-cyan-400 font-bold mb-2">3D Visualization</h3>
            <p className="text-slate-500 text-sm">A modern, responsive dashboard with depth and glassmorphism designed for clarity and impact.</p>
         </div>
      </div>
    </div>
  );
}
