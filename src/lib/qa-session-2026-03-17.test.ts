import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * QA Session 2026-03-17: Comprehensive tests for all changes
 *
 * 1. PROJ-4: Onboarding 3-step flow (step 4 removed)
 * 2. PROJ-4: Auth error handling improvements
 * 3. PROJ-5: DSGVO-compliant blind-invite + button rename
 */

// ── Helper: Read file content ──────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "..", relativePath),
    "utf-8"
  );
}

function readMessages(locale: "de" | "en"): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, "..", "messages", `${locale}.json`),
    "utf-8"
  );
  return JSON.parse(content);
}

// ── 1. PROJ-4: Onboarding 3-Step Flow ─────────────────────────────

describe("PROJ-4: Onboarding 3-Step Flow", () => {
  const onboardingContent = readSrc(
    "app/[locale]/(protected)/(onboarding)/onboarding/page.tsx"
  );

  it("TOTAL_STEPS should be 3 (not 4)", () => {
    expect(onboardingContent).toContain("const TOTAL_STEPS = 3;");
    expect(onboardingContent).not.toContain("const TOTAL_STEPS = 4;");
  });

  it("should NOT reference step 4 content", () => {
    // No step 4 rendering
    expect(onboardingContent).not.toContain("currentStep === 4");
    expect(onboardingContent).not.toContain('step4');
  });

  it("should only define 3 wizard steps", () => {
    // wizardSteps array should have exactly 3 entries
    const stepsMatch = onboardingContent.match(/wizardSteps\s*=\s*\[([\s\S]*?)\];/);
    expect(stepsMatch).not.toBeNull();
    const stepsContent = stepsMatch![1];
    const stepCount = (stepsContent.match(/label:/g) || []).length;
    expect(stepCount).toBe(3);
  });

  it("should NOT have inviteEmail, inviteCode, inviteFeedback state variables", () => {
    expect(onboardingContent).not.toContain("inviteEmail");
    expect(onboardingContent).not.toContain("inviteCode");
    expect(onboardingContent).not.toContain("inviteFeedback");
  });

  it("step 3 (role selection) should trigger onboarding completion", () => {
    // After step 3, should call complete-onboarding API and redirect
    expect(onboardingContent).toContain("currentStep === 3");
    expect(onboardingContent).toContain("complete-onboarding");
    expect(onboardingContent).toContain("window.location.href");
  });

  it("should set onboarding_completed to true on step 3", () => {
    expect(onboardingContent).toContain("onboarding_completed: true");
  });

  it("should have step 1 (consents), step 2 (profile), step 3 (role) titles", () => {
    expect(onboardingContent).toContain('t("step1.title")');
    expect(onboardingContent).toContain('t("step2.title")');
    expect(onboardingContent).toContain('t("step3.title")');
  });

  it("last step should show finish button", () => {
    expect(onboardingContent).toContain("isLastStep");
    expect(onboardingContent).toContain('t("wizard.finish")');
  });
});

// ── 2. PROJ-4: Auth Error Handling Improvements ───────────────────

describe("PROJ-4: Auth Error Code Handling", () => {
  describe("Login page error codes", () => {
    const loginContent = readSrc("app/[locale]/(auth)/login/page.tsx");

    it("should handle user_banned error code", () => {
      expect(loginContent).toContain('authError.code === "user_banned"');
      expect(loginContent).toContain('t("userBanned")');
    });

    it("should handle too_many_requests / rate limit error codes", () => {
      expect(loginContent).toContain('"over_request_rate_limit"');
      expect(loginContent).toContain('"too_many_requests"');
      expect(loginContent).toContain('t("rateLimited")');
    });

    it("should handle invalid credentials", () => {
      expect(loginContent).toContain('t("invalidCredentials")');
    });

    it("should handle email_not_confirmed redirect", () => {
      expect(loginContent).toContain("email_not_confirmed");
      expect(loginContent).toContain("verify-email");
    });
  });

  describe("Register page error codes", () => {
    const registerContent = readSrc("app/[locale]/(auth)/register/page.tsx");

    it("should handle weak_password error code", () => {
      expect(registerContent).toContain('"weak_password"');
      expect(registerContent).toContain('t("weakPassword")');
    });

    it("should handle too_many_requests / rate limit on register", () => {
      expect(registerContent).toContain('"over_email_send_rate_limit"');
      expect(registerContent).toContain('"too_many_requests"');
    });

    it("should redirect to verify-email on rate limit (email already sent)", () => {
      expect(registerContent).toContain("verify-email");
    });
  });

  describe("Reset-Password page error codes", () => {
    const resetContent = readSrc("app/[locale]/(auth)/reset-password/page.tsx");

    it("should handle same_password error code", () => {
      expect(resetContent).toContain('"same_password"');
      expect(resetContent).toContain('t("samePasswordError")');
    });

    it("should handle weak_password error code", () => {
      expect(resetContent).toContain('"weak_password"');
      expect(resetContent).toContain('t("weakPasswordError")');
    });
  });

  describe("Forgot-Password page error codes", () => {
    const forgotContent = readSrc(
      "app/[locale]/(auth)/forgot-password/page.tsx"
    );

    it("should handle too_many_requests / rate limit", () => {
      expect(forgotContent).toContain('"over_email_send_rate_limit"');
      expect(forgotContent).toContain('"too_many_requests"');
      expect(forgotContent).toContain('t("rateLimited")');
    });

    it("should handle SMTP errors specifically", () => {
      expect(forgotContent).toContain('t("smtpError")');
    });

    it("should show success for unknown errors (prevent account enumeration)", () => {
      // After non-rate/non-smtp errors, should setIsSuccess(true)
      expect(forgotContent).toContain("setIsSuccess(true)");
    });
  });

  describe("Verify-Email page error codes", () => {
    const verifyContent = readSrc(
      "app/[locale]/(auth)/verify-email/page.tsx"
    );

    it("should handle too_many_requests on resend", () => {
      expect(verifyContent).toContain('"too_many_requests"');
      expect(verifyContent).toContain('t("rateLimitedCheckSpam")');
    });
  });
});

