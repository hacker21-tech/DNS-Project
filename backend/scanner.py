import dns.resolver
import dns.message
import dns.query
import dns.flags
import dns.name
import dns.exception
import whois
import requests
import socket
from typing import List, Dict, Any, Optional
from datetime import datetime

class DNSSecurityEngine:
    def __init__(self, domain: str):
        self.domain = domain
        self.resolver = dns.resolver.Resolver()
        self.resolver.timeout = 5
        self.resolver.lifetime = 5

    def get_records(self, record_type: str) -> List[Dict[str, Any]]:
        try:
            answers = self.resolver.resolve(self.domain, record_type)
            results = []
            for rdata in answers:
                results.append({
                    "record_type": record_type,
                    "name": self.domain,
                    "value": str(rdata),
                    "ttl": answers.ttl
                })
            return results
        except Exception:
            return []

    def get_whois_info(self) -> Dict[str, Any]:
        try:
            w = whois.whois(self.domain)
            expiry = w.expiration_date
            if isinstance(expiry, list):
                expiry = expiry[0]

            return {
                "registrar": w.registrar,
                "expiry_date": expiry
            }
        except:
            return {"registrar": None, "expiry_date": None}

    def check_dnssec(self) -> Dict[str, Any]:
        try:
            ds_records = self.get_records("DS")
            try:
                self.resolver.resolve(self.domain, 'RRSIG')
                has_rrsig = True
            except:
                has_rrsig = False

            enabled = len(ds_records) > 0 or has_rrsig

            return {
                "check_name": "dnssec_enabled",
                "status": "pass" if enabled else "warn",
                "raw_value": "Enabled" if enabled else "Disabled",
                "detail": "DNSSEC is enabled and records found." if enabled else "DNSSEC is not enabled for this domain."
            }
        except Exception as e:
            return {"check_name": "dnssec_enabled", "status": "error", "detail": str(e)}

    def check_spf(self) -> Dict[str, Any]:
        try:
            txt_records = self.get_records("TXT")
            spf_record = next((r["value"] for r in txt_records if "v=spf1" in r["value"]), None)

            if not spf_record:
                return {
                    "check_name": "spf_exists",
                    "status": "fail",
                    "raw_value": None,
                    "detail": "No SPF record found. This allows anyone to spoof your domain."
                }

            status = "pass"
            detail = "SPF record is present and valid."
            if "+all" in spf_record:
                status = "fail"
                detail = "SPF record contains '+all', which effectively disables protection."
            elif "?all" in spf_record:
                status = "warn"
                detail = "SPF record contains '?all' (neutral), which is less secure than ~all or -all."

            return {
                "check_name": "spf_exists",
                "status": status,
                "raw_value": spf_record,
                "detail": detail
            }
        except Exception as e:
            return {"check_name": "spf_exists", "status": "error", "detail": str(e)}

    def check_dmarc(self) -> Dict[str, Any]:
        try:
            dmarc_domain = f"_dmarc.{self.domain}"
            try:
                answers = self.resolver.resolve(dmarc_domain, "TXT")
                dmarc_record = next((str(r) for r in answers if "v=DMARC1" in str(r)), None)
            except:
                dmarc_record = None

            if not dmarc_record:
                return {
                    "check_name": "dmarc_exists",
                    "status": "fail",
                    "raw_value": None,
                    "detail": "DMARC record not found. Mail security is significantly reduced."
                }

            policy = "none"
            if "p=reject" in dmarc_record.lower():
                policy = "reject"
                status = "pass"
                detail = "DMARC policy is set to 'reject', providing maximum protection."
            elif "p=quarantine" in dmarc_record.lower():
                policy = "quarantine"
                status = "pass"
                detail = "DMARC policy is set to 'quarantine', providing good protection."
            else:
                status = "warn"
                detail = "DMARC policy is set to 'none'. It collects reports but doesn't block spoofed mail."

            return {
                "check_name": "dmarc_policy",
                "status": status,
                "raw_value": dmarc_record,
                "detail": detail
            }
        except Exception as e:
            return {"check_name": "dmarc_exists", "status": "error", "detail": str(e)}

    def check_dkim(self) -> Dict[str, Any]:
        selectors = ["default", "google", "mail", "k1", "smtp"]
        found = []
        for s in selectors:
            try:
                self.resolver.resolve(f"{s}._domainkey.{self.domain}", "TXT")
                found.append(s)
            except:
                continue

        if found:
            return {
                "check_name": "dkim_exists",
                "status": "pass",
                "raw_value": f"Found selectors: {', '.join(found)}",
                "detail": "DKIM records found for common selectors."
            }
        else:
            return {
                "check_name": "dkim_exists",
                "status": "warn",
                "detail": "No DKIM records found for common selectors (default, google, mail, etc.)."
            }

    def check_open_resolver(self, ns_list: List[str]) -> Dict[str, Any]:
        vulnerable = False
        for ns in ns_list:
            try:
                ns_ip = socket.gethostbyname(ns)
                q = dns.message.make_query("google.com", "A")
                response = dns.query.udp(q, ns_ip, timeout=2)
                if response.flags & dns.flags.RA:
                    vulnerable = True
                    break
            except:
                continue

        return {
            "check_name": "open_resolver",
            "status": "pass" if not vulnerable else "fail",
            "detail": "Nameservers are not acting as open resolvers." if not vulnerable else "VULNERABILITY: Nameserver acts as an open resolver."
        }

    def check_ns_consistency(self, ns_list: List[str]) -> Dict[str, Any]:
        soas = set()
        for ns in ns_list:
            try:
                ns_ip = socket.gethostbyname(ns)
                q = dns.message.make_query(self.domain, "SOA")
                response = dns.query.udp(q, ns_ip, timeout=2)
                for answer in response.answer:
                    if answer.rdtype == dns.rdatatype.SOA:
                        soas.add(str(answer[0].serial))
            except:
                continue

        if len(soas) <= 1:
            return {
                "check_name": "ns_consistency",
                "status": "pass",
                "detail": "All nameservers are consistent."
            }
        else:
            return {
                "check_name": "ns_consistency",
                "status": "fail",
                "detail": f"Inconsistent SOA serials found: {', '.join(soas)}"
            }

    def check_mx(self) -> Dict[str, Any]:
        mx_records = self.get_records("MX")
        if not mx_records:
            return {
                "check_name": "mx_resolves",
                "status": "warn",
                "detail": "No MX records found. This domain cannot receive email."
            }

        failed_hosts = []
        for mx in mx_records:
            host = mx["value"].split()[-1].rstrip('.')
            try:
                socket.gethostbyname(host)
            except:
                failed_hosts.append(host)

        if failed_hosts:
            return {
                "check_name": "mx_resolves",
                "status": "fail",
                "detail": f"The following MX hosts do not resolve: {', '.join(failed_hosts)}"
            }

        return {
            "check_name": "mx_resolves",
            "status": "pass",
            "detail": "All MX records resolve to valid IP addresses."
        }

    def check_zone_transfer(self, ns_list: List[str]) -> Dict[str, Any]:
        vulnerable = False
        for ns in ns_list:
            try:
                z = dns.zone.from_xfr(dns.query.xfr(ns, self.domain, timeout=2))
                if z:
                    vulnerable = True
                    break
            except:
                continue

        return {
            "check_name": "zone_transfer_exposed",
            "status": "pass" if not vulnerable else "fail",
            "detail": "Zone transfer (AXFR) is disabled." if not vulnerable else "VULNERABILITY: Zone transfer (AXFR) is exposed! Full DNS records can be leaked."
        }

    def get_ip_info(self, ip: str) -> Dict[str, Any]:
        try:
            response = requests.get(f"http://ip-api.com/json/{ip}", timeout=3)
            data = response.json()
            if data["status"] == "success":
                return {
                    "ip_address": ip,
                    "rdns": data.get("reverse"),
                    "asn": data.get("as"),
                    "org": data.get("org"),
                    "country": data.get("country"),
                    "city": data.get("city")
                }
        except:
            pass
        return {"ip_address": ip}

    def run_all_checks(self) -> Dict[str, Any]:
        results = {
            "dns_records": [],
            "security_checks": [],
            "ip_info": [],
            "whois": self.get_whois_info()
        }

        for rtype in ["A", "AAAA", "MX", "NS", "TXT", "SOA"]:
            results["dns_records"].extend(self.get_records(rtype))

        results["security_checks"].append(self.check_dnssec())
        results["security_checks"].append(self.check_spf())
        results["security_checks"].append(self.check_dkim())
        results["security_checks"].append(self.check_dmarc())
        results["security_checks"].append(self.check_mx())

        ns_records = [r for r in results["dns_records"] if r["record_type"] == "NS"]
        ns_hosts = [r["value"].rstrip('.') for r in ns_records]
        results["security_checks"].append(self.check_zone_transfer(ns_hosts))
        results["security_checks"].append(self.check_open_resolver(ns_hosts))
        results["security_checks"].append(self.check_ns_consistency(ns_hosts))

        a_records = [r for r in results["dns_records"] if r["record_type"] == "A"]
        unique_ips = list(set(r["value"] for r in a_records))
        for ip in unique_ips[:3]:
            results["ip_info"].append(self.get_ip_info(ip))

        return results

def check_rbl(ip: str) -> List[Dict[str, Any]]:
    rbls = [
        "zen.spamhaus.org",
        "b.barracudacentral.org",
        "dnsbl.sorbs.net",
        "bl.spamcop.net"
    ]
    results = []
    for rbl in rbls:
        try:
            reverse_ip = ".".join(reversed(ip.split(".")))
            query = f"{reverse_ip}.{rbl}"
            dns.resolver.resolve(query, "A")
            results.append({
                "rbl_name": rbl,
                "checked_ip": ip,
                "is_listed": True
            })
        except dns.resolver.NXDOMAIN:
            results.append({
                "rbl_name": rbl,
                "checked_ip": ip,
                "is_listed": False
            })
        except Exception:
            pass
    return results
