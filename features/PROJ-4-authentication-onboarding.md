# PROJ-4: Authentication & Onboarding

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Button, Input, Alert, Card

## Übersicht
Komplettes Authentifizierungssystem mit Supabase Auth: Registrierung, Login, Passwort-Reset und E-Mail-Verifizierung. Nach der ersten Anmeldung durchlaufen neue Benutzer einen einfachen Onboarding-Wizard (Profil-Setup + Rollenauswahl). In Figma werden alle Auth-Screens und der Onboarding-Flow dokumentiert.

## User Stories
- Als neuer Benutzer möchte ich mich mit E-Mail + Passwort registrieren, damit ich einen Account anlegen kann
- Als registrierter Benutzer möchte ich mich einloggen und eingeloggt bleiben, damit ich nicht jedes Mal neu eingeben muss
- Als Benutzer der sein Passwort vergessen hat möchte ich eine Reset-E-Mail bekommen, damit ich wieder Zugang erhalte
- Als neuer Benutzer möchte ich nach der Registrierung durch ein kurzes Onboarding geleitet werden, damit ich sofort mit dem Wichtigsten starte
- Als eingeladener Athlet möchte ich mich über den Einladungslink direkt registrieren, damit ich automatisch mit meinem Trainer verknüpft werde

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Login-Seite (Desktop + Mobile)
- [ ] Figma Screen: Registrierungs-Seite (Desktop + Mobile)
- [ ] Figma Screen: Passwort vergessen (Desktop + Mobile)
- [ ] Figma Screen: E-Mail-Bestätigung ausstehend (Info-Screen)
- [ ] Figma Screen: Onboarding Step 1 — Profilbild + Name + Geburtsdatum
- [ ] Figma Screen: Onboarding Step 2 — Rolle wählen (Trainer / Athlet)
- [ ] Figma Screen: Onboarding Step 3 — Als Trainer: Ersten Athleten einladen / Als Athlet: Trainer-Code eingeben

### Login
- [ ] Felder: E-Mail, Passwort (toggle Sichtbarkeit)
- [ ] Supabase `signInWithPassword` Aufruf
- [ ] Fehler "Invalid credentials" zeigt Alert (keine Unterscheidung ob E-Mail oder Passwort falsch → Sicherheit)
- [ ] "Eingeloggt bleiben" Checkbox (Session-Dauer: 30 Tage)
- [ ] Link zu "Passwort vergessen"
- [ ] Link zu "Registrieren"
- [ ] Nach Login: Redirect zu `/dashboard` (oder `returnUrl` wenn vorhanden)
- [ ] Bereits eingeloggter User der `/login` aufruft → Redirect zu `/dashboard`

### Registrierung
- [ ] Felder: Vorname, Nachname, E-Mail, Passwort, Passwort bestätigen
- [ ] Passwort-Anforderungen: Min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl
- [ ] Client-seitige Validierung mit Zod vor dem API-Aufruf
- [ ] Supabase `signUp` Aufruf
- [ ] Nach Registrierung: Weiterleitung zu "E-Mail bestätigen" Screen
- [ ] Einladungslink: URL-Parameter `inviteToken` wird in Session gespeichert, nach Verifizierung automatisch verknüpft

### Passwort Reset
- [ ] Schritt 1: E-Mail-Adresse eingeben → Supabase `resetPasswordForEmail`
- [ ] Bestätigungs-Screen: "Wenn diese E-Mail existiert, erhältst du einen Link"
- [ ] Schritt 2 (via Link in E-Mail): Neues Passwort + Bestätigen → Supabase `updateUser`
- [ ] Nach Reset: Redirect zu `/login` mit Erfolgs-Alert

### E-Mail-Verifizierung
- [ ] Unbestätigter User: Info-Screen mit Anweisung + "Erneut senden" Button (Rate-limited: 60s Cooldown)
- [ ] Nach Klick auf Bestätigungs-Link: Automatischer Redirect zur App
- [ ] Alle geschützten Routen prüfen Verifizierungsstatus

### Onboarding Wizard
- [ ] Wird nur angezeigt wenn `profile.onboarding_completed = false`
- [ ] Step 1: Name (vorausgefüllt aus Registrierung), Geburtsdatum, Profilbild (optional, Supabase Storage Upload)
- [ ] Step 2: Rollenauswahl — "Ich bin Trainer" oder "Ich bin Athlet"
- [ ] Step 3 (Trainer): Optionale Einladung eines ersten Athleten per E-Mail
- [ ] Step 3 (Athlet): Optionaler Trainer-Einladungscode eingeben
- [ ] "Überspringen" in jedem Schritt möglich — setzt `onboarding_completed = true`
- [ ] Nach Abschluss: Redirect zu `/dashboard`

## Edge Cases
- E-Mail bereits registriert bei Registrierung → Fehlermeldung ohne zu verraten ob Account existiert
- Token abgelaufen bei Passwort-Reset → Klarer Fehler mit "Neuen Link anfordern" CTA
- Benutzer schließt Browser während Onboarding → Beim nächsten Login wieder zum Onboarding
- Einladungstoken ungültig/abgelaufen → Fehlermeldung + Option sich normal zu registrieren
- Profilbild Upload > 5MB → Client-seitige Größenprüfung vor Upload

## Technical Requirements
- Security: Passwörter werden ausschließlich über Supabase Auth gehandhabt (kein eigenes Hashing)
- Security: CSRF-Schutz durch Supabase JWT-Tokens
- Security: Rate-Limiting auf Auth-Endpunkten (Supabase built-in)
- Validation: Zod-Schemas für alle Formulare, serverseitige Validierung via Next.js Route Handlers
- Performance: Auth-Check per Supabase `getSession()` im Server Component (kein Client-Waterfall)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
