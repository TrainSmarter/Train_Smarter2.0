#!/usr/bin/env bash
# deploy-edge-functions.sh
# Safe deployment script for Supabase Edge Functions.
# Prevents common production issues:
#   - Missing env vars that wipe secrets on config push
#   - Windows CLI deployments that create invalid Linux paths
#
# Usage: bash scripts/deploy-edge-functions.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FUNCTIONS=("send-auth-email" "send-invitation-email")

# ---------------------------------------------------------------------------
# 1. Validate required environment variables
# ---------------------------------------------------------------------------

echo "============================================"
echo "  Edge Function Deployment — Pre-flight"
echo "============================================"
echo ""

errors=0

# SEND_EMAIL_HOOK_SECRET must exist and match v1,whsec_* with min 32 chars
if [[ -z "${SEND_EMAIL_HOOK_SECRET:-}" ]]; then
  echo -e "${RED}FAIL${NC} SEND_EMAIL_HOOK_SECRET is not set."
  echo "       Set it via: export SEND_EMAIL_HOOK_SECRET='v1,whsec_...'"
  errors=$((errors + 1))
else
  if [[ ! "$SEND_EMAIL_HOOK_SECRET" =~ ^v1,whsec_.{24,}$ ]]; then
    echo -e "${RED}FAIL${NC} SEND_EMAIL_HOOK_SECRET does not match expected format."
    echo "       Expected: v1,whsec_<at least 24 chars> (total min 32 chars)"
    echo "       Got:      ${SEND_EMAIL_HOOK_SECRET:0:12}..."
    errors=$((errors + 1))
  else
    echo -e "${GREEN}OK${NC}   SEND_EMAIL_HOOK_SECRET is set and valid."
  fi
fi

# SMTP_PASS must exist
if [[ -z "${SMTP_PASS:-}" ]]; then
  echo -e "${RED}FAIL${NC} SMTP_PASS is not set."
  echo "       Set it via: export SMTP_PASS='your-smtp-password'"
  errors=$((errors + 1))
else
  echo -e "${GREEN}OK${NC}   SMTP_PASS is set."
fi

if [[ $errors -gt 0 ]]; then
  echo ""
  echo -e "${RED}Aborting: $errors pre-flight check(s) failed.${NC}"
  echo "Fix the issues above and re-run."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Detect operating system
# ---------------------------------------------------------------------------

detect_os() {
  case "$(uname -s 2>/dev/null || echo Windows)" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "mac" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

OS=$(detect_os)
echo ""
echo "Detected OS: $OS"

# ---------------------------------------------------------------------------
# 3. Deploy based on OS
# ---------------------------------------------------------------------------

if [[ "$OS" == "windows" ]]; then
  echo ""
  echo -e "${YELLOW}WARNING: Windows detected.${NC}"
  echo "Deploying Edge Functions via the Supabase CLI on Windows creates"
  echo "invalid Linux paths inside the deployed bundle. This breaks the"
  echo "function at runtime."
  echo ""
  echo "============================================"
  echo "  USE THE SUPABASE MCP DEPLOY INSTEAD"
  echo "============================================"
  echo ""
  echo "In Claude Code or the Supabase Dashboard MCP, run:"
  echo ""
  for fn in "${FUNCTIONS[@]}"; do
    echo "  mcp__supabase__deploy_edge_function("
    echo "    project_id: \"djnardhjdfdqpxbskahe\","
    echo "    function_slug: \"$fn\","
    echo "    entrypoint_path: \"supabase/functions/$fn/index.ts\","
    echo "    import_map_path: \"supabase/functions/$fn/deno.json\""
    echo "  )"
    echo ""
  done
  echo "Or deploy via the Supabase Dashboard > Edge Functions > Deploy."
  echo ""
  echo -e "${YELLOW}CLI deployment skipped on Windows.${NC}"
  exit 0
fi

# Linux / Mac — deploy via CLI
echo ""
echo "Deploying Edge Functions via Supabase CLI..."
echo ""

for fn in "${FUNCTIONS[@]}"; do
  echo "--- Deploying: $fn ---"
  npx supabase functions deploy "$fn" --no-verify-jwt
  echo -e "${GREEN}OK${NC}   $fn deployed."
  echo ""
done

echo "============================================"
echo -e "${GREEN}All Edge Functions deployed successfully.${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}REMINDER:${NC} Do NOT run 'npx supabase config push' from this script."
echo "Config push must be done manually with explicit confirmation"
echo "and verified env vars. See .claude/rules/email-deployment.md."
