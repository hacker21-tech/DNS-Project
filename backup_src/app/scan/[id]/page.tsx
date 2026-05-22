'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, AlertTriangle, CheckCircle, Info, Globe, Activity, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function ScanReport() {
  const params = useParams();
  const id = params.id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (data && data.scan.rbl_status === 'pending') {
        fetchData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, data?.scan?.rbl_status]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/scan/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading report...</div>;
  if (!data) return <div className="flex items-center justify-center min-h-screen text-red-500">Report not found</div>;

  const scoreColor = data.score.total >= 80 ? 'text-emerald-500' : data.score.total >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
           <Link href="/dashboard" className="text-blue-500 hover:underline mb-2 block">← Back to Dashboard</Link>
           <h1 className="text-4xl font-bold">Report for {data.scan.domain}</h1>
        </div>
        <div className={`text-6xl font-black ${scoreColor}`}>
          {data.score.total}<span className="text-2xl text-slate-500">/100</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-900 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield /> Security Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.score.breakdown.map((item: any) => (
                <div key={item.check} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {item.status === 'pass' ? <CheckCircle className="text-emerald-500" size={20} /> :
                     item.status === 'warn' ? <AlertTriangle className="text-amber-500" size={20} /> :
                     <AlertTriangle className="text-red-500" size={20} />}
                    <span className="font-medium capitalize">{item.check.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">{item.points_earned}/{item.points_max} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin /> Server Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.ip_info.map((ip: any) => (
              <div key={ip.ip} className="space-y-2 border-b border-slate-800 pb-4 last:border-0">
                <div className="font-mono text-blue-400">{ip.ip}</div>
                <div className="text-sm text-slate-400">{ip.org}</div>
                <div className="text-sm flex items-center gap-1">
                  <Globe size={14} className="text-slate-500" /> {ip.city}, {ip.country}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks" className="w-full">
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="checks">Detailed Checks</TabsTrigger>
          <TabsTrigger value="records">DNS Records</TabsTrigger>
          <TabsTrigger value="blacklists">Blacklists (RBL)</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.security_checks.map((check: any) => (
              <Card key={check.check_name} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="capitalize">{check.check_name.replace(/_/g, ' ')}</span>
                    <span className={`text-xs px-2 py-1 rounded uppercase ${
                      check.status === 'pass' ? 'bg-emerald-500/20 text-emerald-500' :
                      check.status === 'warn' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                    }`}>{check.status}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 mb-2">{check.detail}</p>
                  {check.raw_value && (
                    <div className="bg-black/50 p-2 rounded text-xs font-mono text-slate-300 overflow-x-auto">
                      {check.raw_value}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <Card className="bg-slate-900 border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>TTL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.dns_records).map(([type, records]: [string, any]) => (
                  records.map((r: any, idx: number) => (
                    <TableRow key={`${type}-${idx}`} className="border-slate-800">
                      <TableCell className="font-bold text-blue-500">{type}</TableCell>
                      <TableCell className="font-mono text-xs">{r.value}</TableCell>
                      <TableCell className="text-slate-500">{r.ttl}s</TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="blacklists" className="mt-6">
           <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                   <span>Anti-Spam Blacklist Status</span>
                   {data.scan.rbl_status === 'pending' && <span className="text-sm flex items-center gap-2 text-amber-500"><Activity className="animate-spin" size={16}/> Updating...</span>}
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead>RBL Name</TableHead>
                    <TableHead>IP Checked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rbl_results.map((r: any, idx: number) => (
                    <TableRow key={idx} className="border-slate-800">
                      <TableCell>{r.rbl_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.checked_ip}</TableCell>
                      <TableCell>
                        {r.is_listed ?
                          <span className="text-red-500 font-bold">LISTED (Dangerous)</span> :
                          <span className="text-emerald-500 font-bold">Clean</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.rbl_results.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                          {data.scan.rbl_status === 'pending' ? 'Checking blacklists...' : 'No RBL results found.'}
                        </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
