'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Book } from 'lucide-react';

const terms = [
  { term: "DNS", definition: "Domain Name System. The phonebook of the Internet, translating human-friendly domain names (google.com) into machine-friendly IP addresses (142.250.190.46)." },
  { term: "A Record", definition: "Address Record. Points a domain name to the IPv4 address of the hosting server." },
  { term: "AAAA Record", definition: "IPv6 Address Record. Points a domain name to the IPv6 address of the hosting server." },
  { term: "MX Record", definition: "Mail Exchanger Record. Specifies the mail servers responsible for receiving email on behalf of the domain." },
  { term: "NS Record", definition: "Name Server Record. Indicates which DNS servers are authoritative for the domain." },
  { term: "TXT Record", definition: "Text Record. Often used for domain verification and security policies like SPF, DKIM, and DMARC." },
  { term: "DNSSEC", definition: "DNS Security Extensions. Adds a layer of security to DNS by enabling DNS responses to be digitally signed, preventing cache poisoning." },
  { term: "SPF", definition: "Sender Policy Framework. A TXT record that specifies which mail servers are authorized to send email for your domain." },
  { term: "DKIM", definition: "DomainKeys Identified Mail. Adds a cryptographic signature to emails, allowing the receiver to verify that the email was indeed authorized by the owner of the domain." },
  { term: "DMARC", definition: "Domain-based Message Authentication, Reporting, and Conformance. A policy that tells receiving servers what to do if an email fails SPF or DKIM checks." },
  { term: "TTL", definition: "Time to Live. A value in a DNS record that determines how many seconds the record is cached by resolvers before it must be refreshed." },
  { term: "Open Resolver", definition: "A DNS server that responds to recursive queries from anyone on the internet. These can be abused in DDoS amplification attacks." },
  { term: "Zone Transfer (AXFR)", definition: "A mechanism to replicate DNS data across multiple servers. If left open to the public, it can leak your entire DNS configuration." },
  { term: "RBL / Blacklist", definition: "Real-time Blackhole List. A database of IP addresses known for sending spam or hosting malware." },
  { term: "CNAME", definition: "Canonical Name Record. Aliases one domain name to another (e.g., www.example.com to example.com)." },
  { term: "PTR Record", definition: "Pointer Record. Used for reverse DNS lookups, mapping an IP address back to a domain name." }
];

export default function Glossary() {
  const [query, setQuery] = useState('');

  const filtered = terms.filter(t =>
    t.term.toLowerCase().includes(query.toLowerCase()) ||
    t.definition.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold flex items-center gap-3">
          <Book className="text-blue-500" /> DNS Glossary
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Understand the technical terms used in your security reports.</p>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
        <Input
          placeholder="Search for a term..."
          className="pl-10 h-12 bg-slate-900 border-slate-800"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <Card key={item.term} className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-blue-400">{item.term}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 leading-relaxed">{item.definition}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-12 text-slate-500">No terms found matching "{query}"</p>
        )}
      </div>
    </div>
  );
}
