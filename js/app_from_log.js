Created At: 2026-10-06T21:39:56+03:00
Completed At: 2026-10-06T21:39:56+03:00
File Path: `file:///c:/built-different/js/app.js`
Total Lines: 595
Total Bytes: 44119
Showing lines 1 to 595
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: /* BUILT DIFFERENT - core app (zero-build vanilla JS)
2:    Sections: State · Helpers · Workout engine · Nutrition · Weight/Progress · Views · Events */
3: (function () {
4:   'use strict';
5: 
6:   /* ============================ STATE ============================ */
7:   const KEY = 'built_different_state';
8:   const EX = window.BD_EXERCISES, FOODS = window.BD_FOODS;
9:   const MUSCLES = window.BD_MUSCLES, EQUIP = window.BD_EQUIPMENT;
10: 
11:   const defaults = () => ({
12:     active: null,            // {startedAt, exercises:[{exId, sets:[{type,kg,reps,done,pr}]}]}
13:     history: [],             // newest first: {id,date,duration,volume,prs,exercises:[{exId,sets}]}
14:     routines: [],            // {id,name,exIds:[]}
15:     nutrition: {},           // 'YYYY-MM-DD' -> [{foodId,name,grams,label,kcal,p,c,f}]
16:     weights: [],             // {date,kg} sorted ascending
17:     goals: { kcal: 2400, protein: 160, carbs: 260, fat: 70 },
18:     restSeconds: 90,
19:     customFoods: [],         // user-created foods (same shape as seed foods + custom:true)
20:     favorites: [],           // starred food ids
21:     foodCounts: {},          // foodId -> times logged (drives "frequent foods")
22:     seeded: false
23:   });
24: 
25:   const PRESET_ROUTINES = [
26:     { name: 'Push · דחיפה', exIds: ['bench-press', 'incline-db-press', 'overhead-press', 'lateral-raise', 'tricep-pushdown', 'dips'] },
27:     { name: 'Pull · משיכה', exIds: ['deadlift', 'pull-up', 'bent-over-row', 'lat-pulldown', 'face-pull', 'bicep-curl'] },
28:     { name: 'Legs · רגליים', exIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'leg-extension', 'calf-raise'] },
29:     { name: 'Full Body · כל הגוף', exIds: ['squat', 'bench-press', 'bent-over-row', 'overhead-press', 'bicep-curl', 'plank'] }
30:   ];
31: 
32:   function load() {
33:     let s;
34:     try { s = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { s = defaults(); }
35:     if (!s.seeded) {
36:       if (!s.routines.length) s.routines = PRESET_ROUTINES.map(r => ({ id: 'preset-' + r.name.split(' ')[0].toLowerCase(), name: r.name, exIds: r.exIds.slice() }));
37:       s.seeded = true;
38:     }
39:     return s;
40:   }
41:   let S = load();
42:   const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
43: 
44:   const ui = { tab: 'workout', modal: null, menu: null, libQ: '', libMuscle: 'all', libEq: 'all', rest: null };
45: 
46:   /* ============================ HELPERS ============================ */
47:   const $ = (s, r = document) => r.querySelector(s);
48:   const exById = id => EX.find(e => e.id === id);
49:   const FOOD_CATS = window.BD_FOOD_CATS;
50:   const MEALS = [
51:     { k: 'breakfast', he: 'ארוחת בוקר' }, { k: 'lunch', he: 'ארוחת צהריים' },
52:     { k: 'dinner', he: 'ארוחת ערב' }, { k: 'snack', he: 'ביניים / שייק' }
53:   ];
54:   const allFoods = () => FOODS.concat(S.customFoods);
55:   const foodById = id => allFoods().find(f => f.id === id);
56:   function currentMeal() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; }
57:   function logFood(f, grams, label, meal) {
58:     const k = todayKey();
59:     (S.nutrition[k] = S.nutrition[k] || []).push(Object.assign({ foodId: f.id, name: f.he, grams, label, meal: meal || currentMeal() }, calcFood(f, grams)));
60:     S.foodCounts[f.id] = (S.foodCounts[f.id] || 0) + 1; save();
61:   }
62:   const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
63:   const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
64:   const r1 = n => Math.round(n * 10) / 10;
65:   const fmtN = n => (Math.round(n * 10) / 10).toLocaleString('he-IL');
66:   const pad = n => String(n).padStart(2, '0');
67:   const fmtClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };
68:   const fmtDate = iso => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
69:   const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
70:   const icons = () => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} };
71: 
72:   function toast(msg, ok) {
73:     const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (ok ? ' ok' : '');
74:     clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
75:   }
76:   function beep() {
77:     try {
78:       const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
79:       o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15;
80:       o.start(); o.stop(c.currentTime + 0.35);
81:     } catch (e) {}
82:     if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
83:   }
84: 
85:   /* ============================ WORKOUT ENGINE ============================ */
86:   const newSet = () => ({ type: 'N', kg: '', reps: '', done: false, pr: false });
87: 
88:   function startWorkout(exIds) {
89:     S.active = { startedAt: Date.now(), exercises: (exIds || []).map(id => ({ exId: id, sets: [newSet()] })) };
90:     save(); render();
91:   }
92:   function addExercise(id) {
93:     if (!S.active) startWorkout([]);
94:     S.active.exercises.push({ exId: id, sets: [newSet()] });
95:     save();
96:   }
97: 
98:   /** Previous saved set for an exercise at the same set index. */
99:   function prevSet(exId, idx) {
100:     for (const w of S.history) {
101:       const e = w.exercises.find(x => x.exId === exId);
102:       if (e) return e.sets[idx] || null;
103:     }
104:     return null;
105:   }
106:   const prevLabel = p => p ? `${fmtN(p.kg)}×${p.reps}` : '—';
107: 
108:   const e1rm = (kg, reps) => reps <= 1 ? kg : kg * (1 + reps / 30);
109: 
110:   /** Best historic numbers (working sets only) for PR detection. */
111:   function bestFor(exId, ignoreSet) {
112:     let kg = 0, rm = 0, any = false;
113:     const eat = s => { if (s === ignoreSet || s.type === 'W' || !(num(s.kg) > 0) || !(num(s.reps) > 0)) return; any = true; kg = Math.max(kg, num(s.kg)); rm = Math.max(rm, e1rm(num(s.kg), num(s.reps))); };
114:     S.history.forEach(w => w.exercises.filter(e => e.exId === exId).forEach(e => e.sets.forEach(eat)));
115:     if (S.active) S.active.exercises.filter(e => e.exId === exId).forEach(e => e.sets.forEach(s => s.done && eat(s)));
116:     return { kg, rm, any };
117:   }
118: 
119:   function setVolume(s) { return s.done && s.type !== 'W' ? num(s.kg) * num(s.reps) : 0; }
120:   function workoutVolume(w) { return w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + setVolume(Object.assign({ done: true }, s)), 0), 0); }
121:   const activeVolume = () => S.active ? S.active.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + setVolume(s), 0), 0) : 0;
122: 
123:   function toggleDone(ei, si) {
124:     const ex = S.active.exercises[ei], s = ex.sets[si];
125:     if (!s.done) {
126:       const p = prevSet(ex.exId, si);
127:       if (s.kg === '' && p) s.kg = p.kg;           // fall back to previous values
128:       if (s.reps === '' && p) s.reps = p.reps;
129:       if (!(num(s.reps) > 0)) { toast('הזן חזרות לפני סימון הסט'); return; }
130:       s.done = true;
131:       const b = bestFor(ex.exId, s);
132:       s.pr = s.type !== 'W' && b.any && num(s.kg) > 0 && (num(s.kg) > b.kg || e1rm(num(s.kg), num(s.reps)) > b.rm + 0.01);
133:       if (s.pr) { toast('🏆 שיא אישי! ' + exById(ex.exId).he, false); }
134:       startRest(S.restSeconds);
135:     } else { s.done = false; s.pr = false; }
136:     save(); render();
137:   }
138: 
139:   function finishWorkout() {
140:     const a = S.active;
141:     const exercises = a.exercises.map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done).map(s => ({ type: s.type, kg: num(s.kg), reps: num(s.reps), pr: !!s.pr })) })).filter(e => e.sets.length);
142:     if (!exercises.length) {
143:       if (!confirm('אין סטים שהושלמו. לבטל את האימון?')) return;
144:       S.active = null; stopRest(); save(); render(); return;
145:     }
146:     const w = { id: uid(), date: new Date().toISOString(), duration: Math.floor((Date.now() - a.startedAt) / 1000), exercises };
147:     w.volume = workoutVolume(w);
148:     w.prs = exercises.reduce((n, e) => n + e.sets.filter(s => s.pr).length, 0);
149:     S.history.unshift(w); S.active = null; stopRest(); save();
150:     ui.modal = { type: 'summary', w }; render();
151:   }
152: 
153:   /* ---- Rest timer ---- */
154:   function startRest(sec) { ui.rest = { end: Date.now() + sec * 1000, total: sec }; renderRest(true); }
155:   function stopRest() { ui.rest = null; renderRest(); }
156:   function renderRest(full) {
157:     const el = $('#rest-bar');
158:     if (!ui.rest) { el.classList.add('hidden'); el.innerHTML = ''; return; }
159:     el.classList.remove('hidden');
160:     if (full || !el.innerHTML) {
161:       el.innerHTML = `<div class="flex items-center justify-between gap-2">
162:         <div><div class="text-[11px] muted font-bold">זמן מנוחה</div><div id="rest-time" class="rest-time">0:00</div></div>
163:         <div class="flex gap-2">
164:           <button class="btn" data-action="rest-sub">-15</button>
165:           <button class="btn" data-action="rest-add">+15</button>
166:           <button class="btn btn-primary" data-action="rest-skip">דלג</button>
167:         </div></div><div id="rest-prog" class="rest-progress"></div>`;
168:     }
169:     const left = (ui.rest.end - Date.now()) / 1000;
170:     $('#rest-time').textContent = fmtClock(Math.ceil(left));
171:     $('#rest-prog').style.width = Math.max(0, Math.min(100, left / ui.rest.total * 100)) + '%';
172:   }
173:   setInterval(() => {
174:     if (ui.rest) {
175:       if (ui.rest.end - Date.now() <= 0) { beep(); stopRest(); toast('המנוחה הסתיימה – לסט הבא! 💪', true); }
176:       else renderRest();
177:     }
178:     const t = $('#wk-timer');
179:     if (t && S.active) t.textContent = fmtClock((Date.now() - S.active.startedAt) / 1000);
180:   }, 250);
181: 
182:   /* ============================ NUTRITION ============================ */
183:   const dayLog = (d = todayKey()) => S.nutrition[d] || [];
184:   const calcFood = (food, grams) => { const k = grams / 100; return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k }; };
185:   function dayTotals(d) { return dayLog(d).reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { kcal: 0, p: 0, c: 0, f: 0 }); }
186: 
187:   /* ============================ WEIGHT ============================ */
188:   function addWeight(kg) {
189:     const d = todayKey(), i = S.weights.findIndex(w => w.date === d);
190:     if (i >= 0) S.weights[i].kg = kg; else S.weights.push({ date: d, kg });
191:     S.weights.sort((a, b) => a.date.localeCompare(b.date)); save();
192:   }
193: 
194:   /* ============================ VIEWS ============================ */
195:   function renderHeader() {
196:     const t = dayTotals(todayKey());
197:     $('#daily-badge').innerHTML = `<b>${Math.round(t.kcal)}</b> / ${S.goals.kcal} קק"ל<br>נפח היום: ${Math.round(activeVolume() || todayVolume())} ק"ג`;
198:   }
199:   function todayVolume() { const k = todayKey(); return S.history.filter(w => w.date.slice(0, 10) === k || new Date(w.date).toDateString() === new Date().toDateString()).reduce((a, w) => a + w.volume, 0); }
200: 
201:   function render() {
202:     document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === ui.tab));
203:     renderHeader();
204:     $('#screen').innerHTML = { workout: viewWorkout, library: viewLibrary, nutrition: viewNutrition, progress: viewProgress }[ui.tab]();
205:     renderModal(); renderRest(); icons();
206:   }
207: 
208:   /* ---- Active workout ---- */
209:   const TYPE_LABEL = { N: 'סט רגיל', W: 'W · חימום', D: 'D · דרופ-סט', F: 'F · כשל' };
210: 
211:   function viewWorkout() {
212:     if (!S.active) {
213:       return `<div class="card text-center py-6">
214:         <div class="text-5xl mb-2">🏋️</div>
215:         <div class="text-2xl font-black italic">מוכן להתאמן?</div>
216:         <button class="btn btn-primary btn-block text-lg mt-3" data-action="start-empty">התחל אימון ריק</button>
217:       </div>
218:       <div class="flex items-center justify-between mb-2"><div class="card-title text-lg">התבניות שלי</div>
219:         <button class="btn btn-ghost !py-1" data-action="new-routine">+ תבנית חדשה</button></div>
220:       ${S.routines.length ? S.routines.map(routineCard).join('') : '<div class="card muted text-sm">אין תבניות עדיין.</div>'}
221:       <div class="card-title text-lg mt-4 mb-2">היסטוריית אימונים</div>
222:       ${historyCards()}`;
223:     }
224:     const a = S.active;
225:     return `<div class="card flex items-center justify-between sticky top-[62px] z-20">
226:         <div><div class="text-[11px] muted font-bold">משך אימון</div><div id="wk-timer" class="text-2xl font-black tabular-nums" dir="ltr">${fmtClock((Date.now() - a.startedAt) / 1000)}</div></div>
227:         <div class="text-center"><div class="text-[11px] muted font-bold">נפח כולל</div><div class="text-lg font-black text-emerald-400"><span id="vol-total">${fmtN(activeVolume())}</span> ק"ג</div></div>
228:         <button class="btn btn-success" data-action="finish">סיים ושמור אימון</button>
229:       </div>
230:       ${a.exercises.map(exCard).join('')}
231:       <button class="btn btn-primary btn-block mb-3" data-action="add-ex-open">+ הוסף תרגיל</button>
232:       <div class="flex gap-2">
233:         <button class="btn btn-ghost flex-1" data-action="save-routine">שמור כתבנית</button>
234:         <button class="btn btn-danger flex-1" data-action="cancel-workout">בטל אימון</button>
235:       </div>`;
236:   }
237: 
238:   function exCard(e, ei) {
239:     const ex = exById(e.exId);
240:     let normalN = 0;
241:     const rows = e.sets.map((s, si) => {
242:       if (s.type === 'N') normalN++;
243:       const label = s.type === 'N' ? normalN : s.type;
244:       const p = prevSet(e.exId, si);
245:       const menu = ui.menu && ui.menu.ei === ei && ui.menu.si === si ? `<div class="type-menu">${Object.keys(TYPE_LABEL).map(t => `<button data-action="set-type" data-ei="${ei}" data-si="${si}" data-t="${t}">${TYPE_LABEL[t]}</button>`).join('')}<button data-action="del-set" data-ei="${ei}" data-si="${si}" style="color:#ef4444">מחק סט</button></div>` : '';
246:       return `<div class="set-row set-grid ${s.done ? 'done' : ''}">
247:         <div class="relative"><button class="type-btn type-${s.type}" data-action="type-menu" data-ei="${ei}" data-si="${si}">${label}</button>${menu}</div>
248:         <button class="prev-cell" data-action="use-prev" data-ei="${ei}" data-si="${si}">${prevLabel(p)}</button>
249:         <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${p ? p.kg : '0'}" value="${s.kg}" data-field="kg" data-ei="${ei}" data-si="${si}" />
250:         <input type="number" inputmode="numeric" min="0" placeholder="${p ? p.reps : '0'}" value="${s.reps}" data-field="reps" data-ei="${ei}" data-si="${si}" />
251:         <button class="check-btn" data-action="toggle-done" data-ei="${ei}" data-si="${si}"><i data-lucide="check"></i></button>
252:         ${s.pr ? `<span class="pr-badge" style="position:absolute;top:-6px;left:4px">🏆 שיא אישי</span>` : ''}
253:       </div>`;
254:     }).join('');
255:     return `<div class="card">
256:       <div class="flex items-start justify-between mb-2">
257:         <div><div class="card-title">${ex.he}</div><div class="text-[11px] muted">${ex.en} · ${EQUIP[ex.equipment].he}</div></div>
258:         <button class="btn btn-ghost !p-1" data-action="remove-ex" data-ei="${ei}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
259:       </div>
260:       <div class="set-grid set-head"><div>סט</div><div>אימון קודם</div><div>ק"ג</div><div>חזרות</div><div>✓</div></div>
261:       ${rows}
262:       <button class="btn btn-block mt-2 !py-2" data-action="add-set" data-ei="${ei}">+ הוסף סט</button>
263:     </div>`;
264:   }
265: 
266:   function historyCards() {
267:     if (!S.history.length) return '<div class="card muted text-sm text-center">עדיין אין אימונים שמורים. סיים אימון כדי לראות אותו כאן.</div>';
268:     return S.history.slice(0, 20).map(w => `<div class="card">
269:       <div class="flex items-center justify-between"><div class="card-title">${new Date(w.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
270:         <button class="btn btn-ghost !p-1" data-action="del-workout" data-id="${w.id}" aria-label="מחק אימון">🗑</button></div>
271:       <div class="flex gap-3 text-sm my-1"><span>⏱ ${fmtClock(w.duration)}</span><span>🏋️ ${fmtN(w.volume)} ק"ג</span>${w.prs ? `<span class="pr-badge" style="align-self:center">🏆 ${w.prs} שיאים</span>` : ''}</div>
272:       <div class="text-[11px] muted">${w.exercises.map(e => `${(exById(e.exId) || { he: '?' }).he} (${e.sets.length})`).join(' · ')}</div></div>`).join('');
273:   }
274: 
275:   /* ---- Library & routines ---- */
276:   function filteredExercises(q, mus, eq) {
277:     q = (q || '').trim().toLowerCase();
278:     return EX.filter(e => (mus === 'all' || e.muscle === mus) && (eq === 'all' || e.equipment === eq) && (!q || e.he.includes(q) || e.en.toLowerCase().includes(q)));
279:   }
280:   function chips(map, cur, action) {
281:     return `<div class="scroll-x"><button class="chip ${cur === 'all' ? 'active' : ''}" data-action="${action}" data-v="all">הכל</button>` +
282:       Object.keys(map).map(k => `<button class="chip ${cur === k ? 'active' : ''}" data-action="${action}" data-v="${k}">${map[k].he}</button>`).join('') + '</div>';
283:   }
284:   function exerciseListHTML(list, action, btnLabel) {
285:     if (!list.length) return '<div class="muted text-center py-6">לא נמצאו תרגילים</div>';
286:     return list.map(e => `<div class="list-item"><div><div class="font-bold">${e.he}</div>
287:       <div class="text-[11px] muted">${e.en} · ${MUSCLES[e.muscle].he} · ${EQUIP[e.equipment].he}</div></div>
288:       <button class="btn btn-ghost" data-action="${action}" data-id="${e.id}">${btnLabel}</button></div>`).join('');
289:   }
290: 
291:   function routineCard(r) {
292:     return `<div class="card"><div class="flex items-center justify-between">
293:         <div><div class="font-bold">${r.name}</div><div class="text-xs muted">${r.exIds.length} תרגילים</div></div>
294:         <div class="flex gap-1"><button class="btn btn-success" data-action="start-routine" data-id="${r.id}">התחל אימון</button>
295:         <button class="btn btn-danger" data-action="del-routine" data-id="${r.id}" aria-label="מחק תבנית">🗑</button></div></div>
296:         <div class="text-[11px] muted mt-1">${r.exIds.map(i => (exById(i) || { he: '?' }).he).join(' · ')}</div></div>`;
297:   }
298: 
299:   function viewLibrary() {
300:     return `<div class="flex items-center justify-between mb-2"><div class="card-title text-lg">תבניות אימון</div>
301:         <button class="btn btn-primary !py-1.5" data-action="new-routine">+ תבנית חדשה</button></div>
302:       ${S.routines.length ? S.routines.map(routineCard).join('')
303:         : '<div class="card muted text-sm">אין תבניות עדיין. לחץ על "תבנית חדשה".</div>'}
304:       <div class="card-title mt-4 mb-2 text-lg">ספריית תרגילים (${EX.length})</div>
305:       <input class="input mb-2" placeholder="חיפוש תרגיל..." data-search="lib" value="${ui.libQ}" />
306:       ${chips(MUSCLES, ui.libMuscle, 'lib-muscle')}${chips(EQUIP, ui.libEq, 'lib-eq')}
307:       <div class="card" id="lib-list">${exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון')}</div>`;
308:   }
309: 
310:   /* ---- Nutrition ---- */
311:   function macroBar(label, val, goal, color, unit) {
312:     const pct = Math.min(100, goal ? val / goal * 100 : 0);
313:     return `<div class="mb-2"><div class="flex justify-between text-xs mb-1"><span class="font-bold">${label}</span><span class="muted">${fmtN(val)} / ${goal} ${unit}</span></div>
314:       <div class="bar"><div style="width:${pct}%;background:${color}"></div></div></div>`;
315:   }
316:   function viewNutrition() {
317:     const t = dayTotals(todayKey()), g = S.goals, log = dayLog();
318:     return `<div class="card">
319:       <div class="flex items-center justify-between mb-3"><div class="card-title">סיכום יומי</div>
320:         <button class="btn btn-ghost !p-1 text-xs" data-action="edit-goals">ערוך יעדים</button></div>
321:       <div class="text-center mb-3"><span class="text-4xl font-black">${Math.round(t.kcal)}</span><span class="muted"> / ${g.kcal} קק"ל</span></div>
322:       ${macroBar('קלוריות', t.kcal, g.kcal, '#3b82f6', 'קק"ל')}
323:       ${macroBar('חלבון', t.p, g.protein, '#10b981', 'ג׳')}
324:       ${macroBar('פחמימות', t.c, g.carbs, '#f59e0b', 'ג׳')}
325:       ${macroBar('שומן', t.f, g.fat, '#ef4444', 'ג׳')}
326:     </div>
327:     <button class="btn btn-primary btn-block mb-3" data-action="food-open">+ הוסף מזון (מילון המזונות)</button>
328:     ${MEALS.map(meal => {
329:       const items = log.map((it, idx) => Object.assign({ idx }, it)).filter(it => (it.meal || 'snack') === meal.k);
330:       const kc = items.reduce((a, i) => a + i.kcal, 0);
331:       return `<div class="card"><div class="flex items-center justify-between mb-1"><div class="card-title">${meal.he}</div><span class="text-xs muted">${Math.round(kc)} קק"ל</span></div>
332:         ${items.length ? items.map(i => `<div class="list-item"><div><div class="font-bold text-sm">${i.name}</div>
333:           <div class="text-[11px] muted">${i.label} · ח ${fmtN(i.p)} · פ ${fmtN(i.c)} · ש ${fmtN(i.f)}</div></div>
334:           <div class="flex items-center gap-2"><b>${Math.round(i.kcal)}</b><button class="btn btn-danger !p-1.5" data-action="food-del" data-i="${i.idx}" aria-label="מחק">🗑</button></div></div>`).join('')
335:           : '<div class="muted text-xs py-2">— ריק —</div>'}</div>`;
336:     }).join('')}`;
337:   }
338: 
339:   /* ---- Weight & progress ---- */
340:   function lineChart(points, w = 320, h = 140) {
341:     if (points.length < 2) return '<div class="muted text-sm text-center py-8">הוסף לפחות 2 שקילות להצגת גרף</div>';
342:     const vals = points.map(p => p.kg), min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5, px = 14;
343:     const X = i => px + i * (w - 2 * px) / (points.length - 1), Y = v => h - 18 - (v - min) / (max - min) * (h - 36);
344:     const path = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.kg).toFixed(1)).join(' ');
345:     return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">
346:       <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
347:       ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.kg)}" r="3.5" fill="#10b981"/>`).join('')}
348:       <text x="${px}" y="12" fill="#8794ad" font-size="10">${max.toFixed(1)}</text>
349:       <text x="${px}" y="${h - 3}" fill="#8794ad" font-size="10">${min.toFixed(1)}</text></svg>`;
350:   }
351:   function barChart(items, w = 320, h = 120) {
352:     if (!items.length) return '<div class="muted text-sm text-center py-8">שמור אימון כדי לראות התקדמות</div>';
353:     const max = Math.max(...items.map(i => i.v), 1), bw = (w - 10) / items.length;
354:     return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">${items.map((it, i) => {
355:       const bh = it.v / max * (h - 24);
356:       return `<rect x="${5 + i * bw + 2}" y="${h - 14 - bh}" width="${bw - 4}" height="${bh}" rx="3" fill="${it.pr ? '#f59e0b' : '#3b82f6'}"/>`;
357:     }).join('')}</svg>`;
358:   }
359:   function viewProgress() {
360:     const ws = S.weights, last = ws[ws.length - 1], first = ws[0];
361:     const delta = last && first && ws.length > 1 ? r1(last.kg - first.kg) : 0;
362:     const hist = S.history.slice(0, 12).reverse();
363:     const totalPR = S.history.reduce((a, w) => a + (w.prs || 0), 0);
364:     return `<div class="card">
365:       <div class="card-title mb-2">משקל גוף</div>
366:       <div class="flex gap-2 mb-3"><input id="weight-input" type="number" step="0.1" inputmode="decimal" class="input" dir="ltr" placeholder='ק"ג' value="${last ? last.kg : ''}" />
367:       <button class="btn btn-primary" data-action="weight-add">שמור</button></div>
368:       <div class="flex justify-between text-sm mb-2"><span>נוכחי: <b>${last ? last.kg + ' ק"ג' : '—'}</b></span>
369:       <span class="${delta <= 0 ? 'text-emerald-400' : 'text-amber-400'}">שינוי: <b dir="ltr">${delta > 0 ? '+' : ''}${delta}</b></span></div>
370:       ${lineChart(ws.slice(-30))}
371:     </div>
372:     <div class="card"><div class="card-title mb-1">נפח אימונים (12 אחרונים)</div>${barChart(hist.map(w => ({ v: w.volume, pr: w.prs > 0 })))}
373:       <div class="text-xs muted mt-1">עמודה כתומה = אימון עם שיא אישי · סה"כ אימונים: ${S.history.length} · שיאים: ${totalPR}</div></div>
374:     ${S.history.length ? `<div class="card"><div class="card-title mb-1">היסטוריית אימונים</div>${S.history.slice(0, 10).map(w => `
375:       <div class="list-item"><div><div class="font-bold text-sm">${fmtDate(w.date)} · ${w.exercises.length} תרגילים</div>
376:       <div class="text-[11px] muted">${fmtClock(w.duration)}${w.prs ? ` · 🏆 ${w.prs}` : ''}</div></div><b>${fmtN(w.volume)} ק"ג</b></div>`).join('')}</div>` : ''}
377:     ${ws.length ? `<div class="card"><div class="card-title mb-1">שקילות אחרונות</div>${ws.slice(-6).reverse().map(w => `
378:       <div class="list-item"><span>${fmtDate(w.date)}</span><span class="flex items-center gap-2"><b>${w.kg} ק"ג</b>
379:       <button class="btn btn-ghost !p-1" data-action="weight-del" data-d="${w.date}"><i data-lucide="x" class="w-4 h-4"></i></button></span></div>`).join('')}</div>` : ''}`;
380:   }
381: 
382:   /* ---- Modals ---- */
383:   function sheet(title, body) {
384:     return `<div class="modal-back" data-action="close-modal-bg"><div class="modal-sheet">
385:       <div class="flex items-center justify-between p-4"><div class="text-lg font-black">${title}</div>
386:       <button class="btn btn-ghost !p-1" data-action="close-modal" aria-label="סגור"><i data-lucide="x"></i></button></div>
387:       <div class="modal-body">${body}</div></div></div>`;
388:   }
389:   function closeModal() { ui.modal = null; render(); }
390: 
391:   function routinePickHTML() {
392:     const m = ui.modal, list = filteredExercises(m.q, 'all', 'all');
393:     return list.map(e => { const on = m.ids.includes(e.id); return `<div class="list-item"><div><div class="font-bold text-sm">${e.he}</div>
394:       <div class="text-[11px] muted">${MUSCLES[e.muscle].he} · ${EQUIP[e.equipment].he}</div></div>
395:       <button class="btn ${on ? 'btn-success' : ''}" data-action="routine-toggle" data-id="${e.id}">${on ? '✓ נבחר' : 'בחר'}</button></div>`; }).join('') || '<div class="muted text-center py-6">לא נמצא</div>';
396:   }
397: 
398:   function foodRow(f) {
399:     const fav = S.favorites.includes(f.id);
400:     return `<div class="list-item"><button class="flex-1 text-right" style="background:none;border:0;color:inherit" data-action="food-pick" data-id="${f.id}">
401:         <div class="font-bold text-sm">${f.he}${f.custom ? ' <span class="pr-badge">אישי</span>' : ''}</div>
402:         <div class="text-[11px] muted">ל-100 ג׳: ${f.kcal} קק"ל · ח ${f.p} · פ ${f.c} · ש ${f.f}</div></button>
403:       <button class="btn btn-ghost !p-1" data-action="food-fav" data-id="${f.id}" style="color:${fav ? '#f59e0b' : '#8794ad'}" aria-label="מועדף">${fav ? '★' : '☆'}</button>
404:       <button class="btn btn-success !px-3" data-action="food-quick" data-id="${f.id}" aria-label="הוסף מהר">+</button></div>`;
405:   }
406:   function foodListHTML() {
407:     const m = ui.modal, q = (m.q || '').trim();
408:     const list = allFoods().filter(f => (m.cat === 'all' || f.cat === m.cat) && (!q || f.he.includes(q)));
409:     return list.length ? list.map(foodRow).join('') : '<div class="muted text-center py-6">לא נמצא. אפשר ליצור מאכל מותאם אישית ↑</div>';
410:   }
411:   function frequentFoods() {
412:     const ids = S.favorites.slice();
413:     Object.keys(S.foodCounts).sort((a, b) => S.foodCounts[b] - S.foodCounts[a]).slice(0, 6).forEach(id => { if (S.foodCounts[id] >= 2 && !ids.includes(id)) ids.push(id); });
414:     return ids.map(foodById).filter(Boolean);
415:   }
416:   function foodPreview() {
417:     const m = ui.modal, f = foodById(m.foodId);
418:     const grams = num(m.amount) * (m.unit === 'g' ? 1 : f.units[+m.unit].g);
419:     const c = calcFood(f, grams);
420:     return `<div class="text-xs muted mb-1">${Math.round(grams)} ג׳</div>
421:       <div class="grid grid-cols-4 gap-1"><div><b class="text-lg text-blue-400">${Math.round(c.kcal)}</b><div class="text-[10px] muted">קלוריות</div></div>
422:       <div><b class="text-lg text-emerald-400">${fmtN(c.p)}</b><div class="text-[10px] muted">חלבון</div></div>
423:       <div><b class="text-lg text-amber-400">${fmtN(c.c)}</b><div class="text-[10px] muted">פחמימות</div></div>
424:       <div><b class="text-lg text-red-400">${fmtN(c.f)}</b><div class="text-[10px] muted">שומן</div></div></div>`;
425:   }
426: 
427:   function foodModalHTML() {
428:     const m = ui.modal;
429:     const mealChips = `<div class="scroll-x">${MEALS.map(x => `<button class="chip ${m.meal === x.k ? 'active' : ''}" data-action="food-meal" data-v="${x.k}">${x.he}</button>`).join('')}</div>`;
430:     if (m.view === 'custom') {
431:       const c = m.cf, fld = (k, label, ph, type) => `<label class="block text-xs muted mb-2">${label}<input class="input mt-1" data-cf="${k}" type="${type || 'number'}" step="0.1" min="0" placeholder="${ph || ''}" value="${c[k]}" /></label>`;
432:       return sheet('מאכל מותאם אישית', `${fld('name', 'שם המאכל', 'למשל: שייק הבית', 'text')}
433:         <label class="block text-xs muted mb-2">קטגוריה<select class="input mt-1" data-cf="cat">${Object.keys(FOOD_CATS).map(k => `<option value="${k}" ${c.cat === k ? 'selected' : ''}>${FOOD_CATS[k]}</option>`).join('')}</select></label>
434:         <div class="text-xs font-bold mb-1">ערכים ל-100 גרם</div>
435:         <div class="grid grid-cols-2 gap-x-2">${fld('kcal', 'קלוריות')}${fld('p', 'חלבון (ג׳)')}${fld('c', 'פחמימות (ג׳)')}${fld('f', 'שומן (ג׳)')}</div>
436:         <div class="text-xs font-bold mb-1">יחידת מידה (אופציונלי)</div>
437:         <div class="grid grid-cols-2 gap-x-2">${fld('unitName', 'שם היחידה', 'יחידה / כף / גביע', 'text')}${fld('unitG', 'משקל היחידה בגרם', '')}</div>
438:         <div class="flex gap-2 mt-2"><button class="btn flex-1" data-action="food-back">חזרה</button><button class="btn btn-success flex-1" data-action="custom-save">שמור מאכל</button></div>`);
439:     }
440:     if (m.view === 'detail') {
441:       const f = foodById(m.foodId);
442:       return sheet(f.he, `${mealChips}<div class="text-xs muted my-2">ל-100 ג׳: ${f.kcal} קק"ל · ח ${f.p} · פ ${f.c} · ש ${f.f}</div>
443:         <div class="flex gap-2 mb-3"><input id="food-amount" class="input" type="number" step="0.5" min="0" dir="ltr" value="${m.amount}" />
444:         <select id="food-unit" class="input"><option value="g" ${m.unit === 'g' ? 'selected' : ''}>גרם</option>
445:         ${f.units.map((u, i) => `<option value="${i}" ${String(m.unit) === String(i) ? 'selected' : ''}>${u.name} (${u.g} ג׳)</option>`).join('')}</select></div>
446:         <div id="food-preview" class="card text-center">${foodPreview()}</div>
447:         <div class="flex gap-2"><button class="btn flex-1" data-action="food-back">חזרה</button><button class="btn btn-success flex-1" data-action="food-confirm">הוסף ל${MEALS.find(x => x.k === m.meal).he}</button></div>
448:         ${f.custom ? `<button class="btn btn-danger btn-block mt-2" data-action="custom-del" data-id="${f.id}">מחק מאכל מותאם</button>` : ''}`);
449:     }
450:     const fr = frequentFoods();
451:     return sheet('מילון המזונות', `${mealChips}
452:       <input class="input my-2" placeholder="חיפוש מזון..." data-search="food" value="${m.q || ''}" />
453:       <div class="scroll-x"><button class="chip ${m.cat === 'all' ? 'active' : ''}" data-action="food-cat" data-v="all">הכל</button>
454:         ${Object.keys(FOOD_CATS).map(k => `<button class="chip ${m.cat === k ? 'active' : ''}" data-action="food-cat" data-v="${k}">${FOOD_CATS[k]}</button>`).join('')}</div>
455:       <button class="btn btn-ghost btn-block mb-1" data-action="food-custom">+ מאכל מותאם אישית</button>
456:       ${fr.length ? `<div class="text-xs font-bold text-amber-400 mb-1">⭐ המאכלים הקבועים שלי (לחיצה = הוספה)</div>
457:         <div class="scroll-x mb-2">${fr.map(f => `<button class="chip" style="color:#fff" data-action="food-quick" data-id="${f.id}">+ ${f.he}</button>`).join('')}</div>` : ''}
458:       <div id="food-list">${foodListHTML()}</div>`);
459:   }
460: 
461:   function renderModal() {
462:     const el = $('#modal'), m = ui.modal;
463:     if (!m) { el.innerHTML = ''; return; }
464:     if (m.type === 'pickEx') {
465:       el.innerHTML = sheet('בחר תרגיל', `<input class="input mb-2" placeholder="חיפוש..." data-search="pick" value="${m.q || ''}" />
466:         ${chips(MUSCLES, m.mus || 'all', 'pick-muscle')}<div id="pick-list">${exerciseListHTML(filteredExercises(m.q, m.mus || 'all', 'all'), 'pick-ex', 'הוסף')}</div>`);
467:     } else if (m.type === 'food') {
468:       el.innerHTML = foodModalHTML();
469:     } else if (m.type === 'summary') {
470:       const w = m.w;
471:       el.innerHTML = sheet('האימון נשמר! 🔥', `<div class="grid grid-cols-3 gap-2 text-center mb-3">
472:         <div class="card !mb-0"><div class="text-[11px] muted">משך</div><b>${fmtClock(w.duration)}</b></div>
473:         <div class="card !mb-0"><div class="text-[11px] muted">נפח</div><b>${fmtN(w.volume)} ק"ג</b></div>
474:         <div class="card !mb-0"><div class="text-[11px] muted">שיאים</div><b>🏆 ${w.prs}</b></div></div>
475:         <button class="btn btn-primary btn-block" data-action="close-modal">סגור</button>`);
476:     } else if (m.type === 'routine') {
477:       el.innerHTML = sheet('שמירת תבנית', `<input id="routine-name" class="input mb-3" placeholder="שם התבנית (למשל: דחיפה)" value="${m.name || ''}" />
478:         <button class="btn btn-primary btn-block" data-action="routine-confirm">שמור</button>`);
479:     } else if (m.type === 'newRoutine') {
480:       el.innerHTML = sheet('תבנית חדשה', `<input id="routine-name" class="input mb-2" placeholder="שם התבנית" value="${m.name || ''}" />
481:         <input class="input mb-2" placeholder="חיפוש תרגיל..." data-search="rpick" value="${m.q || ''}" />
482:         <div id="rpick-list" style="max-height:42vh;overflow-y:auto">${routinePickHTML()}</div>
483:         <button class="btn btn-success btn-block mt-3" data-action="routine-create">צור תבנית (<span id="rcount">${m.ids.length}</span> תרגילים)</button>`);
484:     }
485:     icons();
486:   }
487: 
488:   /* ============================ EVENTS ============================ */
489:   document.addEventListener('click', ev => {
490:     const t = ev.target.closest('[data-action],[data-nav]'); if (!t) { if (ui.menu) { ui.menu = null; render(); } return; }
491:     if (t.dataset.nav) { ui.tab = t.dataset.nav; ui.menu = null; render(); window.scrollTo(0, 0); return; }
492:     const d = t.dataset, ei = +d.ei, si = +d.si;
493:     switch (d.action) {
494:       case 'start-empty': startWorkout([]); break;
495:       case 'start-routine': { const r = S.routines.find(x => x.id === d.id); if (S.active && !confirm('יש אימון פעיל. להחליף אותו?')) break; startWorkout(r.exIds); ui.tab = 'workout'; render(); break; }
496:       case 'add-ex-open': ui.modal = { type: 'pickEx', q: '', mus: 'all' }; render(); break;
497:       case 'pick-muscle': ui.modal.mus = d.v; renderModal(); break;
498:       case 'pick-ex': addExercise(d.id); ui.modal = null; render(); break;
499:       case 'remove-ex': if (confirm('להסיר את התרגיל?')) { S.active.exercises.splice(ei, 1); save(); render(); } break;
500:       case 'add-set': { const sets = S.active.exercises[ei].sets; sets.push(newSet()); save(); render(); break; }
501:       case 'del-set': { const sets = S.active.exercises[ei].sets; sets.splice(si, 1); ui.menu = null; save(); render(); break; }
502:       case 'type-menu': ui.menu = ui.menu && ui.menu.ei === ei && ui.menu.si === si ? null : { ei, si }; render(); ev.stopPropagation(); break;
503:       case 'set-type': S.active.exercises[ei].sets[si].type = d.t; ui.menu = null; save(); render(); break;
504:       case 'use-prev': { const ex = S.active.exercises[ei], p = prevSet(ex.exId, si); if (p) { ex.sets[si].kg = p.kg; ex.sets[si].reps = p.reps; save(); render(); } break; }
505:       case 'toggle-done': toggleDone(ei, si); break;
506:       case 'finish': finishWorkout(); break;
507:       case 'cancel-workout': if (confirm('לבטל את האימון הפעיל? הנתונים יימחקו.')) { S.active = null; stopRest(); save(); render(); } break;
508:       case 'save-routine': ui.modal = { type: 'routine', name: '' }; renderModal(); break;
509:       case 'routine-confirm': { const n = (ui.modal.name || '').trim() || 'תבנית חדשה'; S.routines.push({ id: uid(), name: n, exIds: S.active.exercises.map(e => e.exId) }); ui.modal = null; save(); render(); toast('התבנית נשמרה', true); break; }
510:       case 'new-routine': ui.modal = { type: 'newRoutine', name: '', ids: [], q: '' }; renderModal(); break;
511:       case 'routine-toggle': {
512:         const ids = ui.modal.ids, i = ids.indexOf(d.id); if (i >= 0) ids.splice(i, 1); else ids.push(d.id);
513:         $('#rpick-list').innerHTML = routinePickHTML(); $('#rcount').textContent = ids.length; icons(); break;
514:       }
515:       case 'routine-create': {
516:         const m = ui.modal; if (!m.ids.length) { toast('בחר לפחות תרגיל אחד'); break; }
517:         S.routines.push({ id: uid(), name: (m.name || '').trim() || 'תבנית חדשה', exIds: m.ids.slice() });
518:         ui.modal = null; save(); render(); toast('התבנית נוצרה', true); break;
519:       }
520:       case 'del-routine': if (confirm('למחוק תבנית?')) { S.routines = S.routines.filter(r => r.id !== d.id); save(); render(); toast('התבנית נמחקה'); } break;
521:       case 'del-workout': if (confirm('למחוק את האימון מההיסטוריה?')) { S.history = S.history.filter(w => w.id !== d.id); save(); render(); toast('האימון נמחק'); } break;
522:       case 'rest-add': if (ui.rest) { ui.rest.end += 15000; ui.rest.total += 15; renderRest(); } break;
523:       case 'rest-sub': if (ui.rest) { ui.rest.end -= 15000; ui.rest.total = Math.max(1, ui.rest.total - 15); renderRest(); } break;
524:       case 'rest-skip': stopRest(); break;
525:       case 'lib-muscle': ui.libMuscle = d.v; render(); break;
526:       case 'lib-eq': ui.libEq = d.v; render(); break;
527:       case 'lib-add': addExercise(d.id); toast('התרגיל נוסף לאימון הפעיל', true); renderHeader(); break;
528:       case 'food-open': ui.modal = { type: 'food', view: 'list', q: '', cat: 'all', meal: currentMeal() }; renderModal(); break;
529:       case 'food-cat': ui.modal.cat = d.v; renderModal(); break;
530:       case 'food-meal': ui.modal.meal = d.v; renderModal(); break;
531:       case 'food-pick': { const f = foodById(d.id); ui.modal.view = 'detail'; ui.modal.foodId = f.id; ui.modal.amount = f.units.length ? 1 : 100; ui.modal.unit = f.units.length ? '0' : 'g'; renderModal(); break; }
532:       case 'food-back': ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); break;
533:       case 'food-fav': { const i = S.favorites.indexOf(d.id); if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(d.id); save(); renderModal(); break; }
534:       case 'food-quick': {                       // 1-click log of the default serving
535:         const f = foodById(d.id), u = f.units[0], g = u ? u.g : 100;
536:         logFood(f, g, u ? `1 ${u.name} (${Math.round(g)} ג׳)` : '100 ג׳', ui.modal.meal); toast(`נוסף: ${f.he}`, true); render(); break;
537:       }
538:       case 'food-confirm': {
539:         const m = ui.modal, f = foodById(m.foodId), amt = num(m.amount); if (!(amt > 0)) { toast('הזן כמות'); break; }
540:         const grams = amt * (m.unit === 'g' ? 1 : f.units[+m.unit].g);
541:         logFood(f, grams, m.unit === 'g' ? grams + ' ג׳' : `${amt} ${f.units[+m.unit].name} (${Math.round(grams)} ג׳)`, m.meal);
542:         ui.modal = null; render(); toast('נוסף לתפריט', true); break;
543:       }
544:       case 'food-custom': ui.modal.view = 'custom'; ui.modal.cf = { name: '', cat: 'protein', kcal: '', p: '', c: '', f: '', unitName: '', unitG: '' }; renderModal(); break;
545:       case 'custom-save': {
546:         const c = ui.modal.cf; if (!c.name.trim() || !(num(c.kcal) >= 0) || c.kcal === '') { toast('הזן שם וקלוריות ל-100 ג׳'); break; }
547:         const f = { id: 'c_' + uid(), he: c.name.trim(), cat: c.cat, kcal: num(c.kcal), p: num(c.p), c: num(c.c), f: num(c.f), custom: true, units: [] };
548:         if (c.unitName.trim() && num(c.unitG) > 0) f.units.push({ name: c.unitName.trim(), g: num(c.unitG) });
549:         S.customFoods.push(f); S.favorites.push(f.id); save(); toast('המאכל נשמר', true);
550:         ui.modal.view = 'detail'; ui.modal.foodId = f.id; ui.modal.amount = f.units.length ? 1 : 100; ui.modal.unit = f.units.length ? '0' : 'g'; renderModal(); break;
551:       }
552:       case 'custom-del': if (confirm('למחוק את המאכל המותאם?')) { S.customFoods = S.customFoods.filter(f => f.id !== d.id); S.favorites = S.favorites.filter(x => x !== d.id); save(); ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); toast('המאכל נמחק'); } break;
553:       case 'food-del': { const it = dayLog()[+d.i]; if (it) { dayLog().splice(+d.i, 1); save(); render(); toast('נמחק: ' + it.name); } break; }
554:       case 'edit-goals': {
555:         const g = S.goals, v = prompt('יעד קלוריות יומי:', g.kcal); if (v === null) break; g.kcal = num(v) || g.kcal;
556:         const p = prompt('יעד חלבון (ג׳):', g.protein); if (p !== null) g.protein = num(p) || g.protein;
557:         const c = prompt('יעד פחמימות (ג׳):', g.carbs); if (c !== null) g.carbs = num(c) || g.carbs;
558:         const f = prompt('יעד שומן (ג׳):', g.fat); if (f !== null) g.fat = num(f) || g.fat;
559:         save(); render(); break;
560:       }
561:       case 'weight-add': { const v = num($('#weight-input').value); if (v < 20 || v > 400) { toast('הזן משקל תקין'); break; } addWeight(v); render(); toast('המשקל נשמר', true); break; }
562:       case 'weight-del': S.weights = S.weights.filter(w => w.date !== d.d); save(); render(); break;
563:       case 'close-modal': closeModal(); break;
564:       case 'close-modal-bg': if (ev.target === t) closeModal(); break;   // only when the dark backdrop itself is clicked
565:     }
566:   });
567: 
568:   document.addEventListener('input', ev => {
569:     const t = ev.target, d = t.dataset;
570:     if (d.field && S.active) {                       // set weight/reps: update state only (keeps focus)
571:       const s = S.active.exercises[+d.ei].sets[+d.si]; s[d.field] = t.value; save();
572:       const v = $('#vol-total'); if (v) v.textContent = fmtN(activeVolume()); renderHeader();
573:     } else if (d.search === 'lib') { ui.libQ = t.value; $('#lib-list').innerHTML = exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון'); }
574:     else if (d.search === 'pick') { ui.modal.q = t.value; $('#pick-list').innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'pick-ex', 'הוסף'); }
575:     else if (d.search === 'rpick') { ui.modal.q = t.value; $('#rpick-list').innerHTML = routinePickHTML(); }
576:     else if (d.search === 'food') { ui.modal.q = t.value; $('#food-list').innerHTML = foodListHTML(); }
577:     else if (t.id === 'food-amount') { ui.modal.amount = t.value; $('#food-preview').innerHTML = foodPreview(); }
578:     else if (d.cf) { ui.modal.cf[d.cf] = t.value; }
579:     else if (t.id === 'routine-name') { ui.modal.name = t.value; }
580:   });
581:   document.addEventListener('change', ev => {
582:     if (ev.target.id === 'food-unit') { ui.modal.unit = ev.target.value; $('#food-preview').innerHTML = foodPreview(); }
583:     else if (ev.target.dataset.cf) ui.modal.cf[ev.target.dataset.cf] = ev.target.value;
584:   });
585:   /* Escape closes any open modal (or the set-type popover) */
586:   document.addEventListener('keydown', ev => {
587:     if (ev.key !== 'Escape') return;
588:     if (ui.modal) closeModal(); else if (ui.menu) { ui.menu = null; render(); }
589:   });
590: 
591:   /* ============================ BOOT ============================ */
592:   window.addEventListener('load', () => { render(); if (ui.rest) renderRest(true); });
593:   if (document.readyState === 'complete') render();
594: })();
595: 
The above content shows the entire, complete file contents of the requested file.
