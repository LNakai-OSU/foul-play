# Foul Play: Murder Mystery Party Builder

Build, run and print your own murder-mystery party kit. Generate a complete scenario in one click (or build one by hand), tweak everything, then run the evening from a live game-master screen and print spoiler-safe character sheets and clue cards.

## Run it

```bash
npm install
npm run dev        # API on :3001 + Vite client on http://localhost:9432 (printed in the terminal)
```

Other scripts

| Command | What it does |
| --- | --- |
| `npm run build` | strict typecheck (client + server) and production build into `dist/` |
| `npm test` | Vitest suite: 10 files, 179 tests (checker rules, generator fairness sweeps, prose and method-consistency scans, export spoiler-safety, run state, PDF, API + persistence, and the game world: reachability, solvability and rules) |
| `npm start` | serves the API and the built client together (run `npm run build` first) |
| `npm run e2e` | optional browser-level regression script (see below); not part of `dev`, `build` or `test` |
| `npm run e2e:play [tone] [seed]` | optional: plays a generated case through the real game UI, title screen to ending, and fails on any stuck screen or console error |

### Optional browser regression script (`npm run e2e`)

`e2e/run.mjs` starts its own API and Vite server on spare ports with a throw-away data directory and drives real Chrome to check the things unit tests cannot: the library kebab menu under a real mouse, rename-on-Enter, checker click-through, real-mouse drag-and-drop, GM keyboard shortcuts and cross-browser run persistence, print page counts (one page per character sheet plus a table card, 8 handouts per page, GM packet), editing an alibi place (exactly one issue per conflicting pair, no console errors), Ctrl+Z on a focused switch, and "zero console errors" for the whole session.

Why `playwright-core` is a dev dependency: the script needs a browser-automation library and this keeps it one `npm install` away. It is deliberately the *core* package, so **nothing is downloaded at install time** (no browser binaries, no postinstall step, no install warnings). It uses the Google Chrome you already have (`/Applications/Google Chrome.app/...` on macOS; set `CHROME_PATH` for another location). It is only imported by `e2e/run.mjs`, so `npm run dev`, `npm run build`, `npm test` and the app bundle never load it. Delete `e2e/` and the one devDependency line if you do not want it.

Environment: `PORT` (API port, default 3001), `DATA_DIR` (where `cases.json` lives, default `./data`). No external services, no API keys, works offline (fonts are bundled through `@fontsource`).

Note: the shipped client (web build and the iOS app) stores its case library and GM run state on-device — see **On-device storage** below. `server/` is kept as optional, working infrastructure (own tests, own `npm start`) for anyone who wants to self-host a variant with shared/cross-device storage instead; the client does not talk to it by default.

## Feature tour

