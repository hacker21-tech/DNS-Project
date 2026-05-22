import pytest
from scanner import DNSSecurityEngine

def test_score_logic_mock():
    # Mocking check results
    checks = [
        {"check_name": "dmarc_policy", "status": "pass"}, # 20
        {"check_name": "spf_exists", "status": "pass"},   # 15
        {"check_name": "dnssec_enabled", "status": "warn"}, # 10 (20/2)
        {"check_name": "dkim_exists", "status": "missing"}, # 0
        {"check_name": "open_resolver", "status": "pass"}, # 15
        {"check_name": "zone_transfer_exposed", "status": "pass"}, # 10
        {"check_name": "mx_resolves", "status": "pass"}, # 5
        {"check_name": "ns_consistency", "status": "pass"} # 5
    ]

    weights = {
        "dmarc_policy": 20,
        "spf_exists": 15,
        "dnssec_enabled": 20,
        "dkim_exists": 10,
        "open_resolver": 15,
        "zone_transfer_exposed": 10,
        "mx_resolves": 5,
        "ns_consistency": 5
    }

    total_score = 0
    for c in checks:
        weight = weights.get(c["check_name"], 0)
        if c["status"] == "pass":
            total_score += weight
        elif c["status"] == "warn":
            total_score += weight // 2

    assert total_score == 80 # 20+15+10+0+15+10+5+5 = 80