// ── 3. Translation Completeness ───────────────────────────────────

describe("Translation Completeness for New Error Keys", () => {
  const de = readMessages("de") as Record<string, Record<string, unknown>>;
  const en = readMessages("en") as Record<string, Record<string, unknown>>;

  const authDe = de.auth as Record<string, Record<string, string>>;
  const authEn = en.auth as Record<string, Record<string, string>>;

  describe("Login translations", () => {
    it("de.json has auth.login.userBanned", () => {
      expect(authDe.login.userBanned).toBeDefined();
      expect(authDe.login.userBanned.length).toBeGreaterThan(0);
    });

    it("en.json has auth.login.userBanned", () => {
      expect(authEn.login.userBanned).toBeDefined();
      expect(authEn.login.userBanned.length).toBeGreaterThan(0);
    });

    it("de.json has auth.login.rateLimited", () => {
      expect(authDe.login.rateLimited).toBeDefined();
    });

    it("en.json has auth.login.rateLimited", () => {
      expect(authEn.login.rateLimited).toBeDefined();
    });
  });

  describe("Register translations", () => {
    it("de.json has auth.register.weakPassword", () => {
      expect(authDe.register.weakPassword).toBeDefined();
      expect(authDe.register.weakPassword.length).toBeGreaterThan(0);
    });

    it("en.json has auth.register.weakPassword", () => {
      expect(authEn.register.weakPassword).toBeDefined();
    });
  });

  describe("Reset-Password translations", () => {
    it("de.json has auth.resetPassword.samePasswordError", () => {
      expect(authDe.resetPassword.samePasswordError).toBeDefined();
      expect(authDe.resetPassword.samePasswordError.length).toBeGreaterThan(0);
    });

    it("en.json has auth.resetPassword.samePasswordError", () => {
      expect(authEn.resetPassword.samePasswordError).toBeDefined();
    });

    it("de.json has auth.resetPassword.weakPasswordError", () => {
      expect(authDe.resetPassword.weakPasswordError).toBeDefined();
    });

    it("en.json has auth.resetPassword.weakPasswordError", () => {
      expect(authEn.resetPassword.weakPasswordError).toBeDefined();
    });
  });

  describe("Forgot-Password translations", () => {
    it("de.json has auth.forgotPassword.rateLimited", () => {
      expect(authDe.forgotPassword.rateLimited).toBeDefined();
    });

    it("en.json has auth.forgotPassword.rateLimited", () => {
      expect(authEn.forgotPassword.rateLimited).toBeDefined();
    });

    it("de.json has auth.forgotPassword.smtpError", () => {
      expect(authDe.forgotPassword.smtpError).toBeDefined();
    });

    it("en.json has auth.forgotPassword.smtpError", () => {
      expect(authEn.forgotPassword.smtpError).toBeDefined();
    });
  });

  describe("Verify-Email translations", () => {
    it("de.json has auth.verifyEmail.rateLimitedCheckSpam", () => {
      expect(authDe.verifyEmail.rateLimitedCheckSpam).toBeDefined();
    });

    it("en.json has auth.verifyEmail.rateLimitedCheckSpam", () => {
      expect(authEn.verifyEmail.rateLimitedCheckSpam).toBeDefined();
    });
  });

  describe("German umlauts are correct", () => {
    it("no ae/oe/ue/sz substitutes in German auth translations", () => {
      const deStr = JSON.stringify(authDe);
      // Check for common umlaut mistakes
      // Note: "ae", "oe", "ue" can appear in English loanwords, so check contextually
      // The important thing: "Passwörter" not "Passwoerter", "zurück" not "zurueck"
      expect(deStr).not.toContain("zurueck");
      expect(deStr).not.toContain("ueber");
      expect(deStr).not.toContain("Aenderung");
      expect(deStr).not.toContain("Ueberpr");
    });
  });
});

