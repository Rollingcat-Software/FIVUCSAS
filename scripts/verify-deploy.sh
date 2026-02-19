#!/bin/bash
# Verify deployment of V15 seed data and endpoints

TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fivucsas.local","password":"Test@123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

echo "=== TENANTS ==="
curl -s http://localhost:8080/api/v1/tenants -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total:",d.get("totalElements","?")); [print(" -",t["name"]) for t in d.get("content",[])]'

echo "=== USERS ==="
curl -s http://localhost:8080/api/v1/users -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total:",d.get("totalElements","?")); [print(" -",u["email"],u["status"]) for u in d.get("content",[])]'

echo "=== AUDIT LOGS (all) ==="
curl -s 'http://localhost:8080/api/v1/audit-logs?size=50' -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total:",d["totalElements"])'

echo "=== AUDIT LOGS (action=USER_LOGIN) ==="
curl -s 'http://localhost:8080/api/v1/audit-logs?action=USER_LOGIN&size=50' -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total:",d["totalElements"]); [print(" -",l["action"],l.get("userId","anon")) for l in d["content"]]'

echo "=== AUDIT LOGS (action=FAILED_LOGIN_ATTEMPT) ==="
curl -s 'http://localhost:8080/api/v1/audit-logs?action=FAILED_LOGIN_ATTEMPT&size=50' -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Total:",d["totalElements"]); [print(" -",l["action"],l.get("ipAddress","?")) for l in d["content"]]'

echo "=== STATISTICS ==="
curl -s http://localhost:8080/api/v1/statistics -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin),indent=2))'

echo "=== LOGIN TEST (seeded user) ==="
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayse.demir@marmara.edu.tr","password":"Test@123"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("OK -",d["user"]["email"],d["user"]["status"]) if "accessToken" in d else print("FAIL -",d.get("message","?"))'
