'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, History, Shield, Info, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [domain, setDomain] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setLoading(true);
    try {
      const res = await api.post(`/scan?domain=${domain}`);
      router.push(`/scan/${res.data.scan_id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          DNS Guardian
        </h1>
        <nav className="flex gap-4">
           <Link href="/glossary">
            <Button variant="ghost" className="flex gap-2">
                <Info size={18} /> Glossary
            </Button>
           </Link>
           <Link href="/compare">
            <Button variant="ghost" className="flex gap-2">
                <ArrowLeftRight size={18} /> Compare
            </Button>
           </Link>
        </nav>
      </header>

      <section className="mb-12">
        <Card className="glass shadow-3d border-slate-800 p-6 transform transition-all duration-300 hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-blue-500" /> Start New Security Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                <Input
                  placeholder="Enter domain name (e.g., google.com)"
                  className="pl-10 h-12 bg-slate-800/50 border-slate-700"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
                {loading ? 'Scanning...' : 'Scan Domain'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <History className="text-slate-400" />
          <h2 className="text-2xl font-bold">Recent Scans</h2>
        </div>
        <Card className="bg-slate-900/30 border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((scan) => (
                <TableRow key={scan.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium">{scan.domain}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      scan.status === 'complete' ? 'bg-emerald-500/20 text-emerald-500' :
                      scan.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {scan.status.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/scan/${scan.id}`}>
                      <Button variant="outline" size="sm">View Report</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">No scans found. Start by scanning a domain!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
