#!/usr/bin/env bash
# =============================================================================
# validate-edge-function-deploy.sh
#
# Pre-deploy validation script for Supabase Edge Functions.
# Run this BEFORE deploying to catch configuration issues that have caused
# production outages in the past.
#
# Prevents regressions of:
# - BUG 3: Config push overwrites secrets (checks env vars are set)
# - BUG 4: Windows CLI creates invalid paths (warns on Windows)
#
# Usage:
#   ./scripts/validate-edge-function-deploy.sh
#
# Exit codes:
#   0 = All checks passed
#   1 = Critical issue found (do NOT deploy)
#   2 = Warning found (deploy with caution)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "======================================"
echo "  Edge Function Pre-Deploy Validation"
echo "======================================"
echo ""

# ---------------------------------------------------------------------------
# BUG 3: Check SEND_EMAIL_HOOK_SECRET
# ---------------------------------------------------------------------------

echo "--- Checking SEND_EMAIL_HOOK_SECRET ---"

if [ -z "${SEND_EMAIL_HOOK_SECRET:-}" ]; then
  echo -e "${RED}FAIL: SEND_EMAIL_HOOK_SECRET is not set.${NC}"
  echo "  Without this, the auth hook cannot verify webhook signatures."
  echo "  The Edge Function will reject all requests from Supabase Auth."
  echo "  Set it with: export SEND_EMAIL_HOOK_SECRET='v1,whsec_...'"
  ERRORS=$((ERRORS + 1))
else
  # Validate format: should start with v1,whsec_ or just whsec_
  if echo "$SEND_EMAIL_HOOK_SECRET" | grep -qE '^(v1,)?whsec_[A-Za-z0-9+/=]+$'; then
    echo -e "${GREEN}PASS: SEND_EMAIL_HOOK_SECRET is set and has valid format.${NC}"
  else
    echo -e "${YELLOW}WARN: SEND_EMAIL_HOOK_SECRET is set but format looks unusual.${NC}"
    echo "  Expected format: v1,whsec_<base64-encoded-secret>"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""

# ---------------------------------------------------------------------------
# BUG 3: Check SMTP_PASS
# ---------------------------------------------------------------------------

echo "--- Checking SMTP_PASS ---"

if [ -z "${SMTP_PASS:-}" ]; then
  echo -e "${RED}FAIL: SMTP_PASS is not set.${NC}"
  echo "  Without this, running 'supabase config push' will overwrite"
  echo "  the production SMTP password with an empty/placeholder value."
  echo "  All outbound emails will fail silently."
  ERRORS=$((ERRORS + 1))
