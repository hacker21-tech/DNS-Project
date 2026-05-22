'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function Compare() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setHistory(res.data.filter((s: any) => s.status === 'complete'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const results = await Promise.all(selectedIds.map(id => api.get(`/scan/${id}`)));
      setReports(results.map(r => r.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'pass') return <CheckCircle className="text-emerald-500" size={18} />;
    if (status === 'warn') return <AlertTriangle className="text-amber-500" size={18} />;
    return <XCircle className="text-red-500" size={18} />;
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold">Site Comparison</h1>
        <p className="text-slate-400 mt-2">Select 2 to 4 sites from your history to compare side-by-side.</p>
      </header>

      <section className="mb-12 flex items-end gap-4">
        <div className="flex-1">
          <h3 className="mb-2 text-sm font-bold text-slate-500">SELECT SITES</h3>
          <div className="flex flex-wrap gap-2">
            {history.map(scan => (
              <Button
                key={scan.id}
                variant={selectedIds.includes(scan.id) ? "default" : "outline"}
                className={selectedIds.includes(scan.id) ? "bg-blue-600" : "border-slate-800"}
                onClick={() => toggleSelect(scan.id)}
              >
                {scan.domain}
              </Button>
            ))}
          </div>
        </div>
        <Button
          disabled={selectedIds.length < 2 || loading}
          onClick={handleCompare}
          className="bg-emerald-600 hover:bg-emerald-700 h-10 px-8"
        >
          {loading ? 'Loading...' : 'Compare Now'}
        </Button>
      </section>

      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50 backdrop-blur-xl">
           <div className="col-span-1 border-r border-slate-800 bg-slate-900/80 p-4 font-bold text-slate-500 space-y-8">
              <div className="h-20 flex items-center">Domain</div>
              <div className="h-12 flex items-center">Security Score</div>
              <div className="pt-4 space-y-6">
                 <div className="h-6">DMARC</div>
                 <div className="h-6">SPF</div>
                 <div className="h-6">DNSSEC</div>
                 <div className="h-6">MX Records</div>
                 <div className="h-6">AXFR Protection</div>
                 <div className="h-6">Open Resolver</div>
              </div>
           </div>

           {reports.map((report, idx) => (
             <div key={idx} className={`col-span-1 p-4 border-r border-slate-800 last:border-0 space-y-8 ${idx % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <div className="h-20 flex items-center font-bold text-xl text-blue-400 break-all">{report.scan.domain}</div>
                <div className="h-12 flex items-center text-3xl font-black">
                  <span className={report.score.total >= 80 ? 'text-emerald-500' : report.score.total >= 50 ? 'text-amber-500' : 'text-red-500'}>
                    {report.score.total}
                  </span>
                </div>
                <div className="pt-4 space-y-6">
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'dmarc_policy')?.status} />
                   </div>
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'spf_exists')?.status} />
                   </div>
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'dnssec_enabled')?.status} />
                   </div>
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'mx_resolves')?.status} />
                   </div>
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'zone_transfer_exposed')?.status} />
                   </div>
                   <div className="h-6 flex items-center gap-2">
                      <StatusIcon status={report.score.breakdown.find((b: any) => b.check === 'open_resolver')?.status} />
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