* **Case library** (`#/`): create (blank or generated), open, rename, duplicate, delete (with undo), import/export JSON. Cases persist on-device (`localStorage`, or the app's own storage on iOS) — no server required. On iOS, the free tier caps the library at 5 cases; a one-time In-App Purchase unlocks unlimited (see **Monetization** below). Not gated on web.
* **Guided builder**: Setting, Victim, Characters, Motives, Evidence, Red herrings, Timeline, Polish. Stepper and sidebar navigation, per-step progress, and a per-step "things to look at" panel fed by the checker. Everything autosaves, with undo/redo (Ctrl+Z / Ctrl+Shift+Z; the shortcut also works while a switch or button has focus, and leaves native undo alone inside text fields).
* **Editable everything**: add, duplicate, delete and reorder. Drag-and-drop (mouse, touch and keyboard via `@dnd-kit`) on characters, clues and timeline beats; deletes offer an Undo snackbar (characters ask for confirmation first because they cascade).
* **Generator**: a seeded, template-driven generator (12 settings, 82 roles, 24 murder methods, 3 tones, 38 red-herring stories with setting-specific ones, 8 motive categories, 10 visible traits, 12 mini-games). Respects tone, player range and setting; re-roll from the top bar. It first plans **who was where** (mutual alibi groups, one room per group, nobody at the scene, the killer claiming a room they were not in and a witness who saw it empty), then builds clues so only the *combination* of traits and alibis identifies the killer while decoys are just as heavily implicated. Prose follows the case: method-dependent wording matches the cause of death (no knives in a poisoning) and time-of-day wording matches the time of death (an afternoon fete never says "tonight"). Output is verified against the checker by tests across thousands of seeds.
* **Consistency checker**: 60 rules (no/multiple killers, killer without motive, missing alibi, dangling references, unscheduled clues, red herring debunked before it is revealed, no genuine evidence on the killer, player count mismatch, orphaned beats, round order, killer too obvious, …). **Alibi rules**: `alibi-companion-missing` (a companion who does not exist), `alibi-not-reciprocal` (A says they were with B but B does not name A), `alibi-place-conflict` (companions disagree on the room, or two unconnected characters claim the same room; reported once per pair) and `alibi-at-scene` (an alibi placed at the murder scene). Issue ids are unique across a report (they are used as React keys). Each issue has a severity, message, hint and a **Fix** link that opens the right step, expands the right card and focuses the right field. Live badge in the top bar, drawer panel, and full report on the Polish step.
* **Game master view** (`#/case/:id/gm`): start the evening, reveal clues one by one, advance beats, countdown timers (pause/resume/restart, chime at zero), player-action beats that need confirmation, skipped-clue recovery, clue log, cast reference, and a hidden **solution key** behind a confirm dialog. Run state (including timers) is saved on-device per case, so it survives a refresh; reset at any time. (A second device picking up the same live run needs the optional server — see the note above.)
* **Print and export** (`#/case/:id/export`): character sheets, clue handouts (cut-apart cards) and a GM packet. Each is viewable as paper preview, printable with clean page breaks, and downloadable as PDF (jsPDF). Print layout: **one page per character sheet** plus one shared **table card** (title, victim, public guest list, dress code, house rules), so 6 characters print as 7 pages; handouts are 8 cut-apart cards per page with dashed cut lines; the GM packet (solution key, timeline, cast and alibis, props, and a blank scorecard) is a single flowing document that avoids a stranded last page.
* **Play as the detective** (`#/case/:id/play`): turns any playable case into a top-down detective RPG in the spirit of the classic handheld monster games. See the next section.
* **Design system** (`#/design`): a live gallery of the tokens and components.
* **Game gallery** (`#/game-gallery`): every environment, room theme, clue icon, character and game screen, drawn by the real game renderers.

## Play as the detective

Open **Play as detective** from a case card in the library (or the sidebar inside the builder). The same case you built for a party becomes a solo game: you are the detective, the suspects are standing where their alibi says they were, and the clues you wrote are lying around or waiting to be told. Nothing is authored twice, so **editing the case changes the game**, and a freshly generated case is instantly playable.

* **Controls.** Walk with the arrow keys or WASD, **SPACE** talks to, looks at, takes or opens whatever is in front of you (a "SPACE" prompt pops up over it), hold Shift to run, **ENTER** opens the menu and notebook, X or Esc goes back, M mutes. (Z and E also confirm.) On touch devices an on-screen pad appears with SPACE and BACK buttons.
* **Twelve places, twelve looks.** The game reads the case's setting and draws a hub and rooms that fit it: a village green with striped tents and bunting (fete), a floodlit gala concourse (gallery), sealed modules under an aurora (polar station), a paddle steamer with a churning stern wheel on a brown river (riverboat), a floodlit manor and its gravel drive, an ocean liner with funnels, lifeboats and a pool, snowbound log chalets (lodge), a Hollywood backlot with soundstage hangars and false fronts, a fine-dining floor set for its last night, a locomotive and Pullman cars at their platform, a rain-slicked jazz-club street with neon, and a Victorian auditorium with stage, pit and stalls. Every room has its own materials, furniture, ambient animation (waves, snow, steam, neon flicker, moving train scenery in the windows), lighting and sound bed. Hand-built cases are keyword-matched on the setting and place names and fall back to a generic house. See them all at **`#/game-gallery`** (linked from the design-system page): every hub for every tone, every room theme, every clue icon, the cast, the portraits and the real game screens.
* **Faces.** Interrogations are staged in the suspect's own room under a single bulb, with dedicated 72x92 portraits (per-face nose, brows, ears, moustache, glasses, hats) that go from calm to rattled to cracked as their composure drops; the detective is a bright coat with a dark rim so they never vanish into planks or snow.
* **Clues have faces.** Each clue gets its own pixel icon (a knife, a torn letter, a vial, a watch chain, a coffee cup with lipstick, a will...): 100+ designed icons, chosen by matching the clue's title and description (`src/game/icons.ts`, coverage over the generator's whole corpus is unit-tested), with varied tinted fallbacks. The icon lies in the world, fills the item-get card when you find it, heads every notebook entry and every present-a-clue list. Things told by a person carry a speech badge.
* **The deduction: where was everyone when the shot rang out?** Everything hangs on one moment, the shot (the victim's time of death). Every suspect swears where they were at it (their `alibiPlace`, their companions, and any trip they admit to). The venue's **staff** (the people who wander the hub: the stoker, the porter, the cook...) did their rounds and counted heads in the rooms at the shot; ask them *WHAT DID YOU SEE?* and each account is a clue with a **headcount** ("the Galley: three people, all talking at once. The Boiler Deck: nobody"). The killer is the only one whose story about the shot is false. Only where people *were* at a moment can contradict where someone swears they were: an object in another room is not a contradiction, a motive is not a place.
* **Cross-examination.** Talk to a suspect to start an interrogation. **TALK** asks about their alibi, the night, motive and relationships. **TESTIMONY** shows their four statements, one full page at a time (LEFT / RIGHT): *where I was*, *who was with me*, *I never went near the scene*, *I had no reason*. The statements are written from the facts of the case, so each is a claim you can check. **PRESS** a statement for a lead (a companion to ask, a member of staff who did their rounds), never the answer. **PRESENT** a clue on the statement it contradicts: a headcount that comes up short breaks *where I was*, a motive clue breaks *I had no reason*. **I never went near the scene** needs two marks tied together (each fits several people; you must first rule the rest out by placing them elsewhere at the shot). A wrong present costs a heart of nerve and slips your rank, and the game says in-fiction *why* it is not a contradiction, never which statement you should have picked. Red herrings never break anything and are cleared once you hold the clue that debunks them. Two clues at once and everything else is optional-safe.
* **THE NIGHT (reconstruct the night).** The notebook's NIGHT tab (or the menu) is a table: place every guest in a room at the moment of the shot. It objects only when your own placement contradicts a headcount **you hold** (too many people in a room, too few, nobody alone with the body) and it never says who is lying. A complete, consistent table that puts exactly one person alone with the victim is the accusation -- but the table will not let you name them on a hunch: you must also hold a real piece of evidence that puts a hole in *their own* story (a headcount that comes up short, or being caught in the act), not just an empty room with nothing contradicting it. `AT THEIR WORD` fills in everyone you have met where they swore they were, so you can see whose story the headcounts will not allow.
* **Chained alibis, and the room that lies twice.** A statement's "who was with me" is not just flavour: if the evidence you hold breaks a named companion's own account of where they were, it breaks this statement too ("their own story just fell apart, so they were not with you either"). It never counts as proof by itself against the person who named them -- a witness whose own alibi collapses makes them a weaker witness, not a suspect. This is now the norm, not a rare surprise: the killer's own alibi names a real companion, an innocent guest who honestly believes they spent the window together, in **9 out of 10 cases** with a cast big enough to support it (5+ guests) -- so a shared room whose headcount hides two different truths is something you should expect to untangle in most games, not stumble into once in a while. The first time you place the un-named claimant correctly, THE NIGHT plays a one-time cinematic beat, **"Two stories, one room"** -- a split, cracking screen contrasting what was sworn against what was actually counted -- rather than a line of text you might miss.
* **The story moves with the clock.** A visible clock runs while you work (walking, questioning, waiting: *WAIT 10 MIN* in the menu). Suspects keep schedules and really walk between rooms and the hub, and the killer keeps slipping into the sealed scene; catch them there (and find their room empty and the chair still warm) and you earn a clue of your own. Get close while they are still coming or going and slip away uncaught, and it is a real beat, not a line of text: the screen flashes cold, the room shakes, a banner announces the door is still swinging, and the killer runs visibly rattled the next time you talk to them. The night deepens with the story: the storm builds (rain, snow, thunder), the power fails halfway (weak emergency light and a flashlight cone), the crowd gathers at the scene door. Catching the sneak used to mean camping the scene on a hunch; ask the Inspector for *NIGHT WATCH* and the log names the window (a real clock time, read straight off the same schedule the killer walks) so you can plan a stakeout instead -- it never says who, only when and where the watch runs thin.
* **Signature interactions.** Every setting has one short, optional verb that earns a headcount: peer through the porthole in time with the paddle wheel (riverboat, liner), scrub the projector for the frame at the shot (studio), tune the polar radio to the station log, work the fly ropes (theatre), watch for the bridge from the train window, listen at the club door in the band's rests, sweep a UV lamp over the gallery's glass, dust the tea urn or globe for prints (fete, manor), follow tracks in the snow (lodge), listen to the kitchen pass (restaurant). Skippable with X, hint-able with ENTER, never required.
* **The Inspector** briefs you, gives *LEADS* when you are stuck (the first is free; more slip your rank), opens THE NIGHT, reads you the *NIGHT WATCH* log (free, any time, as often as you like), and takes your **accusation**: name the culprit from your table, name the motive, and the killer faces a **showdown**: break the alibi and *I was never there* before four chances run out. Win, and the **reconstruction** replays the night in the setting itself. Three wrong accusations and the case goes cold. Your **rank** (S to D) counts wrong accusations, slips (wrong presents and table entries), hints and missed clues, so a clean deduction is worth something.
* Saves automatically (browser localStorage, one slot per case; saves from earlier versions keep their progress, drop their pinned strings and restart at the entrance) and by the menu's SAVE. Sound is synthesized (no audio files): a generated score per setting (waltz for the opera house, shuffle for the steamer, drone for the polar station...), ambience beds (wind, waves, rain, train rhythm, crowd, projector whirr), footsteps that suit the ground, a voice blip per speaker.

How it works: `src/game/world.ts` builds the maps, NPC positions and clue placement from the case (pure and deterministic, so it is unit-tested for reachability and solvability across every setting and tone); `src/game/env.ts` holds the twelve environments (room themes, weather, music), `hubs.ts`/`hubs2.ts`/`rooms.ts` lay them out, `src/game/art/` paints every tile, prop and icon from rectangles (no image assets), `render.ts` does lighting and weather; `facts.ts` is the night model (the shot, the claims, what each clue establishes, the staff's headcounts, the rule for when a clue really contradicts a statement, and the checker behind THE NIGHT table; `tests/game-deduction.test.ts` proves with a solver that uses only claims and headcounts that every generated case has exactly one solution); `testimony.ts` writes the statements from those facts; `sim.ts` is the living venue (schedules and walkers); `rituals.ts` + `scenes/ritual.ts` are the signature interactions; `logic.ts` holds the rules; `scenes/` are the screens. A case needs at least two characters, a killer and some evidence to be playable; otherwise the page says what is missing.

## Spoiler safety

Player-facing data comes from `shared/export.ts::buildPlayerPacket`, a pure function that **whitelists** fields:

* a sheet contains only that character's own information plus the public roster (names and public bios);
* every sheet has exactly the same sections in the same order (`sheetSections`), so the killer's sheet is structurally identical to everyone else's;
* clue cards carry the description text and a neutral kind label only: no titles, veracity, red-herring flags, implicated characters or solution.

The HTML preview, print output and PDFs all render from this packet. `tests/export.test.ts` and `tests/pdf.test.ts` plant sentinel strings in every private field and assert none leak (including into the PDF bytes).

## Data model (`shared/models.ts`, zod schemas + inferred types)

* **Case**: title, setting `{name, era, description}`, tone (`comedic | serious | noir`), player range, victim, and the collections below, plus `extras` and the generation `seed`.
* **Character**: name, secretRole, publicBio, privateBackstory, relationships `[{targetId, label, visibility}]`, alibi (free text), **alibiPlace** (the room they claim, structured), **alibiWithIds[]** (characters who vouch for them; companions must be mutual and agree on the room), secrets[], isKiller, costume, accent. `alibiPlace` and `alibiWithIds` default to empty, so JSON exported before they existed still imports.
* **Motive**: characterId, strength (`weak | strong`), category, description, evidenceIds[].
* **Evidence**: title (GM only), description, kind (`physical | verbal`), veracity (`true | red-herring`), implicatedIds[]. *When* it appears is defined by the beat that lists it (a clue lives in at most one beat).
* **RedHerring**: evidenceId, whyPlausible, debunkBeatId, debunkEvidenceId, debunkNote. Kept in sync with `veracity` by the ops in `shared/ops.ts`.
* **Beat**: title, description, timeLabel, round, trigger (`manual | timer | player-action`), timerSeconds, actionPrompt, evidenceIds[], gmNotes.
* **Extras**: props, generalCostumes, miniGames, difficulty (1-5), runtimeMinutes.

The server validates structure and length, not referential integrity: dangling references are legal to store so the checker can flag them.

## API

`GET/POST /api/cases`, `GET/PUT/DELETE /api/cases/:id`, `POST /api/cases/:id/duplicate`, `GET /api/cases/:id/export`, `POST /api/cases/import`, `GET /api/cases/:id/run` and `PUT /api/cases/:id/run` (GM run state, validated; an older revision never overwrites a newer one), `GET /api/settings`, `GET /api/health`. Cases live in a single JSON file (`cases.json`) and GM run state in a sibling `runs.json`, both written atomically (temp file + rename, serialised writes). A corrupt file is moved aside (`cases.corrupt-<ts>.json`) and the app starts empty; invalid individual cases are skipped.

## Layout

```
shared/            code shared by client and server (pure, unit-tested)
  models.ts          zod schemas + types, import parsing
  checker.ts         consistency checker
  ops.ts             immutable case operations (cascading deletes, scheduling, …)
  export.ts          spoiler-safe player packet + GM packet + sheet sections
  pdf.ts             jsPDF renderers (sheets, handouts, GM packet)
  run.ts             game-master run state machine
  solution.ts        solution key derivation
  generator/         rng, names, settings/roles, text pools, generate()
server/            optional Express app + JSON-file store (not used by the shipped client)
ios/               Capacitor-generated Xcode project (see "iOS app" below)
assets/            icon.png / splash.png sources for `npx capacitor-assets generate`
src/               React client
  styles/            tokens.css (design tokens), base, components, layouts (+ print)
  ui/                design-system components, snackbar/confirm provider
  editor/            workspace shell, wizard steps, undo/autosave hook, dnd list
  gm/                live game-master view + persistent run hook
  export/            print/PDF view
  pages/             library, design-system gallery
  game/              the detective game: environments, world builder, rules, pixel art, audio, scenes, gallery (lazy-loaded)
tests/             Vitest suites (checker, generator, fairness + prose sweeps, export, pdf, run, ops, api, game)
e2e/               optional Chrome regression script (`npm run e2e`)
```

## iOS app

The client is wrapped for iOS with [Capacitor](https://capacitorjs.com) (`capacitor.config.ts`, app id `com.foulplay.app`, generated project in `ios/`). It ships as a fully offline, client-only app — same on-device storage as the web build, no bundled server, no CocoaPods needed for the current plugin set (SPM only).

Local build (needs full Xcode, not just the Command Line Tools, from the Mac App Store):

```bash
npm run build      # typecheck + production client bundle
npx cap sync ios   # copy dist/ into the iOS project, update native deps
open ios/App/App.xcodeproj
```

Then pick a simulator or a signed-in device and press Run.

Regenerating the icon/splash screen: edit `assets/icon.png` (1024×1024, no alpha channel) and/or `assets/splash.png` (2732×2732), then `npx capacitor-assets generate --ios`.

Native plugins in use: `@capacitor/filesystem` + `@capacitor/share` so "download" (PDF/JSON export) hands the file to the iOS share sheet instead of a browser download, which WKWebView has no equivalent of.

### Cloud build (no local Xcode needed): Codemagic

`codemagic.yaml` at the repo root defines an `ios-workflow` that installs deps, builds the client, syncs Capacitor, archives a signed IPA and uploads it to TestFlight — entirely on Codemagic's own Mac, using the `mac_mini_m2` instance (covered by their free monthly build-minute tier). It only runs when you click **Start new build** (no `triggering` section, so pushes never auto-consume build minutes).

Steps only you can do (all one-time, on Apple's / Codemagic's sites, no Xcode required):

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. Create the app record in [App Store Connect](https://appstoreconnect.apple.com) (bundle id `com.foulplay.app`, name, category, age rating, a privacy policy URL — this app collects no data and stores everything on-device, which the policy should say). Note the numeric **Apple ID** App Store Connect assigns the app (App Information tab) and put it in `codemagic.yaml`'s `APP_STORE_APPLE_ID`.
3. In App Store Connect → **Users and Access → Integrations → App Store Connect API**, create a key with **App Manager** access. Note the Issuer ID, Key ID, and download the `.p8` private key.
4. In [Codemagic](https://codemagic.io), sign up, connect this GitHub repo (`LNakai-OSU/foul-play`), and under **Team settings → Integrations → App Store Connect**, add those three values as an integration named `codemagic` (matches `integrations.app_store_connect` in `codemagic.yaml`) — Codemagic uses it to create/fetch the signing certificate and provisioning profile automatically, no manual cert wrangling.
5. Push this branch, open the project in Codemagic's dashboard, pick `ios-workflow`, and **Start new build**. It publishes straight to TestFlight (`submit_to_testflight: true`); install the TestFlight app on your iPhone to try it.
6. Once you're happy with a build, add screenshots, description and keywords in App Store Connect, flip `submit_to_app_store: true` (or submit that build manually from App Store Connect), and submit for review.

### Monetization

The iOS app caps the on-device library at `FREE_CASE_LIMIT` (5) cases; a one-time, non-consumable In-App Purchase unlocks unlimited cases (`src/purchases.ts`, `src/paywall.tsx`). It's verified entirely on-device via [RevenueCat](https://www.revenuecat.com) — no backend, consistent with the rest of the app. **The web build is never gated** — the limit only applies when running as the native iOS app.

Setup (in addition to the Apple Developer / App Store Connect steps above):

1. In App Store Connect, add an In-App Purchase to the app: type **Non-Consumable**, e.g. product id `com.foulplay.app.full_library`, price tier $0.99, display name "Full Library Unlock".
2. Create a free [RevenueCat](https://app.revenuecat.com) account and project, connect it to App Store Connect (Project settings → Apps → iOS app, using the same App Store Connect API key from step 3 above), and attach that product.
3. In RevenueCat, create an **entitlement** called `full_library` attached to the product, then an **offering** with a package of type **Lifetime** pointing at it (`src/purchases.ts` looks for `offering.current.lifetime` first).
4. Copy the iOS **public app-specific API key** from RevenueCat's project settings (API keys tab — safe to embed client-side, it's not a secret) into `REVENUECAT_IOS_API_KEY` in `src/purchases.ts`.

Until that key is filled in, `src/purchases.ts` treats the app as ungated (nobody gets locked out by an unconfigured paywall). Apple requires a "Restore Purchase" option for non-consumables, which is in the paywall dialog.

## Design system

Tokens in `src/styles/tokens.css` follow Material 3 structure: color roles (primary brass, secondary smoke, tertiary blood, error, success/warning/info, five surface-container tiers, outline), a 15-role type scale (Playfair Display, Inter, Special Elite), a shape scale, elevation levels with tonal tint, state-layer opacities, motion tokens (all collapsed by `prefers-reduced-motion`) and a spacing scale. Components (buttons in five emphasis levels, icon buttons, cards, chips, filled text fields, switches, segmented buttons, tabs, stepper, dialogs, snackbar, menus, nav sidebar/rail, empty states, callouts) use only those tokens; focus rings use `:focus-visible`. The layout collapses to a nav rail below 1100px.

## Known limitations

* GM run state is on-device: it does not sync across devices unless the optional `server/` is wired back up.
* PDFs use built-in Latin-1 PDF fonts: characters outside Latin-1 are replaced with `?`.
* Two browser tabs editing the same case last-write-wins.