else
  if [ ${#SMTP_PASS} -lt 8 ]; then
    echo -e "${YELLOW}WARN: SMTP_PASS seems too short (${#SMTP_PASS} chars).${NC}"
    echo "  Make sure this is the real SMTP password, not a placeholder."
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}PASS: SMTP_PASS is set (${#SMTP_PASS} chars).${NC}"
  fi
fi

echo ""

# ---------------------------------------------------------------------------
# BUG 4: Windows CLI deployment creates invalid paths
# ---------------------------------------------------------------------------

echo "--- Checking platform ---"

IS_WINDOWS=false
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
  IS_WINDOWS=true
fi
# Also check via uname for Git Bash on Windows
if uname -s 2>/dev/null | grep -qi "MINGW\|MSYS\|CYGWIN\|NT"; then
  IS_WINDOWS=true
fi

if [ "$IS_WINDOWS" = true ]; then
  echo -e "${YELLOW}WARN: Running on Windows.${NC}"
  echo "  'npx supabase functions deploy' from Windows creates entrypoint"
  echo "  paths with backslashes (c:\\\\tmp\\\\...) instead of Linux paths."
  echo "  The Edge Function will crash on boot because Supabase runtime is Linux."
  echo ""
  echo "  RECOMMENDED: Deploy using one of these alternatives:"
  echo "    1. Use Supabase Dashboard to deploy (paste code in editor)"
  echo "    2. Use GitHub Actions CI/CD pipeline (runs on Linux)"
  echo "    3. Use WSL (Windows Subsystem for Linux)"
  echo "    4. Use the Supabase MCP server for deployment"
  echo ""
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}PASS: Running on Linux/macOS — CLI deployment is safe.${NC}"
fi

echo ""

# ---------------------------------------------------------------------------
# Check config.toml for placeholder values
# ---------------------------------------------------------------------------

echo "--- Checking config.toml for placeholder values ---"

CONFIG_FILE="supabase/config.toml"

if [ -f "$CONFIG_FILE" ]; then
  # Check that secrets use env() syntax
  if grep -q 'secrets = "env(SEND_EMAIL_HOOK_SECRET)"' "$CONFIG_FILE"; then
    echo -e "${GREEN}PASS: Hook secret uses env() reference in config.toml.${NC}"
  else
    echo -e "${RED}FAIL: Hook secret in config.toml does not use env() syntax.${NC}"
    echo "  This means 'supabase config push' will push a literal string,"
    echo "  not the environment variable value."
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q 'pass = "env(SMTP_PASS)"' "$CONFIG_FILE"; then
    echo -e "${GREEN}PASS: SMTP pass uses env() reference in config.toml.${NC}"
  else
    echo -e "${RED}FAIL: SMTP pass in config.toml does not use env() syntax.${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  # Check max_frequency is sane
  MAX_FREQ=$(grep -oP 'max_frequency\s*=\s*"\K\d+' "$CONFIG_FILE" || echo "0")
  if [ "$MAX_FREQ" -ge 15 ] && [ "$MAX_FREQ" -le 60 ]; then
    echo -e "${GREEN}PASS: max_frequency is ${MAX_FREQ}s (within safe range 15-60s).${NC}"
  else
    echo -e "${YELLOW}WARN: max_frequency is ${MAX_FREQ}s (recommended: 15-60s).${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${RED}FAIL: $CONFIG_FILE not found.${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ---------------------------------------------------------------------------
# Check Edge Function source files exist
# ---------------------------------------------------------------------------

echo "--- Checking Edge Function source files ---"

for FN in send-auth-email send-invitation-email; do
  FN_PATH="supabase/functions/$FN/index.ts"
  if [ -f "$FN_PATH" ]; then
    echo -e "${GREEN}PASS: $FN_PATH exists.${NC}"

    # Quick check that X-Mailer override is present
    if grep -q '"X-Mailer": "Train Smarter Mailer' "$FN_PATH"; then
      echo -e "${GREEN}PASS: $FN has X-Mailer override (prevents fake Outlook headers).${NC}"
    else
      echo -e "${RED}FAIL: $FN is missing X-Mailer override!${NC}"
      echo "  denomailer injects fake 'Microsoft Outlook 16.0' headers by default."
      echo "  This triggers phishing detection in spam filters."
      ERRORS=$((ERRORS + 1))
    fi

    # Check no List-Unsubscribe
    if grep -q 'List-Unsubscribe' "$FN_PATH"; then
      echo -e "${RED}FAIL: $FN contains List-Unsubscribe header!${NC}"
      echo "  Transactional emails must NOT have unsubscribe headers."
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}PASS: $FN has no List-Unsubscribe header.${NC}"
    fi
  else
    echo -e "${RED}FAIL: $FN_PATH not found.${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo "======================================"
echo "  Results: $ERRORS errors, $WARNINGS warnings"
echo "======================================"

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}BLOCKED: Fix $ERRORS error(s) before deploying.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}CAUTION: $WARNINGS warning(s). Review before deploying.${NC}"
  exit 2
else
  echo -e "${GREEN}ALL CHECKS PASSED. Safe to deploy.${NC}"
  exit 0
fi
