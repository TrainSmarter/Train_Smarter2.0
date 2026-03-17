#!/usr/bin/env bash
# validate-config.sh
# Validates supabase/config.toml for correctness before config push.
# Run this BEFORE every `npx supabase config push` to catch misconfigurations.
#
# Usage: bash scripts/validate-config.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="supabase/config.toml"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo -e "${RED}ERROR:${NC} $CONFIG_FILE not found."
  echo "Run this script from the project root directory."
  exit 1
fi

echo "============================================"
echo "  Config Validation — $CONFIG_FILE"
echo "============================================"
echo ""

errors=0
warnings=0

# ---------------------------------------------------------------------------
# Helper: extract a value from config.toml (simple grep-based, no toml parser)
# ---------------------------------------------------------------------------
get_value() {
  local key="$1"
  grep -E "^${key}\s*=" "$CONFIG_FILE" | head -1 | sed 's/^[^=]*=\s*//' | tr -d '"' | tr -d "'" | xargs
}

# Get value from a section context (searches after section header)
get_section_value() {
  local section="$1"
  local key="$2"
  # Find the line after the section header
  awk -v sec="$section" -v k="$key" '
    $0 ~ "\\[" sec "\\]" { in_section=1; next }
    /^\[/ { in_section=0 }
    in_section && $0 ~ "^" k " *=" {
      sub(/^[^=]*= */, "")
      gsub(/"/, "")
      print
      exit
    }
  ' "$CONFIG_FILE"
}

# ---------------------------------------------------------------------------
# 1. Check auth.hook.send_email is enabled
# ---------------------------------------------------------------------------
hook_enabled=$(get_section_value "auth.hook.send_email" "enabled")
if [[ "$hook_enabled" == "true" ]]; then
  echo -e "${GREEN}OK${NC}   auth.hook.send_email is enabled."
else
  echo -e "${RED}FAIL${NC} auth.hook.send_email is NOT enabled (got: '$hook_enabled')."
  echo "       The send-auth-email Edge Function will not be called."
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 2. Check hook URI matches expected pattern
# ---------------------------------------------------------------------------
hook_uri=$(get_section_value "auth.hook.send_email" "uri")
expected_pattern="https://djnardhjdfdqpxbskahe.supabase.co/functions/v1/send-auth-email"

if [[ "$hook_uri" == "$expected_pattern" ]]; then
  echo -e "${GREEN}OK${NC}   auth.hook.send_email URI is correct."
else
  echo -e "${RED}FAIL${NC} auth.hook.send_email URI is unexpected."
  echo "       Expected: $expected_pattern"
  echo "       Got:      $hook_uri"
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 3. Check hook secrets reference env var
# ---------------------------------------------------------------------------
hook_secrets=$(get_section_value "auth.hook.send_email" "secrets")
if [[ "$hook_secrets" == *"env(SEND_EMAIL_HOOK_SECRET)"* ]]; then
  echo -e "${GREEN}OK${NC}   auth.hook.send_email secrets references env var."
else
  echo -e "${RED}FAIL${NC} auth.hook.send_email secrets does not reference env(SEND_EMAIL_HOOK_SECRET)."
  echo "       Got: $hook_secrets"
  echo "       This means the secret may be hardcoded or missing."
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 4. Check auth.email.smtp is enabled
# ---------------------------------------------------------------------------
smtp_enabled=$(get_section_value "auth.email.smtp" "enabled")
if [[ "$smtp_enabled" == "true" ]]; then
  echo -e "${GREEN}OK${NC}   auth.email.smtp is enabled."
else
  echo -e "${RED}FAIL${NC} auth.email.smtp is NOT enabled (got: '$smtp_enabled')."
  echo "       Supabase will use the built-in mailer instead of your SMTP."
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 5. Check SMTP pass references env var
# ---------------------------------------------------------------------------
smtp_pass=$(get_section_value "auth.email.smtp" "pass")
if [[ "$smtp_pass" == *"env(SMTP_PASS)"* ]]; then
  echo -e "${GREEN}OK${NC}   auth.email.smtp pass references env var."
else
  echo -e "${RED}FAIL${NC} auth.email.smtp pass does not reference env(SMTP_PASS)."
  echo "       Got: $smtp_pass"
  echo "       DANGER: Password may be hardcoded or missing."
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 6. Check max_frequency is between 15s and 60s
# ---------------------------------------------------------------------------
max_freq=$(get_section_value "auth.email" "max_frequency")
# Strip the 's' suffix
freq_num="${max_freq//[^0-9]/}"

if [[ -z "$freq_num" ]]; then
  echo -e "${RED}FAIL${NC} auth.email.max_frequency could not be parsed (got: '$max_freq')."
  errors=$((errors + 1))
elif [[ "$freq_num" -ge 15 && "$freq_num" -le 60 ]]; then
  echo -e "${GREEN}OK${NC}   auth.email.max_frequency is ${freq_num}s (within 15s-60s range)."
else
  echo -e "${RED}FAIL${NC} auth.email.max_frequency is ${freq_num}s (must be between 15s and 60s)."
  if [[ "$freq_num" -lt 15 ]]; then
    echo "       Too low: risk of abuse / rate limit bypass."
  else
    echo "       Too high: users will wait too long for emails."
  fi
  errors=$((errors + 1))
fi

# ---------------------------------------------------------------------------
# 7. Check enable_confirmations is true
# ---------------------------------------------------------------------------
confirmations=$(get_section_value "auth.email" "enable_confirmations")
if [[ "$confirmations" == "true" ]]; then
  echo -e "${GREEN}OK${NC}   auth.email.enable_confirmations is true."
else
  echo -e "${YELLOW}WARN${NC} auth.email.enable_confirmations is '$confirmations' (expected true)."
  warnings=$((warnings + 1))
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
if [[ $errors -gt 0 ]]; then
  echo -e "  ${RED}FAILED: $errors error(s), $warnings warning(s)${NC}"
  echo "============================================"
  echo ""
  echo "DO NOT run 'npx supabase config push' until all errors are fixed."
  exit 1
else
  echo -e "  ${GREEN}PASSED: 0 errors, $warnings warning(s)${NC}"
  echo "============================================"
  echo ""
  if [[ $warnings -gt 0 ]]; then
    echo -e "${YELLOW}Review warnings above before proceeding.${NC}"
  fi
  echo "Config is valid. Safe to run 'npx supabase config push'"
  echo "(with SEND_EMAIL_HOOK_SECRET and SMTP_PASS env vars set)."
fi