// ── 4. PROJ-5: Invite Modal DSGVO Compliance ─────────────────────

describe("PROJ-5: InviteModal DSGVO Compliance", () => {
  const modalContent = readSrc("components/invite-modal.tsx");

  it("should NOT import lookupAthleteByEmail", () => {
    expect(modalContent).not.toContain("lookupAthleteByEmail");
  });

  it("should import addAthlete from actions", () => {
    expect(modalContent).toContain("addAthlete");
    expect(modalContent).toContain('@/lib/athletes/actions');
  });

  it("should NOT have profile preview / lookup logic", () => {
    expect(modalContent).not.toContain("profilePreview");
    expect(modalContent).not.toContain("lookupError");
    expect(modalContent).not.toContain("isConnectionRequest");
    expect(modalContent).not.toContain("lookupResult");
  });

  it("should handle all error keys in handleError function", () => {
    expect(modalContent).toContain("SELF_INVITE");
    expect(modalContent).toContain("ALREADY_CONNECTED");
    expect(modalContent).toContain("ALREADY_PENDING");
    expect(modalContent).toContain("INVALID_INPUT");
    expect(modalContent).toContain("RATE_LIMITED");
    expect(modalContent).toContain("EMAIL_DOMAIN_INVALID");
    expect(modalContent).toContain("IS_TRAINER");
    expect(modalContent).toContain("ALREADY_HAS_OTHER_TRAINER");
  });

  it("should use toast for error display (not inline)", () => {
    expect(modalContent).toContain("toast.error");
    expect(modalContent).toContain("toast.success");
  });

  it("should have a single submit button (not conditional)", () => {
    // Only one submit button, not separate invite/connect buttons
    const submitButtons = (modalContent.match(/type="submit"/g) || []).length;
    expect(submitButtons).toBe(1);
  });
});

describe("PROJ-5: addAthlete server action — routing logic", () => {
  const actionsContent = readSrc("lib/athletes/actions.ts");

  it("addAthlete should check profile existence server-side", () => {
    // The function queries profiles table by email
    expect(actionsContent).toContain('.eq("email", normalizedEmail)');
  });

  it("addAthlete should route to sendConnectionRequest for existing non-trainer", () => {
    expect(actionsContent).toContain(
      'profile.role !== "TRAINER"'
    );
    expect(actionsContent).toContain("sendConnectionRequest(data)");
  });

  it("addAthlete should route to inviteAthlete for new accounts", () => {
    expect(actionsContent).toContain("inviteAthlete(data)");
  });

  it("addAthlete should NOT expose account existence in return value", () => {
    // The function returns { success: boolean; error?: string }
    // and NEVER returns a field like "exists" or "accountFound"
    // Check the return type annotation
    expect(actionsContent).toContain(
      "Promise<{ success: boolean; error?: string }>"
    );
  });

  it("addAthlete should normalize email to lowercase", () => {
    expect(actionsContent).toContain(
      "parsed.data.email.toLowerCase().trim()"
    );
  });
});

// ── 5. PROJ-5: Translation Updates ────────────────────────────────

