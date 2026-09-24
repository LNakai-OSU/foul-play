/**
 * Plays a generated case through the real UI in Chrome, from the title screen to the ending card, the way a thinking player would:
 * finds every clue, questions everyone (and the staff who counted heads at the shot), works the setting's signature interaction,
 * cross-examines (a wrong present costs nerve; a real contradiction lands an OBJECTION), catches the killer sneaking into the
 * sealed scene, rebuilds THE NIGHT on the table from the claims and headcounts alone (it finds the liar by the room that comes
 * up short, not by reading the answer key), names them, and wins the two-part showdown. Catches stuck dialogues, dead-end
 * story states and console errors that unit tests cannot.
 *
 * Optional, not part of `npm test`:  npm run e2e:play [tone] [seed] [setting]     (tone: comedic | serious | noir)
 * With the argument `sweep` it plays several settings back to back.
 * It uses the dev-only `window.__game` / `window.__logic` hooks to teleport next to things (walking is covered by run.mjs).
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sweep = process.argv[2] === 'sweep';
const runs = sweep
  ? [['noir', 42, 'riverboat'], ['comedic', 7, 'studio'], ['serious', 11, 'station'], ['noir', 5, 'train'], ['comedic', 21, 'theatre'], ['serious', 3, 'club']]
  : [[process.argv[2] || 'noir', Number(process.argv[3] || 42), process.argv[4] || undefined]];
const API = 3191;
const WEB = 5191;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const data = mkdtempSync(path.join(tmpdir(), 'foulplay-play-'));
const env = { ...process.env, PORT: String(API), DATA_DIR: data };
const procs = [
  spawn('npx', ['tsx', 'server/index.ts'], { cwd: root, env, stdio: 'ignore' }),
  spawn('npx', ['vite', '--port', String(WEB), '--strictPort'], { cwd: root, env, stdio: 'ignore' }),
];
const base = `http://127.0.0.1:${WEB}`;
let browser;
const finish = (code) => {
  for (const p of procs) p.kill();
  spawn('pkill', ['-f', `vite --port ${WEB}`]);
  rmSync(data, { recursive: true, force: true });
  process.exit(code);
};
process.on('uncaughtException', (e) => {
  console.error(e);
  browser?.close().catch(() => {});
  finish(1);
});
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timed out waiting for ${url}`);
}
await waitFor(`${base}/api/health`);
browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function play([tone, seed, settingId]) {
  const c = await (await fetch(`${base}/api/cases`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ generate: { seed, tone, playerMin: 6, playerMax: 8, ...(settingId ? { settingId } : {}) } }) })).json();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const problems = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`${base}/#/case/${c.id}/play`);
  await page.waitForSelector('canvas.game-canvas', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);
  const tag = `${settingId ?? 'any'}/${tone}${seed}`;
  const top = () => page.evaluate(() => __game.top?.constructor.name);
  const wait = (ms) => page.waitForTimeout(ms);
  const key = async (k, gap = 130) => { await page.keyboard.press(k); await wait(gap); };
  const log = (...a) => console.log(`[${tag}]`, ...a);
  async function until(fn, ms = 15000, label = '') { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await wait(60); } log('TIMEOUT', label, 'top=', await top()); throw new Error('timeout ' + label); }
  const isChoosing = () => page.evaluate(() => __game.top?.choosing === true);
  async function pump(label = 'pump', ms = 90000) {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > ms) throw new Error('pump timeout ' + label + ' top=' + (await top()));
      const t = await top();
      if (t === 'DialogueScene') { if (await isChoosing()) return 'choice'; await key('Space', 90); }
      else if (t === 'ClueCardScene') await key('Space', 140);
      else if (t === 'TimeCardScene') { await wait(600); await key('Space', 200); }
      else if (t === 'SecondTruthScene') { await wait(1700); await key('Space', 200); }
      else if (t === 'Transition' || t === 'ReconstructionScene') await wait(80);
      else if (t === 'StmtMenu' || t === 'PickScene' || t === 'NightScene' || t === 'NotebookScene' || t === 'RitualScene') return t;
      else if (t === 'BattleScene') { const ph = await page.evaluate(() => __game.top.phase); if (ph === 'menu' || ph === 'testimony' || ph === 'ask') return t; await wait(80); }
      else return t;
    }
  }
  /** Walk up to a suspect (wherever the schedule has them right now), a clue, the inspector, a witness or the ritual prop. */
  async function stand(sel) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const ok = await page.evaluate((sel) => {
        const g = __game, w = g.world; let target = null, mapId = null;
        const ow = g.scenes.find((s) => s.constructor.name === 'OverworldScene');
        if (sel.char) { const wk = g.sim.walkers.get(sel.char); if (wk) { target = wk; mapId = wk.map; wk.wait = 500; } }
        for (const m of Object.values(w.maps)) {
          for (const n of m.npcs) if (sel.npc && n.kind === sel.npc) { target = n; mapId = m.id; }
          for (const it of m.items) if (sel.item && it.evidenceId === sel.item) { target = it; mapId = m.id; }
        }
        if (sel.wit) {
          // staff wander the hub: make sure the hub is the map that is loaded
          if (g.state.map !== w.hubId) { const h = w.maps[w.hubId]; g.state.map = w.hubId; g.state.x = h.entrance.x; g.state.y = h.entrance.y; return false; }
          const e = ow && ow.wanderers.find((x) => x.def.witnessId === sel.wit); if (e) { target = e; mapId = w.hubId; }
        }
        if (sel.ritual && w.ritual) { target = w.ritual; mapId = w.ritual.map; }
        if (!target) return false;
        const m = w.maps[mapId];
        const free = (x, y) => !__logic.blockedAt(m, x, y, g.state.found) && !g.sim.at(mapId, x, y) && !(ow && ow.wanderers.some((e) => e.x === x && e.y === y));
        for (const [dx, dy, dir] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) if (free(target.x + dx, target.y + dy)) { g.state.map = mapId; g.state.x = target.x + dx; g.state.y = target.y + dy; g.state.dir = dir; return true; }
        return false;
      }, sel);
      if (ok) { await wait(160); return; }
      await wait(400);
    }
    const dbg = await page.evaluate(() => { const g = __game, w = g.world; const rt = w.ritual; return JSON.stringify({ rt, map: g.state.map, top: g.top?.constructor.name, walkers: [...g.sim.walkers.values()].map((k) => [k.map, k.x, k.y]) }); });
    throw new Error('cannot stand near ' + JSON.stringify(sel) + ' ' + dbg);
  }
  /** Walk up to a suspect and start the interview; if they wandered off (or a line of chatter got in the way), try again. */
  async function meet(p) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await stand({ char: p.id }); await key('Space', 200);
      const t0 = Date.now();
      while (Date.now() - t0 < 5000) { const t = await top(); if (t === 'BattleScene') return; if (t === 'DialogueScene' || t === 'ClueCardScene' || t === 'TimeCardScene') break; await wait(80); }
      // whatever got in the way (a line of chatter, or catching the killer sneaking about): sit through it, then try again
      if (['DialogueScene', 'ClueCardScene', 'TimeCardScene'].includes(await top())) { const t2 = await pump('interruption'); if (t2 === 'BattleScene') return; }
    }
    throw new Error('could not start an interview with ' + p.name);
  }
  async function choose(idx) { for (let i = 0; i < 12; i++) { const cur = await page.evaluate(() => __game.top.cur); if (cur === idx) break; await key('ArrowDown', 90); } await key('Space', 150); }
  async function pickIndex(idx) { for (let i = 0; i < idx; i++) await key('ArrowDown', 60); await key('Space', 220); }
  const state = () => page.evaluate(() => { const w = __game.world; return { found: __game.state.found.filter((id) => !w.hidden.includes(id)).length, total: w.c.evidence.length - w.hidden.length, chapter: __game.state.chapter, chapters: w.chapters.length, met: __game.state.met.length, misses: __game.state.misses, strikes: __game.state.strikes }; });

  // ---- new game
  await key('Enter', 300); await key('Enter', 300); await page.keyboard.type('SAM'); await key('Enter', 400);
  await until(() => __game.top?.constructor.name === 'DialogueScene', 8000, 'intro');
  await pump('intro'); await until(() => __game.top?.constructor.name === 'OverworldScene', 8000, 'overworld');
  log('started; env =', await page.evaluate(() => __game.world.env));
  // the scene door is taped off until the inspector has briefed you
  const taped = await page.evaluate(() => { const g = __game, w = g.world, hub = w.maps[w.hubId]; const wp = hub.warps.find((x) => x.scene); return !!wp && !g.state.briefed; });
  if (!taped) throw new Error('scene not sealed before the briefing');

  // ---- the inspector briefs you
  await stand({ npc: 'inspector' }); await key('Space', 200);
  let r = await pump('briefing'); if (r === 'choice') { await choose(0); r = await pump('leads'); }
  const info = await page.evaluate(() => { const w = __game.world; return { suspects: w.c.characters.map((x) => ({ id: x.id, name: x.name })), wits: w.witnesses.map((x) => x.id) }; });

  // ---- the signature interaction (optional): work it once, through the real controls
  if (await page.evaluate(() => !!__game.world.ritual)) {
    await stand({ ritual: true }); await key('Space', 250);
    await until(() => __game.top?.constructor.name === 'RitualScene', 5000, 'ritual');
    await wait(500); await key('Space', 200); // begin
    const mech = await page.evaluate(() => __game.top.def.mech);
    const need = await page.evaluate(() => __game.top.need);
    if (mech === 'rhythm' || mech === 'chain') {
      // one repeating window (rhythm), or three different-length windows back to back (chain): watch for it to open, hit it
      for (let n = 0; n < need; n++) { await until(() => __game.top.windowOpen(), 8000, `${mech} window ${n}`); await key('Space', 500); }
    } else if (mech === 'scrub') {
      // approach the fixed target, then lock
      await page.evaluate(() => { __game.top.value = __game.top.target; }); await wait(100); await key('Space', 300);
    } else if (mech === 'hold') {
      // hold SPACE while a level rises and falls; let go right at the mark, `need` times
      for (let n = 0; n < need; n++) {
        await page.keyboard.down('Space');
        await until(() => { const t = __game.top; return t.holding && Math.abs(t.holdVal - t.target) < 0.08; }, 6000, `hold level ${n}`);
        await page.keyboard.up('Space');
        await wait(220);
      }
    } else if (mech === 'reverse') {
      // the target drifts; chase it (cheating the approach, same spirit as `scrub` above) and hold SPACE steady on it until it locks
      await page.keyboard.down('Space');
      await until(() => { const t = __game.top; t.value = t.target; return t.phase === 'win' || t.lockT > 20; }, 8000, 'reverse lock');
      await page.keyboard.up('Space');
    } else if (mech === 'scan') {
      // a cursor jumps between fixed candidates; visit every real one and confirm it, in whatever order is nearest
      const total = await page.evaluate(() => __game.top.scanItems.length);
      let pos = await page.evaluate(() => __game.top.scanIdx);
      const reals = await page.evaluate(() => __game.top.scanItems.map((it, i) => (it.real ? i : -1)).filter((i) => i >= 0));
      for (const target of reals) {
        const steps = (target - pos + total) % total;
        for (let i = 0; i < steps; i++) await key('ArrowRight', 90);
        pos = target;
        await key('Space', 220);
      }
    } else {
      // reveal (any order) / track (in order): sweep the lamp straight to each mark and mark it
      for (let n = 0; n < need; n++) { await page.evaluate((n) => { const t = __game.top; const m = t.marks[n]; t.cx = m.x; t.cy = m.y; }, n); await wait(80); await key('Space', 250); }
    }
    await until(() => __game.top?.constructor.name === 'RitualScene' && __game.top.phase === 'win', 8000, 'ritual win'); await wait(500); await key('Space', 200);
    await pump('ritual clue'); await until(() => __game.top?.constructor.name === 'OverworldScene', 10000, 'after ritual');
    log('ritual worked:', await page.evaluate(() => __game.state.found.includes(__game.world.ritual.evId)));
  }

  // ---- investigate in rounds
  for (let round = 1; round <= 12; round++) {
    const st = await state();
    if (st.found >= st.total && round > 2) break;
    const pending = await page.evaluate(() => { const g = __game, w = g.world, s = g.state; const open = new Set(); for (let i = 0; i <= s.chapter; i++) w.chapters[i].evidenceIds.forEach((id) => open.add(id)); return Object.values(w.maps).flatMap((m) => m.items.map((i) => i.evidenceId)).filter((id) => open.has(id) && !s.found.includes(id) && !w.hidden.includes(id)); });
    for (const id of pending) { await stand({ item: id }); await key('Space', 250); await pump('pickup ' + id); await until(() => __game.top?.constructor.name === 'OverworldScene', 10000, 'after pickup'); }
    // the staff who counted heads at the shot
    for (const wid of info.wits) {
      const left = await page.evaluate((wid) => __logic.tipsLeft(__game.world, __game.state, wid).ready.length, wid);
      if (!left) continue;
      await stand({ wit: wid }); await key('Space', 250);
      r = await pump('witness'); if (r !== 'choice') continue;
      await choose(0); await pump('witness clue');
      await until(() => __game.top?.constructor.name === 'OverworldScene', 12000, 'after witness');
    }
    for (const p of info.suspects) {
      // only bother people who can give something new
      const need = await page.evaluate((cid) => __logic.tipsLeft(__game.world, __game.state, cid).ready.length, p.id);
      if (round > 1 && !need) continue;
      await meet(p);
      await pump('battle intro');
      for (const topic of round === 1 ? [0, 1, 2, 3] : [1]) {
        await page.evaluate(() => { __game.top.cur = 0; });
        await key('Space', 250);
        await until(() => __game.top?.phase === 'ask', 5000, 'ask menu');
        for (let i = 0; i < topic; i++) await key('ArrowDown', 80);
        await key('Space', 200);
        await pump('topic ' + topic);
      }
      // read their statements and PRESS the first one: it must not crash and must lead somewhere
      if (round === 1) {
        await page.evaluate(() => { __game.top.cur = 1; }); await key('Space', 250);
        await until(() => __game.top?.phase === 'testimony', 5000, 'testimony');
        await key('Space', 250); await until(() => __game.top?.constructor.name === 'StmtMenu', 5000, 'stmt menu');
        await key('Space', 250); await pump('press'); // PRESS
        await until(() => __game.top?.constructor.name === 'BattleScene' && __game.top.phase === 'testimony', 8000, 'back to testimony');
        await key('Escape', 250);
      }
      if ((await top()) === 'BattleScene') { await page.evaluate(() => { __game.top.cur = 3; }); await key('Space', 250); await pump('leave'); }
      await until(() => __game.top?.constructor.name === 'OverworldScene', 15000, 'back in overworld');
    }
    const after = await state();
    log(`round ${round}: found ${after.found}/${after.total}, chapter ${after.chapter + 1}/${after.chapters}, met ${after.met}`);
  }
  const fin = await state();
  log('investigation over', JSON.stringify(fin));

  // ---- a wrong guess costs nerve and tells you why; a motive clue really breaks "I had no reason"
  const probe = await page.evaluate(() => { const g = __game, w = g.world, s = g.state; const f = w.c.evidence.map((e) => e.id).filter((id) => s.found.includes(id) && w.facts[id]?.kind === 'object')[0]; const mot = w.c.characters.map((ch) => ({ ch, ev: s.found.find((id) => w.facts[id]?.kind === 'motive' && w.facts[id].who.includes(ch.id)) })).find((x) => x.ev && x.ch.id !== w.killerId); return { obj: f, mot: mot ? { char: mot.ch.id, name: mot.ch.name, ev: mot.ev } : null }; });
  if (probe.mot && probe.obj) {
    await meet({ id: probe.mot.char, name: probe.mot.name }); await pump('probe intro');
    const idx = async (kind) => page.evaluate((k) => __game.top.statements.findIndex((s) => s.kind === k), kind);
    const openPick = async (stmtKind) => {
      if ((await page.evaluate(() => __game.top.phase)) === 'menu') { await page.evaluate(() => { __game.top.cur = 1; }); await key('Space', 250); }
      await until(() => __game.top?.phase === 'testimony', 5000, 'testimony');
      const i = await idx(stmtKind);
      for (let k = 0; k < 6; k++) { const cur = await page.evaluate(() => __game.top.stmtCur); if (cur === i) break; await key('ArrowRight', 80); }
      await key('Space', 250); await until(() => __game.top?.constructor.name === 'StmtMenu', 5000, 'stmt menu');
      await key('ArrowDown', 80); await key('Space', 250);
      await until(() => __game.top?.constructor.name === 'PickScene', 5000, 'present list');
    };
    const before = await page.evaluate(() => __game.state.misses);
    await openPick('where');
    await pickIndex(await page.evaluate((ev) => __game.state.found.indexOf(ev), probe.obj));
    await pump('wrong present');
    const after1 = await page.evaluate(() => __game.state.misses);
    log('wrong present cost a miss:', after1 === before + 1);
    if (after1 !== before + 1) throw new Error('wrong present did not cost anything');
    await openPick('why');
    await pickIndex(await page.evaluate((ev) => __game.state.found.indexOf(ev), probe.mot.ev));
    await pump('objection');
    const cracked = await page.evaluate((id) => __game.state.cracked.includes(`${id}:why`), probe.mot.char);
    log('OBJECTION on a real motive:', cracked);
    if (!cracked) throw new Error('motive did not break WHY');
    if ((await top()) === 'BattleScene') { const ph = await page.evaluate(() => __game.top.phase); if (ph === 'testimony') await key('Escape', 250); await page.evaluate(() => { __game.top.cur = 3; }); await key('Space', 250); await pump('leave'); }
    await until(() => __game.top?.constructor.name === 'OverworldScene', 15000, 'back in overworld');
  }

  // ---- stakeout: the killer slips into the sealed scene; walk in on them
  const plan = await page.evaluate(() => { const g = __game; return g.sim.plan.sneaks.find((x) => x.to > g.state.tmin + 6) ?? null; });
  const already = await page.evaluate(() => __game.state.found.includes(__game.world.caughtId));
  if (already) log('the killer was already caught sneaking about during the investigation');
  if (plan && !already) {
    await page.evaluate((p) => { const g = __game; g.state.tmin = Math.max(g.state.tmin, p.from + 3); const w = g.world; const m = w.maps[w.sceneMapId]; g.state.map = w.sceneMapId; g.state.x = m.entrance.x; g.state.y = m.entrance.y; g.state.dir = 'up'; }, plan);
    await wait(300); // the scene loads; the killer's walk from the door begins
    await until(() => ['DialogueScene', 'ClueCardScene'].includes(__game.top?.constructor.name), 25000, 'caught the killer');
    await pump('caught'); await until(() => __game.top?.constructor.name === 'OverworldScene', 12000, 'after catch');
    log('caught the killer in the scene:', await page.evaluate(() => __game.state.found.includes(__game.world.caughtId)));
  }

  // ---- rebuild THE NIGHT from the claims and the headcounts: the liar is the room that comes up short
  await key('Enter', 300); await until(() => __game.top?.constructor.name === 'MenuScene', 4000, 'menu');
  await page.evaluate(() => { __game.top.cur = 2; }); await key('Space', 300);
  await until(() => __game.top?.constructor.name === 'NightScene', 5000, 'night');
  const nRows = await page.evaluate(() => __game.world.c.characters.length);
  await page.evaluate((n) => { __game.top.cur = n; }, nRows); await key('Space', 300); // AT THEIR WORD
  const liar = await page.evaluate(() => {
    const w = __game.world, s = __game.state; const chk = __logic.checkNight(w, s);
    // a room short of the people who swore to be there: whoever claims it is the one whose story fails
    const short = chk.issues.find((i) => i.room !== w.sceneMapId && i.ids.length < 1) ?? null;
    for (const [room, ids] of Object.entries(Object.groupBy(Object.entries(w.claims), ([, cl]) => cl.room))) {
      const obs = Object.values(w.facts).flatMap((f) => (f.obs ?? [])).find((o) => o.room === room && o.dt === 0 && s.found.some((id) => w.facts[id]?.obs?.includes(o)));
      if (obs && obs.max < ids.length) {
        // a named witness (obs.only) tells us exactly who was really there: the liar is whichever claimant is NOT named.
        // With no such witness, the first claimant is as good a guess as any (this branch only fires on the room the
        // killer actually lied about, so any claimant we pick there is the killer by construction).
        const notNamed = obs.only ? ids.find(([id]) => !obs.only.includes(id)) : ids[0];
        const pick = (notNamed ?? ids[0])[0];
        return { id: pick, idx: w.c.characters.findIndex((c) => c.id === pick), short: !!short };
      }
    }
    return null;
  });
  if (!liar) throw new Error('no room came up short: the table does not point anywhere');
  log('the table flags a story that does not add up: guest #' + liar.idx);
  await page.evaluate((i) => { __game.top.cur = i; }, liar.idx); await key('Space', 300);   // pick them up
  await page.evaluate(() => { __game.top.roomCur = 0; }); await key('Space', 300);           // ...and put them at the scene (room 0)
  // this exact move is what proves a witness right by identity, not just headcount, in a cover-witness case (now ~90% of
  // generated casts -- see generate.ts): THE NIGHT plays a one-time cinematic ("Two stories, one room") before handing
  // control back. Sit through it like any other cutscene rather than letting it swallow the next keypresses.
  if ((await top()) === 'SecondTruthScene') {
    log('the "two stories, one room" vignette fired');
    await wait(1700); // it only accepts SPACE once its caption has had time to read (this.t > 96 frames, ~1.6s)
    for (let i = 0; i < 5 && (await top()) === 'SecondTruthScene'; i++) await key('Space', 250);
    await until(() => __game.top?.constructor.name === 'NightScene', 4000, 'back from the second-truth vignette');
  }
  const chk = await page.evaluate(() => { const c = __logic.checkNight(__game.world, __game.state); return { complete: c.complete, issues: c.issues.map((i) => i.text), unplaced: c.unplaced.length }; });
  log('table:', JSON.stringify(chk));
  if (!chk.complete) throw new Error('the reconstructed night does not hold together: ' + JSON.stringify(chk));
  await key('Escape', 300); await key('Escape', 300);
  await until(() => __game.top?.constructor.name === 'OverworldScene', 8000, 'left the table');

  // ---- accuse the person alone with the body
  await stand({ npc: 'inspector' }); await key('Space', 250);
  r = await pump('inspector'); if (r !== 'choice') throw new Error('no inspector menu: ' + r);
  // Inspector menu is now LEADS / CASE FILE / THE NIGHT / NIGHT WATCH / ACCUSE / NEVERMIND (round 11 added
  // NIGHT WATCH at index 3, shifting ACCUSE from 3 to 4).
  await choose(4); r = await pump('accuse ask'); if (r !== 'choice') throw new Error('no yes/no: ' + r);
  await choose(0);
  await until(() => __game.top?.constructor.name === 'NightScene', 8000, 'accuse table');
  await page.evaluate((i) => { __game.top.cur = i; }, liar.idx);
  await key('Enter', 400);
  await until(() => __game.top?.constructor.name === 'PickScene', 8000, 'motive list'); await wait(300);
  const LABEL = { money: 'Greed', love: 'A love gone wrong', revenge: 'Revenge', jealousy: 'Jealousy', power: 'Power', secrecy: 'Silencing a secret', inheritance: 'The inheritance', ambition: 'Ambition' };
  const motiveIdx = await page.evaluate(([LABEL, liarIdx]) => { const w = __game.world; const cid = w.c.characters[liarIdx].id; const mine = w.c.motives.filter((m) => m.characterId === cid); const cat = (mine.find((m) => m.strength === 'strong') ?? mine[0])?.category ?? 'money'; return __game.top.items.findIndex((i) => i.label === LABEL[cat]); }, [LABEL, liar.idx]);
  await pickIndex(motiveIdx);
  r = await pump('resolve'); log('after accusation top=', r);
  await until(() => __game.top?.constructor.name === 'BattleScene', 15000, 'showdown');
  await pump('showdown intro');

  // ---- the showdown: break the alibi (WHERE), then "I was never there" (SCENE) with two clues tied together
  const sets = await page.evaluate(() => { const g = __game, w = g.world, s = g.state; const k = w.killerId; const st = __logic.testimony(w, k); const f = (kind) => ({ stmt: st.findIndex((x) => x.kind === kind), set: __logic.breakingSets(w, s, k, kind).sort((a, z) => a.filter((id) => w.hidden.includes(id)).length - z.filter((id) => w.hidden.includes(id)).length || z.length - a.length)[0] }); return { where: f('where'), scene: f('scene') }; });
  log('showdown picks', JSON.stringify(sets));
  await page.evaluate(() => { __game.top.cur = 0; }); await key('Space', 250);
  for (const kind of ['where', 'scene']) {
    if ((await top()) !== 'BattleScene') break;
    await until(() => __game.top?.constructor.name === 'BattleScene' && __game.top.phase === 'testimony', 8000, 'showdown testimony');
    const { stmt, set } = sets[kind];
    for (let k = 0; k < 6; k++) { const cur = await page.evaluate(() => __game.top.stmtCur); if (cur === stmt) break; await key('ArrowRight', 80); }
    await key('Space', 250); await until(() => __game.top?.constructor.name === 'StmtMenu', 5000, 'showdown stmt menu');
    await key('ArrowDown', 80); await key('Space', 250);
    await until(() => __game.top?.constructor.name === 'PickScene', 5000, 'showdown pick');
    const found = await page.evaluate(() => __game.state.found);
    await pickIndex(found.indexOf(set[0]));
    if (kind === 'scene' && set.length > 1) {
      await until(() => __game.top?.constructor.name === 'PickScene', 5000, 'second pick');
      const rest = found.filter((id) => id !== set[0]);
      await pickIndex(1 + rest.indexOf(set[1])); // item 0 is "(THIS ONE ALONE)"
    } else if (kind === 'scene') {
      // a single decisive clue still goes through the combine list: choose "THIS ONE ALONE" when it is offered
      if ((await top()) === 'PickScene') await pickIndex(0);
    }
    const t = await pump('showdown present');
    if (t !== 'BattleScene') { log('showdown ended after', kind, '; top=', t); break; }
  }
  await pump('ending story', 120000);
  await until(() => __game.top?.constructor.name === 'EndingScene' && __game.top.phase === 'card', 60000, 'ending card');
  await wait(800);
  const end = await page.evaluate(() => ({ done: __game.state.done, rank: __game.state.rank, strikes: __game.state.strikes, misses: __game.state.misses, hints: __game.state.hintsUsed }));
  log('ENDING', JSON.stringify(end), 'problems:', problems.length ? problems : 'none');
  await page.close();
  return end.done === 'won' && !problems.length;
}

let ok = true;
for (const run of runs) {
  try { ok = (await play(run)) && ok; } catch (e) { console.error('FAILED', run.join('/'), e.message); ok = false; }
}
await browser.close();
finish(ok ? 0 : 2);
