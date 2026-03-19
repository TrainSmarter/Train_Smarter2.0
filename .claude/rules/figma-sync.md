# Figma Sync (MANDATORY)

## Automatischer Figma-Sync via MCP

**Immer wenn eine der folgenden Aktionen stattfindet, MUSS der Figma MCP Server verwendet werden, um das Figma-File zu aktualisieren:**

### Trigger-Events (automatisch, ohne explizite Aufforderung)

1. **Neue Komponente erstellt** (`src/components/**/*.tsx`)
   - Neues Frame in der Component Library erstellen
   - Varianten, Props und States dokumentieren
   - Farben aus dem Design Token System verwenden

2. **Bestehende Komponente geändert** (Props, Varianten, visuelle Änderungen)
   - Entsprechenden Figma-Node aktualisieren
   - Falls neue Variante: neues Frame hinzufügen
   - Falls Variante entfernt: Frame aus Figma löschen

3. **Design Tokens geändert** (`tailwind.config.*`, CSS-Variablen in `globals.css`)
   - Design Tokens Frame aktualisieren (node-id: `2:2`)
   - Alle betroffenen Farbfelder, Schatten, Radien etc. aktualisieren

4. **Neue `.figma.tsx` Sidecar-Datei erstellt**
   - Immer auch den zugehörigen Figma-Node erstellen/aktualisieren

### MCP-Verbindung

- **Channel:** `unkr858t` (WebSocket Server: `npx cursor-talk-to-figma-socket@latest` auf Port 3055)
- **Figma File Key:** `AxOnJViNOMcviAAUmcudhA`
- **Figma File URL:** `https://www.figma.com/design/AxOnJViNOMcviAAUmcudhA/Train-Smarter2.0`

Verbindung herstellen mit:
```
mcp__figma__join_channel({ channel: "unkr858t" })
```

### Bekannte Frame-IDs

| Frame | Node-ID |
|-------|---------|
| Design Tokens | `2:2` |
| Component Library | `6:22` |
| Button Primary | `6:29` |
| Button Secondary | `6:30` |
| Button Ghost | `6:31` |
| Button Outline | `6:32` |
| Button Success | `6:33` |
| Button Danger | `6:34` |
| Badge (Primary) | `6:73` |
| Badge Success | `6:65` |
| Badge Warning | `6:67` |
| Badge Error | `6:69` |
| Badge Info | `6:71` |
| Alert Success | `6:104` |
| Alert Warning | `6:108` |
| Alert Error | `6:112` |
| Alert Info | `6:116` |
| Modal SM | `6:179` |
| Modal MD | `6:182` |
| Modal LG | `6:185` |
| Modal XL | `6:188` |
| Card Default | `6:84` |
| Card Hover | `6:92` |
| Card Interactive | `6:96` |
| StatsCard Blue | `6:122` |
| StatsCard Purple | `6:127` |
| StatsCard Green | `6:132` |
| StatsCard Orange | `6:137` |
| StatsCard Info | `6:142` |
| **PROJ-3 App Shell** | `29:225` |
| AppSidebar Expanded | `29:228` |
| AppSidebar Collapsed | `29:259` |
| AppHeader | `29:270` |
| EmptyState | `29:295` |
| **PROJ-4 Auth & Onboarding** | `52:2` |
| Login Card | `52:22` |
| Register Card | `52:38` |
| Verify Email Card | `52:39` |
| Onboarding Wizard | `52:40` |
| **PROJ-5 Athleten-Management** | `52:3` |
| AthleteCard Default | `52:78` |
| AthleteCard Hover | `52:79` |
| AthleteCard Dragging | `52:80` |
| ViewSwitcher | `52:98` |
| InviteModal | `52:123` |
| DragConfirmDialog | `52:124` |
| **PROJ-6 Feedback & Monitoring** | `52:4` |
| Monitoring Stats Row | `52:147` |
| CheckIn Form Card | `52:165` |
| CheckIn Summary Card | `52:166` |
| SegmentedControl | `52:186` |
| StreakBadge | `52:187` |
| NumberInput | `52:188` |
| TrendChart | `52:189` |
| **PROJ-9 Team-Verwaltung** | `52:5` |
| TeamCard Default | `52:212` |
| TeamCard Drop Target | `52:213` |
| TeamCard Archiviert | `52:214` |
| TeamFormModal | `52:229` |
| TeamDetail Preview | `52:230` |
| TeamOverviewCard | `52:245` |
| TeamArchiveDialog | `52:246` |

### Design Token Referenz (aktuelles Brand)

**Primary:** Teal `#0D9488` / Skala: 50 `#F0FDFA` → 900 `#134E4A`
**Secondary:** Violet `#7C3AED` / Skala: 50 `#F5F3FF` → 900 `#2E1065`
**Success:** `#10B981` | **Warning:** `#F59E0B` | **Error:** `#EF4444` | **Info (Sky):** `#0284C7`
**Grays:** Warm Slate — 50 `#F8FAFC` → 900 `#0F172A`

**Shadows:** xs `0 1px 2px` → xl `0 20px 25px` (rgba(15,23,42,0.1))
**Radius:** xs `2px`, sm `4px`, md `6px`, lg `8px`, xl `12px`, 2xl `16px`
**Spacing:** 8px-Basis (4/8/12/16/24/32/48/64px)

### Workflow

1. `mcp__figma__join_channel` aufrufen
2. Betroffene Nodes identifizieren (aus obiger Tabelle oder per `get_node_info`)
3. Änderungen mit den passenden MCP-Tools umsetzen:
   - Text: `set_text_content` / `set_multiple_text_contents`
   - Farben: `set_fill_color` / `set_stroke_color`
   - Layout: `set_layout_mode`, `set_padding`, `set_item_spacing`
   - Neue Frames: `create_frame`, `create_text`, `create_rectangle`
4. Nach dem Update kurz bestätigen welche Nodes geändert wurden

### Wichtig

- **NIEMALS** alte Brand-Farben verwenden: ~~`#E05540`~~ (Orange), ~~`#6366F1`/`#312E81`~~ (Navy/Indigo)
- Immer das aktuelle Teal/Violet Brand verwenden
- Figma ist die **Single Source of Truth** für alle Design-Entscheidungen