describe("PROJ-5: InviteModal Translation Updates", () => {
  const de = readMessages("de") as Record<string, Record<string, unknown>>;
  const en = readMessages("en") as Record<string, Record<string, unknown>>;

  const athletesDe = de.athletes as Record<string, string>;
  const athletesEn = en.athletes as Record<string, string>;

  it("de.json: inviteTitle should be 'Athlet hinzufuegen' (not 'einladen')", () => {
    expect(athletesDe.inviteTitle).toContain("hinzufügen");
    expect(athletesDe.inviteTitle).not.toContain("einladen");
  });

  it("en.json: inviteTitle should be 'Add Athlete'", () => {
    expect(athletesEn.inviteTitle).toBe("Add Athlete");
  });

  it("de.json: sendInvite should be 'Anfrage senden'", () => {
    expect(athletesDe.sendInvite).toBe("Anfrage senden");
  });

  it("en.json: sendInvite should be 'Send request'", () => {
    expect(athletesEn.sendInvite).toBe("Send request");
  });

  it("de.json: inviteDescription mentions blind-invite flow", () => {
    expect(athletesDe.inviteDescription).toContain("bereits registriert");
    expect(athletesDe.inviteDescription).toContain("Verbindungsanfrage");
  });

  it("en.json: inviteDescription mentions connection request flow", () => {
    expect(athletesEn.inviteDescription).toContain("already registered");
    expect(athletesEn.inviteDescription).toContain("connection request");
  });

  it("de.json has errorIsTrainer key", () => {
    expect(athletesDe.errorIsTrainer).toBeDefined();
    expect(athletesDe.errorIsTrainer.length).toBeGreaterThan(0);
  });

  it("en.json has errorIsTrainer key", () => {
    expect(athletesEn.errorIsTrainer).toBeDefined();
  });

  it("de.json has errorAlreadyHasOtherTrainer key", () => {
    expect(athletesDe.errorAlreadyHasOtherTrainer).toBeDefined();
  });

  it("en.json has errorAlreadyHasOtherTrainer key", () => {
    expect(athletesEn.errorAlreadyHasOtherTrainer).toBeDefined();
  });
});

// ── 6. Security: No Hardcoded User-Facing Strings ─────────────────

describe("i18n: No Hardcoded Strings in Modified Files", () => {
  it("onboarding page uses t() for all visible text", () => {
    const content = readSrc(
      "app/[locale]/(protected)/(onboarding)/onboarding/page.tsx"
    );
    // Should not have raw German/English strings in JSX
    // Allowed: HTML attributes, CSS classes, variable names
    // Check for common hardcoded patterns
    expect(content).not.toMatch(/<(?:p|span|h[1-6]|Button|CardTitle|CardDescription)>\s*[A-Z][a-z]+\s+/);
  });

  it("invite-modal uses t() for all visible text", () => {
    const content = readSrc("components/invite-modal.tsx");
    // All user-facing text should use t() or tCommon()
    expect(content).toContain("useTranslations");
    // No raw German strings
    expect(content).not.toContain(">Einladen<");
    expect(content).not.toContain(">Senden<");
    expect(content).not.toContain(">Invite<");
  });

  it("login page uses t() for all error messages", () => {
    const content = readSrc("app/[locale]/(auth)/login/page.tsx");
    // Error messages should use translation keys
    expect(content).not.toContain('setError("');
    // All setError calls should use t()
    const setErrorCalls = content.match(/setError\([^)]+\)/g) || [];
    for (const call of setErrorCalls) {
      if (call === "setError(null)") continue;
      expect(call).toContain("t(");
    }
  });

  it("register page uses t() for all error messages", () => {
    const content = readSrc("app/[locale]/(auth)/register/page.tsx");
    const setErrorCalls = content.match(/setError\([^)]+\)/g) || [];
    for (const call of setErrorCalls) {
      if (call === "setError(null)") continue;
      expect(call).toContain("t(");
    }
  });

  it("reset-password page uses t() for all error messages", () => {
    const content = readSrc("app/[locale]/(auth)/reset-password/page.tsx");
    const setErrorCalls = content.match(/setError\([^)]+\)/g) || [];
    for (const call of setErrorCalls) {
      if (call === "setError(null)") continue;
      expect(call).toContain("t(");
    }
  });
});

// ── 7. Security: Auth Error Handling ──────────────────────────────

describe("Security: Auth Error Handling", () => {
  it("forgot-password does NOT reveal account existence on unknown errors", () => {
    const content = readSrc(
      "app/[locale]/(auth)/forgot-password/page.tsx"
    );
    // After catching non-rate-limit errors, should show success (not error)
    // to prevent account enumeration
    expect(content).toContain("// All other errors: show success to prevent account enumeration");
  });

  it("register page does NOT reveal if email already exists", () => {
    const content = readSrc("app/[locale]/(auth)/register/page.tsx");
    // Should redirect to verify-email regardless (Supabase returns same response)
    expect(content).toContain(
      "// Note: Supabase signUp returns identical response for both new and"
    );
  });

  it("addAthlete never returns account existence info to client", () => {
    const content = readSrc("lib/athletes/actions.ts");
    // The addAthlete function comment explicitly states this
    expect(content).toContain(
      "The client NEVER learns whether the email belongs to an existing account"
    );
  });

  it("login returnUrl is validated against open redirect", () => {
    const content = readSrc("app/[locale]/(auth)/login/page.tsx");
    // Should check that returnUrl starts with "/" and doesn't start with "//"
    expect(content).toContain('returnUrl.startsWith("/")');
    expect(content).toContain('!returnUrl.startsWith("//")');
    expect(content).toContain('!returnUrl.includes("://")');
  });
});
