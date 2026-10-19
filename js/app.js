/* BUILT DIFFERENT - Core Application (Zero-Build Vanilla JS)
   Obsidian & Electric Blue Theme · 100% Native Hebrew · STRONG/HEVY Exercise Conventions & SVG Thumbnails */
(function () {
  'use strict';

  /* ============================ STATE ============================ */
  const KEY = 'built_different_state';
  const EX = window.BD_EXERCISES || [];
  const FOODS = window.BD_FOODS || [];
  const MUSCLES = window.BD_MUSCLES || {};
  const EQUIP = window.BD_EQUIPMENT || {};
  const FOOD_CATS = window.BD_FOOD_CATS || {};

  const defaults = () => ({
    active: null,            // {startedAt, routineId, exercises:[{exId, sets:[{type,kg,reps,done,pr,note}]}]}
    history: [],             // newest first: {id,date,duration,volume,prs,exercises:[{exId,sets}]}
    routines: [],            // {id,name,exIds:[],exercises:[]}
    nutrition: {},           // 'YYYY-MM-DD' -> [{foodId,name,grams,label,kcal,p,c,f}]
    weights: [],             // {date,kg} sorted ascending
    goals: { 
      workout: { kcal: 2600, protein: 180, carbs: 300, fat: 75 },
      rest: { kcal: 2200, protein: 160, carbs: 200, fat: 65 }
    },
    weeklySchedule: ['rest', 'workout', 'workout', 'workout', 'rest', 'workout', 'rest'], // Sun-Sat
    customDays: {},          // YYYY-MM-DD -> 'workout'|'rest'|'custom'
    customDayGoals: {},      // YYYY-MM-DD -> {kcal, protein, carbs, fat}
    restSeconds: 30,
    customFoods: [],         // user-created foods
    favorites: [],           // starred food ids
    foodCounts: {},          // foodId -> times logged
    exerciseMemory: {},      // exId -> [{type, kg, reps}]
    savedMeals: [],          // user-saved meal templates {id, name, meal, items}
    seeded: false
  });

  const PRESET_ROUTINES = [
    { name: 'Push · דחיפה', exIds: ['bench-press', 'incline-db-press', 'overhead-press', 'lateral-raise', 'tricep-pushdown', 'dips'] },
    { name: 'Pull · משיכה', exIds: ['deadlift', 'pull-up', 'bent-over-row', 'lat-pulldown', 'face-pull', 'bicep-curl'] },
    { name: 'Legs · רגליים', exIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'leg-extension', 'calf-raise'] },
    { name: 'Full Body · כל הגוף', exIds: ['squat', 'bench-press', 'bent-over-row', 'overhead-press', 'bicep-curl', 'plank'] }
  ];

  function load() {
    try {
      let s = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}'));
      if (!s.seeded) {
        if (!s.routines || !s.routines.length) {
          s.routines = PRESET_ROUTINES.map(r => ({
            id: 'preset-' + r.name.split(' ')[0].toLowerCase(),
            name: r.name,
            exIds: r.exIds.slice(),
            exercises: r.exIds.map(id => ({ exId: id, sets: [{ type: 'N', kg: '', reps: '' }] }))
          }));
        }
        s.seeded = true;
      }
      if (s.goals && typeof s.goals.kcal === 'number') {
        s.goals = { workout: Object.assign({}, s.goals), rest: Object.assign({}, s.goals) };
      }
      if (!s.weeklySchedule) s.weeklySchedule = defaults().weeklySchedule;
      if (!s.customDays) s.customDays = {};
      if (!s.customDayGoals) s.customDayGoals = {};
      s.restSeconds = 30;
      
      if (Array.isArray(s.customFoods)) {
        s.customFoods.forEach(f => {
          if (!Array.isArray(f.units)) f.units = [];
          if (!f.units.find(u => u.name === '100 גרם')) f.units.push({ name: '100 גרם', g: 100 });
        });
      } else { s.customFoods = []; }

      if (!s.exerciseMemory) {
        s.exerciseMemory = {};
        if (s.history) {
          [...s.history].reverse().forEach(w => {
             w.exercises.forEach(e => {
                s.exerciseMemory[e.exId] = e.sets.map(x => ({ type: x.type, kg: x.kg, reps: x.reps }));
             });
          });
        }
      }

      if (s.routines) {
        s.routines.forEach(r => {
          const list = r.exercises || r.exIds || [];
          r.exIds = list.map(item => typeof item === 'string' ? item : (item.exId || item.id));
          r.exercises = list.map(item => {
            const id = typeof item === 'string' ? item : (item.exId || item.id);
            let targetSets = 3;
            let sets = [];
            if (typeof item === 'object') {
              if (typeof item.targetSets === 'number' && item.targetSets > 0) targetSets = item.targetSets;
              else if (typeof item.sets === 'number' && item.sets > 0) targetSets = item.sets;
              if (Array.isArray(item.sets) && item.sets.length) {
                sets = item.sets.map(x => ({ type: x.type || 'N', kg: x.kg !== undefined ? x.kg : '', reps: x.reps !== undefined ? x.reps : '' }));
                targetSets = sets.length;
              }
            }
            if (!sets.length) {
              const mem = s.exerciseMemory && s.exerciseMemory[id];
              for (let i = 0; i < targetSets; i++) {
                if (mem && mem[i]) sets.push({ type: mem[i].type || 'N', kg: mem[i].kg !== undefined ? mem[i].kg : '', reps: mem[i].reps !== undefined ? mem[i].reps : '' });
                else sets.push({ type: 'N', kg: '', reps: '' });
              }
            }
            return { exId: id, targetSets, sets };
          });
        });
      }

      if (!s.savedMeals) s.savedMeals = [];

      return s;
    } catch (e) {
      console.error('State load error, resetting:', e);
      return defaults();
    }
  }
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const ui = { tab: 'workout', modal: null, menu: null, libQ: '', libMuscle: 'all', libEq: 'all', libSort: 'az', libView: 'ex', rest: null, nutriDate: null, explorerExId: null };

  /* ============================ HELPERS ============================ */
  const $ = (s, r = document) => r.querySelector(s);
  const exById = id => EX.find(e => e.id === id);

  function getPrevDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function lastWorkoutForEx(exId) {
    for (const w of S.history) {
      const found = (w.exercises || []).find(x => x.exId === exId);
      if (found && found.sets && found.sets.length) {
        const topSet = found.sets.reduce((max, s) => (num(s.kg) > num(max.kg) ? s : max), found.sets[0]);
        return {
          date: w.date,
          topSet
        };
      }
    }
    return null;
  }

  function normalizeRoutineExercises(r) {
    if (!r) return [];
    const list = r.exercises || r.exIds || [];
    return list.map(item => {
      const exId = typeof item === 'string' ? item : (item.exId || item.id);
      let targetSets = 3;
      let sets = [];
      if (typeof item === 'object') {
        if (typeof item.targetSets === 'number' && item.targetSets > 0) targetSets = item.targetSets;
        else if (typeof item.sets === 'number' && item.sets > 0) targetSets = item.sets;
        if (Array.isArray(item.sets) && item.sets.length) {
          sets = item.sets.map(s => ({ type: s.type || 'N', kg: s.kg !== undefined ? s.kg : '', reps: s.reps !== undefined ? s.reps : '' }));
          targetSets = sets.length;
        }
      }
      if (!sets.length) {
        const mem = S && S.exerciseMemory ? S.exerciseMemory[exId] : null;
        for (let i = 0; i < targetSets; i++) {
          if (mem && mem[i]) sets.push({ type: mem[i].type || 'N', kg: mem[i].kg !== undefined ? mem[i].kg : '', reps: mem[i].reps !== undefined ? mem[i].reps : '' });
          else sets.push({ type: 'N', kg: '', reps: '' });
        }
      }
      return { exId, targetSets, sets };
    });
  }
  const MEALS = [
    { k: 'breakfast', he: 'ארוחת בוקר' },
    { k: 'lunch', he: 'ארוחת צהריים' },
    { k: 'dinner', he: 'ארוחת ערב' },
    { k: 'snack', he: 'ביניים / שייק' }
  ];
  const allFoods = () => FOODS.concat(S.customFoods);
  const foodById = id => allFoods().find(f => f.id === id);
  function currentMeal() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; }
  
  function getFoodPer100g(food) {
    return {
      cal100: num(food.kcal),
      protein100: num(food.p),
      carbs100: num(food.c),
      fat100: num(food.f)
    };
  }
  
  const calcFood = (food, grams) => { 
    const base = getFoodPer100g(food);
    const k = grams / 100; 
    return { kcal: base.cal100 * k, p: base.protein100 * k, c: base.carbs100 * k, f: base.fat100 * k }; 
  };
  
  function logFood(f, grams, label, meal, amt = 1) {
    const k = ui.nutriDate || todayKey();
    const calculated = calcFood(f, grams);
    const entry = Object.assign({ 
      foodId: f.id, name: f.he, grams, label, meal: meal || currentMeal(),
      calories: calculated.kcal, protein: calculated.p, carbs: calculated.c, fat: calculated.f,
      amount: amt, unitLabel: label
    }, calculated);
    (S.nutrition[k] = S.nutrition[k] || []).push(entry);
    S.foodCounts[f.id] = (S.foodCounts[f.id] || 0) + 1; save();
  }

  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const r1 = n => Math.round(n * 10) / 10;
  const fmtN = n => (Math.round(n * 10) / 10).toLocaleString('he-IL');
  const pad = n => String(n).padStart(2, '0');
  const fmtClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };
  const fmtDate = iso => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const icons = () => { if (window.lucide) try { lucide.createIcons(); } catch (e) {} };

  function toast(msg, ok) {
    /* QUIET toast: one line, no emoji, gone after 3s. #toast is the .q-toast-region; the .q-toast inside is rebuilt per message. */
    const t = $('#toast'); if (!t) return;
    const clean = String(msg).trim();
    t.innerHTML = '<div class="q-toast" role="status">' + (ok ? '<i data-lucide="check" class="q-toast__icon"></i>' : '') + '<span class="q-toast__text"></span></div>';
    t.querySelector('.q-toast__text').textContent = clean;
    icons();
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.innerHTML = ''; }, 3000);
  }

  function beep() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); o.stop(c.currentTime + 0.35);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  /* ============================ WORKOUT ENGINE ============================ */
  const newSet = () => ({ type: 'N', kg: '', reps: '', done: false, pr: false, touched: false });

  let wakeLock = null; 
  function startWorkout(exData, routineId = null) { 
    try { 
      if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(w => wakeLock = w).catch(() => {}); 
    } catch (e) {}

    S.active = { 
      startedAt: Date.now(), 
      routineId, 
      sourceRoutineId: routineId,
      exercises: (exData || []).map(item => {
        const id = typeof item === 'string' ? item : (item.exId || item.id);
        let sets = [];
        if (typeof item === 'object' && Array.isArray(item.sets) && item.sets.length) {
          sets = item.sets.map(s => ({
            type: s.type || 'N',
            kg: s.kg !== undefined ? s.kg : '',
            reps: s.reps !== undefined ? s.reps : '',
            done: false,
            pr: false,
            touched: false
          }));
        } else if (typeof item === 'object' && typeof item.targetSets === 'number' && item.targetSets > 0) {
          const count = item.targetSets;
          const mem = S.exerciseMemory && S.exerciseMemory[id];
          for (let i = 0; i < count; i++) {
            if (mem && mem[i]) sets.push({ type: mem[i].type || 'N', kg: mem[i].kg !== undefined ? mem[i].kg : '', reps: mem[i].reps !== undefined ? mem[i].reps : '', done: false, pr: false, touched: false });
            else sets.push(newSet());
          }
        } else {
          const mem = S.exerciseMemory && S.exerciseMemory[id];
          if (mem && mem.length) {
            sets = mem.map(s => ({ type: s.type || 'N', kg: s.kg !== undefined ? s.kg : '', reps: s.reps !== undefined ? s.reps : '', done: false, pr: false, touched: false }));
          } else {
            sets = [newSet(), newSet(), newSet()];
          }
        }
        return { exId: id, sets };
      }) 
    };
    save(); render();
  }

  function addExercise(id) {
    if (!S.active) startWorkout([]);
    const mem = S.exerciseMemory[id];
    let sets = [newSet()];
    if (mem && mem.length) {
      sets = mem.map(s => ({ type: s.type || 'N', kg: s.kg || '', reps: s.reps || '', done: false, pr: false, touched: false }));
    }
    S.active.exercises.push({ exId: id, sets });
    save();
  }

  function prevSet(exId, idx) {
    if (S.exerciseMemory && S.exerciseMemory[exId] && S.exerciseMemory[exId][idx]) {
       return S.exerciseMemory[exId][idx];
    }
    for (const w of S.history) {
      const e = w.exercises.find(x => x.exId === exId);
      if (e) return e.sets[idx] || null;
    }
    return null;
  }
  const prevLabel = p => p ? `${fmtN(p.kg)}×${p.reps}` : '—';

  const e1rm = (kg, reps) => reps <= 1 ? kg : kg * (1 + reps / 30);

  function bestFor(exId, ignoreSet) {
    let kg = 0, rm = 0, any = false;
    const eat = s => { if (s === ignoreSet || s.type === 'W' || !(num(s.kg) > 0) || !(num(s.reps) > 0)) return; any = true; kg = Math.max(kg, num(s.kg)); rm = Math.max(rm, e1rm(num(s.kg), num(s.reps))); };
    S.history.forEach(w => w.exercises.filter(e => e.exId === exId).forEach(e => e.sets.forEach(eat)));
    if (S.active) S.active.exercises.filter(e => e.exId === exId).forEach(e => e.sets.forEach(s => s.done && eat(s)));
    return { kg, rm, any };
  }

  function setVolume(s) { return s.done && s.type !== 'W' ? num(s.kg) * num(s.reps) : 0; }
  function workoutVolume(w) { return w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + setVolume(Object.assign({ done: true }, s)), 0), 0); }
  const activeVolume = () => S.active ? S.active.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + setVolume(s), 0), 0) : 0;

  function toggleDone(ei, si) {
    const ex = S.active.exercises[ei], s = ex.sets[si];
    if (!s.done) {
      const p = prevSet(ex.exId, si);
      if (s.kg === '' && p) s.kg = p.kg;
      if (s.reps === '' && p) s.reps = p.reps;
      if (!(num(s.reps) > 0)) { toast('הזן חזרות לפני סימון הסט'); return; }
      s.done = true;
      s.touched = true;
      const b = bestFor(ex.exId, s);
      s.pr = s.type !== 'W' && b.any && num(s.kg) > 0 && (num(s.kg) > b.kg || e1rm(num(s.kg), num(s.reps)) > b.rm + 0.01);
      /* PR is shown as a trophy on the set row (QUIET: no toast while logging) */
    } else { s.done = false; s.pr = false; }
    save(); render();
  }

  function finishWorkout() {
    const a = S.active;
    if (!a) return;
    
    a.exercises.forEach(e => {
      e.sets.forEach((s, idx) => {
        if (!s.done && s.touched && (num(s.reps) > 0 || num(s.kg) > 0)) {
          s.done = true;
          const b = bestFor(e.exId, s);
          s.pr = s.type !== 'W' && b.any && num(s.kg) > 0 && (num(s.kg) > b.kg || e1rm(num(s.kg), num(s.reps)) > b.rm + 0.01);
        }
        
        if (!S.exerciseMemory[e.exId]) S.exerciseMemory[e.exId] = [];
        if (s.done || s.touched) {
          S.exerciseMemory[e.exId][idx] = { type: s.type || 'N', kg: s.kg, reps: s.reps };
        } else if (!S.exerciseMemory[e.exId][idx]) {
          S.exerciseMemory[e.exId][idx] = { type: s.type || 'N', kg: '', reps: '' };
        }
      });
      if (e.sets.length < S.exerciseMemory[e.exId].length) {
         S.exerciseMemory[e.exId].length = e.sets.length;
      }
    });

    const completedExercises = a.exercises.map(e => ({
      exId: e.exId,
      sets: e.sets.filter(s => s.done).map(s => ({ type: s.type, kg: num(s.kg), reps: num(s.reps), pr: !!s.pr }))
    })).filter(e => e.sets.length);

    if (!completedExercises.length) {
      if (!confirm('אין סטים שהושלמו. לבטל את האימון?')) return;
      S.active = null; stopRest(); save(); render(); 
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } 
      return;
    }
    
    const sourceId = a.sourceRoutineId || a.routineId;
    const r = sourceId ? S.routines.find(x => x.id === sourceId) : null;

    const w = { 
      id: uid(), 
      name: r ? r.name : 'אימון חופשי', 
      date: new Date().toISOString(), 
      duration: Math.floor((Date.now() - a.startedAt) / 1000), 
      exercises: completedExercises 
    };
    
    w.volume = workoutVolume(w);
    w.prs = completedExercises.reduce((n, e) => n + e.sets.filter(s => s.pr).length, 0);
    S.history.unshift(w); 
    stopRest(); 
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }

    if (r) {
      const origNorm = normalizeRoutineExercises(r);
      const origExIds = origNorm.map(x => x.exId).join(',');
      const currExIds = a.exercises.map(x => x.exId).join(',');
      const origSets = origNorm.map(x => x.targetSets).join(',');
      const currSets = a.exercises.map(x => x.sets.length).join(',');

      const hasChanged = (origExIds !== currExIds) || (origSets !== currSets);

      if (hasChanged) {
        ui.modal = {
          type: 'smartRoutineSync',
          routineId: r.id,
          routineName: r.name,
          workout: w,
          activeSnapshot: {
            exercises: a.exercises.map(e => ({
              exId: e.exId,
              targetSets: e.sets.length,
              sets: e.sets.map(s => ({ type: s.type || 'N', kg: s.kg || '', reps: s.reps || '' }))
            }))
          }
        };
        S.active = null;
        save();
        render();
        return;
      } else {
        r.exercises = origNorm.map(re => {
          const match = a.exercises.find(ae => ae.exId === re.exId);
          if (match) {
            return {
              exId: re.exId,
              targetSets: re.targetSets,
              sets: match.sets.map(s => ({ type: s.type || 'N', kg: s.kg || '', reps: s.reps || '' }))
            };
          }
          return re;
        });
      }
    }

    S.active = null; 
    save();
    ui.modal = { type: 'summary', w }; 
    render();
  }

  /* ---- Rest Timer ---- */
  /* Rest timer is switched off by product decision (no bar, no countdown, no beep). Code and `restSeconds` stay; flip to true to bring it back. */
  const REST_TIMER_ENABLED = false;
  function startRest(sec) { if (!REST_TIMER_ENABLED) return; ui.rest = { end: Date.now() + sec * 1000, total: sec, beeped: false }; renderRest(true); }
  function stopRest() { ui.rest = null; renderRest(); }
  function beepRest() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const play = (time) => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.frequency.value = 880; g.gain.value = 0.2;
        o.start(c.currentTime + time); o.stop(c.currentTime + time + 0.15);
      };
      play(0); play(0.2);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function renderRest(full) {
    const el = $('#rest-bar'); if (!el) return;
    if (!REST_TIMER_ENABLED || !ui.rest) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    if (full || !el.innerHTML) {
      /* Inert: the rest timer is switched off (REST_TIMER_ENABLED) and index.html has no #rest-bar. Re-enabling needs a design decision first. */
      el.innerHTML = `<div class="q-row q-between q-gap-2">
        <div class="q-stack"><span class="q-section-sub">זמן מנוחה</span><span id="rest-time" class="num">0:00</span></div>
        <div class="q-row q-gap-2">
          <button class="q-btn q-btn--secondary q-btn--compact" data-action="rest-sub">-15</button>
          <button class="q-btn q-btn--secondary q-btn--compact" data-action="rest-add">+15</button>
          <button class="q-btn q-btn--primary q-btn--compact" data-action="rest-skip">דלג</button>
        </div></div><div id="rest-prog"></div>`;
    }
    const left = (ui.rest.end - Date.now()) / 1000;
    if (left <= 0) {
      const rt = $('#rest-time'); if (rt) rt.textContent = '0:00';
      const rp = $('#rest-prog'); if (rp) rp.style.width = '0%';
      if (!ui.rest.beeped) {
        ui.rest.beeped = true;
        beepRest();
        el.classList.add('flash-green');
        setTimeout(() => el.classList.remove('flash-green'), 2000);
      }
    } else {
      const rt = $('#rest-time'); if (rt) rt.textContent = fmtClock(Math.ceil(left));
      const rp = $('#rest-prog'); if (rp) rp.style.width = Math.max(0, Math.min(100, left / ui.rest.total * 100)) + '%';
    }
  }
  setInterval(() => {
    if (ui.rest) renderRest();
    const t = $('#wk-timer');
    if (t && S.active) t.textContent = fmtClock((Date.now() - S.active.startedAt) / 1000);
    const mt = $('#mini-time');
    if (mt && S.active) mt.textContent = fmtClock((Date.now() - S.active.startedAt) / 1000);
  }, 250);

  /* ============================ NUTRITION ============================ */
  const dayLog = (d = todayKey()) => S.nutrition[d] || [];
  function dayTotals(d) { return dayLog(d).reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { kcal: 0, p: 0, c: 0, f: 0 }); }

  /* ============================ WEIGHT ============================ */
  function addWeight(kg) {
    const d = todayKey(), i = S.weights.findIndex(w => w.date === d);
    if (i >= 0) S.weights[i].kg = kg; else S.weights.push({ date: d, kg });
    S.weights.sort((a, b) => a.date.localeCompare(b.date)); save();
  }

  /* ============================ VIEWS ============================ */
  function renderHeader() {
    const d = todayKey();
    const t = dayTotals(d);
    const g = getGoals(d);
    const el = $('#daily-badge');
    if (el) {
      const kcal = Math.round(t.kcal), vol = Math.round(activeVolume() || todayVolume());
      el.innerHTML = (kcal > 0 ? `<span><span class="num">${fmtN(kcal)}</span> קק״ל</span>` : '') +
        (vol > 0 ? `<span><span class="num">${fmtN(vol)}</span> ק״ג</span>` : '');
    }
  }
  function todayVolume() { const k = todayKey(); return S.history.filter(w => w.date.slice(0, 10) === k || new Date(w.date).toDateString() === new Date().toDateString()).reduce((a, w) => a + w.volume, 0); }

  function renderMiniBar() {
    const el = $('#mini-bar'); if (!el) return;
    if (!S.active || ui.tab === 'workout') { el.hidden = true; el.innerHTML = ''; return; }
    const rid = S.active.sourceRoutineId || S.active.routineId;
    const r = rid ? S.routines.find(x => x.id === rid) : null;
    el.hidden = false;
    el.innerHTML = `<span class="q-mini-bar__dot"></span><span class="q-mini-bar__title">${r ? r.name : 'אימון ריק'}</span>` +
      `<span id="mini-time" class="q-mini-bar__time">${fmtClock((Date.now() - S.active.startedAt) / 1000)}</span>` +
      `<i data-lucide="chevron-up" class="q-mini-bar__chevron"></i>`;
  }

  function render() {
    document.querySelectorAll('#nav button').forEach(b => { if (b.dataset.nav === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    renderHeader(); renderMiniBar();
    const appEl = $('#app'); if (appEl) appEl.classList.toggle('is-workout-active', ui.tab === 'workout' && !!S.active);
    const sc = $('#screen');
    if (sc) {
      sc.innerHTML = { workout: viewWorkout, library: viewLibrary, nutrition: viewNutrition, progress: viewProgress }[ui.tab]();
    }
    renderModal(); renderRest(); icons();
  }

  /* ---- Active Workout Views ---- */
  const TYPE_LABEL = { N: 'סט רגיל', W: 'W חימום', D: 'D דרופ-סט', F: 'F כשל' };

  function viewWorkout() {
    if (!S.active) {
      const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
      const tplHeader = S.routines.length
        ? `<div class="q-section-header"><span class="q-section-header__title">תבניות · <span class="num">${S.routines.length}</span></span>
            <button class="q-section-header__action q-row q-gap-1" data-action="new-routine"><i data-lucide="plus"></i>חדשה</button></div>`
        : `<div class="q-section-header"><span class="q-section-header__title">תבניות</span></div>`;
      const tplBody = S.routines.length
        ? `<div class="q-grid-2">${S.routines.map(homeRoutineCard).join('')}</div>`
        : `<div class="q-empty"><i data-lucide="layout-list" class="q-icon-24 q-muted"></i>
            <span class="q-empty__title">עוד אין תבניות</span>
            <span class="q-empty__text">תבנית שומרת את התרגילים והסטים שלך. בפעם הבאה מתחילים בלחיצה אחת.</span>
            <button class="q-btn q-btn--secondary q-empty__action" data-action="new-routine">צור תבנית</button></div>`;
      return `<div class="q-stack q-gap-4">
          <div class="q-screen-title"><span class="q-screen-title__sub">${today}</span><h1 class="q-screen-title__text">אימון</h1></div>
          <button class="q-btn q-btn--primary q-btn--block" data-action="start-empty"><i data-lucide="plus"></i>התחל אימון ריק</button>
        </div>
        ${tplHeader}${tplBody}
        <div class="q-section-header"><span class="q-section-header__title">היסטוריה</span></div>
        ${historyCards()}`;
    }
    const a = S.active;
    const rid = a.sourceRoutineId || a.routineId;
    const rt = rid ? S.routines.find(x => x.id === rid) : null;
    const allSets = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const doneSets = a.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const vol = activeVolume();
    const hasEx = a.exercises.length > 0;
    const wkMenuOpen = !!(ui.menu && ui.menu.wk);
    const top = `<div class="q-aw-top">
        <div class="q-aw-bar">
          <button class="q-icon-btn" data-nav="${ui.prevTab || 'library'}" aria-label="מזער אימון"><i data-lucide="chevron-down"></i></button>
          <span class="q-aw-bar__title">${rt ? rt.name : 'אימון ריק'}</span>
          <button class="q-icon-btn" data-action="wk-menu" aria-label="עוד" aria-expanded="${wkMenuOpen}"><i data-lucide="ellipsis-vertical"></i></button>
          <button class="q-btn q-btn--primary q-btn--compact" data-action="finish">סיים</button>
          ${wkMenuOpen ? `<div class="q-menu q-aw-bar__menu"><button class="q-menu__item" data-action="save-routine"><i data-lucide="bookmark-plus"></i>שמור כתבנית</button></div>` : ''}
        </div>
        <div class="q-stat-row q-stat-row--bleed">
          <div class="q-stat"><span class="q-stat__label"><span class="q-stat__dot"></span>זמן</span><span id="wk-timer" class="q-stat__value" dir="ltr">${fmtClock((Date.now() - a.startedAt) / 1000)}</span></div>
          <div class="q-stat ${vol > 0 ? '' : 'is-empty'}"><span class="q-stat__label">נפח · ק״ג</span><span class="q-stat__value"><span id="vol-total">${fmtN(vol)}</span></span></div>
          <div class="q-stat ${doneSets > 0 ? '' : 'is-empty'}"><span class="q-stat__label">סטים</span><span class="q-stat__value" dir="ltr"><span>${doneSets}</span>${allSets ? `<span class="q-stat__unit">/${allSets}</span>` : ''}</span></div>
        </div>
      </div>`;
    const cancelBtn = `<button class="q-btn q-btn--danger-ghost" data-action="cancel-workout"><i data-lucide="x"></i>בטל אימון</button>`;
    if (!hasEx) {
      return `${top}<div class="q-aw-empty">
          <span class="q-aw-empty__title">התרגיל הראשון</span>
          <span class="q-aw-empty__text">בחר מתוך <span class="num">${EX.length}</span> תרגילים. אפשר להוסיף, להחליף ולסדר תוך כדי האימון.</span>
          <button class="q-btn q-btn--primary q-btn--block" data-action="add-ex-open"><i data-lucide="plus"></i>הוסף תרגיל</button>
        </div>
        <div class="q-aw-foot">${cancelBtn}</div>`;
    }
    return `${top}${a.exercises.map(exCard).join('')}
      <div class="q-aw-foot">
        <button class="q-btn q-btn--secondary q-btn--block" data-action="add-ex-open"><i data-lucide="plus"></i>הוסף תרגיל</button>
        ${cancelBtn}
      </div>`;
  }

  function exCard(e, ei) {
    const ex = exById(e.exId) || { name: 'Exercise', heName: 'תרגיל', en: 'Exercise', he: 'תרגיל', equipment: 'barbell', muscle: 'chest', pose: 'bench-press' };
    const name = ex.name || ex.en || '';
    const isLast = ei === S.active.exercises.length - 1;
    const isSuperset = !!e.superset || (ei > 0 && !!S.active.exercises[ei - 1].superset);
    const menuOpen = !!(ui.menu && ui.menu.exm === ei);
    const showNote = !!e.note || ui.noteEi === ei;
    const meta = (MUSCLES[ex.muscle] ? MUSCLES[ex.muscle].he : ex.muscle) + (ex.equipment && EQUIP[ex.equipment] ? ' · ' + EQUIP[ex.equipment].he : '');

    const rows = e.sets.map((s, si) => {
      const p = prevSet(e.exId, si);
      const type = s.type || 'N';
      const setMenuOpen = !!(ui.menu && ui.menu.ei === ei && ui.menu.si === si);
      return `<div class="q-set-row ${s.done ? 'is-done' : ''} ${s.done && s.pr ? 'is-pr' : ''}">
        <button class="q-set-row__num" data-action="type-menu" data-ei="${ei}" data-si="${si}" aria-label="אפשרויות סט" aria-expanded="${setMenuOpen}">${type === 'N' ? si + 1 : type}</button>
        <button class="q-set-row__prev ltr" data-action="use-prev" data-ei="${ei}" data-si="${si}">${prevLabel(p)}</button>
        <input class="q-set-row__input" type="number" inputmode="decimal" step="0.5" min="0" placeholder="${p ? p.kg : '0'}" value="${s.kg}" data-field="kg" data-ei="${ei}" data-si="${si}" aria-label="ק״ג" />
        <input class="q-set-row__input" type="number" inputmode="numeric" min="0" placeholder="${p ? p.reps : '0'}" value="${s.reps}" data-field="reps" data-ei="${ei}" data-si="${si}" aria-label="חזרות" />
        <button class="q-set-row__check" data-action="toggle-done" data-ei="${ei}" data-si="${si}" aria-pressed="${!!s.done}" aria-label="סמן סט"><i data-lucide="check" class="q-set-row__icon q-set-row__icon--check"></i><i data-lucide="trophy" class="q-set-row__icon q-set-row__icon--pr"></i></button>
        ${setMenuOpen ? `<div class="q-menu q-set-row__menu">
          <button class="q-menu__item" data-action="open-calc" data-ei="${ei}" data-si="${si}"><i data-lucide="calculator"></i>מחשבון פלטות</button>
          ${e.sets.length > 1 ? `<button class="q-menu__item q-menu__item--danger" data-action="del-set" data-ei="${ei}" data-si="${si}"><i data-lucide="trash-2"></i>מחק סט</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    return `<section class="q-ex ${isSuperset ? 'q-ex--linked' : ''}">
      <div class="q-ex__head">
        <span class="q-thumb"><span class="q-thumb__letter">${name.trim().charAt(0).toUpperCase()}</span></span>
        <div class="q-ex__text">
          <button class="q-ex__name ltr" data-action="ex-info" data-id="${e.exId}">${name}</button>
          <span class="q-ex__sub">${ex.heName || ex.he || ''}</span>
          <span class="q-ex__meta">${meta}${isSuperset ? `<span class="q-badge"><i data-lucide="link-2"></i>סופר-סט</span>` : ''}</span>
        </div>
        <button class="q-icon-btn q-ex__more" data-action="ex-menu" data-ei="${ei}" aria-label="עוד" aria-expanded="${menuOpen}"><i data-lucide="ellipsis-vertical"></i></button>
        ${menuOpen ? `<div class="q-menu q-ex__menu">
          ${!isLast ? `<button class="q-menu__item" data-action="toggle-superset" data-ei="${ei}"><i data-lucide="link-2"></i>${e.superset ? 'בטל סופר-סט' : 'סופר-סט עם התרגיל הבא'}</button>` : ''}
          <button class="q-menu__item" data-action="replace-ex-open" data-ei="${ei}"><i data-lucide="repeat"></i>החלף תרגיל</button>
          <button class="q-menu__item" data-action="ex-note" data-ei="${ei}"><i data-lucide="pin"></i>הערה קבועה</button>
          ${e.sets.length > 1 ? `<button class="q-menu__item" data-action="del-last-set" data-ei="${ei}"><i data-lucide="minus"></i>מחק סט אחרון</button>` : ''}
          <button class="q-menu__item q-menu__item--danger" data-action="remove-ex" data-ei="${ei}"><i data-lucide="trash-2"></i>הסר תרגיל</button>
        </div>` : ''}
      </div>
      ${showNote ? `<label class="q-ex__note"><i data-lucide="pin"></i><input class="q-ex__note-input" placeholder="הערה קבועה לתרגיל" data-field="note" data-ei="${ei}" value="${e.note || ''}" /></label>` : ''}
      <div class="q-set-head"><span>סט</span><span>קודם</span><span>ק״ג</span><span>חזרות</span><span><i data-lucide="check"></i></span></div>
      <div class="q-ex__sets">${rows}</div>
      <button class="q-btn q-btn--ghost q-btn--block q-ex__add" data-action="add-set" data-ei="${ei}"><i data-lucide="plus"></i>הוסף סט</button>
    </section>`;
  }

  function bestSetOf(e) {
    let best = null;
    e.sets.forEach(s => { if (s.type === 'W') return; if (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) best = s; });
    return best || e.sets[0];
  }
  function historyCards() {
    if (!S.history.length) return '<p class="q-muted">האימון הראשון שתשמור יופיע כאן.</p>';
    return `<div class="q-stack q-gap-2">` + S.history.slice(0, 20).map(w => {
      const open = !!(ui.menu && ui.menu.mid === w.id);
      return `<div class="q-card q-log">
      <div class="q-log__head">
        <span class="q-log__title">${w.name ? w.name : 'אימון חופשי'}</span>
        <span class="q-log__date">${new Date(w.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}</span>
        <button class="q-icon-btn q-log__more" data-action="item-menu" data-id="${w.id}" aria-label="עוד" aria-expanded="${open}"><i data-lucide="ellipsis-vertical"></i></button>
      </div>
      ${open ? `<div class="q-menu q-log__menu"><button class="q-menu__item q-menu__item--danger" data-action="del-workout" data-id="${w.id}"><i data-lucide="trash-2"></i>מחק אימון</button></div>` : ''}
      <div class="q-log__stats">
        <span class="q-log__stat"><i data-lucide="clock"></i><span class="num">${fmtClock(w.duration)}</span></span>
        <span class="q-log__stat"><i data-lucide="weight"></i><span><span class="num">${fmtN(w.volume)}</span> ק״ג</span></span>
        ${w.prs ? `<span class="q-log__stat q-log__stat--pr"><i data-lucide="trophy"></i><span><span class="num">${w.prs}</span> שיאים</span></span>` : ''}
      </div>
      <div class="q-log__table">
        <div class="q-log__table-head"><span>תרגיל</span><span>הסט הטוב · ק״ג × חזרות</span></div>
        ${w.exercises.map(e => {
          const ex = exById(e.exId), b = bestSetOf(e), isPr = e.sets.some(s => s.pr);
          const best = b ? (b.kg > 0 ? `${fmtN(b.kg)} × ${b.reps}` : `${b.reps} חזרות`) : '';
          return `<div class="q-log__row"><span class="q-log__name ltr">${ex ? (ex.name || ex.en) : '?'}</span>
            <span class="q-log__best ltr">${isPr ? '<i data-lucide="trophy"></i>' : ''}<span>${best}</span></span></div>`;
        }).join('')}
      </div></div>`;
    }).join('') + `</div>`;
  }

  /* ---- Library & Routines ---- */
  function filteredExercises(q, mus, eq) {
    q = (q || '').trim().toLowerCase();
    return EX.filter(e => {
      const enTitle = (e.name || e.en || '').toLowerCase();
      const heTitle = (e.heName || e.he || '');
      const matchMus = (mus === 'all' || e.muscle === mus);
      const matchEq = (eq === 'all' || e.equipment === eq || e.equip === eq);
      const matchQ = !q || enTitle.includes(q) || heTitle.includes(q);
      return matchMus && matchEq && matchQ;
    });
  }

  function chips(map, cur, action) {
    return `<div class="q-chips"><button class="q-chip" aria-pressed="${cur === 'all'}" data-action="${action}" data-v="all">הכל</button>` +
      Object.keys(map).map(k => `<button class="q-chip" aria-pressed="${cur === k}" data-action="${action}" data-v="${k}">${map[k].he}</button>`).join('') + '</div>';
  }

  const escQ = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  function searchInputHTML(kind, value) {
    return `<label class="q-input"><i data-lucide="search" class="q-input__icon"></i><input class="q-input__control" autocomplete="off" placeholder="חיפוש תרגיל (באנגלית או בעברית)" data-search="${kind}" value="${escQ(value)}" /></label>`;
  }
  function qSheet(title, body, opts) {
    opts = opts || {};
    return `<div class="q-overlay" data-action="close-modal-bg"><div class="q-sheet ${opts.full ? 'q-sheet--full' : ''}" role="dialog" aria-modal="true">
      <span class="q-sheet__grab"></span>
      <div class="q-sheet__header"><span class="q-sheet__title ${opts.ltr ? 'ltr' : ''}">${title}</span>
        <button class="q-sheet__close" data-action="close-modal" aria-label="סגור"><i data-lucide="x"></i></button></div>
      <div class="q-sheet__body">${body}</div>${opts.footer ? `<div class="q-sheet__footer">${opts.footer}</div>` : ''}</div></div>`;
  }

  const exLetter = e => ((e.name || e.en || '?').trim().charAt(0) || '?').toUpperCase();
  const exThumbHTML = e => `<span class="q-thumb"><span class="q-thumb__letter">${exLetter(e)}</span></span>`;
  const muscleHe = e => MUSCLES[e.muscle] ? MUSCLES[e.muscle].he : (e.muscle || '');
  const equipHe = e => EQUIP[e.equipment] ? EQUIP[e.equipment].he : (e.equip || '');
  const exByName = (a, b) => (a.name || a.en || '').localeCompare(b.name || b.en || '', 'en');
  function muscleAbbr(he) {
    const w = String(he).split(' ');
    if (w.length > 1) return w[0] + ' ' + w[1].charAt(0) + '׳';
    return he.length > 4 ? he.slice(0, 3) + '׳' : he;
  }

  function exRowHTML(e, action, btnLabel, sub) {
    const nm = e.name || e.en;
    const text = `<span class="q-list-row__text"><span class="q-list-row__title ltr">${nm}</span><span class="q-list-row__sub">${sub}</span></span>`;
    if (action === 'lib-add') {
      return `<div class="q-list-row q-list-row--split">
        <button class="q-list-row__main" data-action="ex-info" data-id="${e.id}">${exThumbHTML(e)}${text}</button>
        <button class="q-icon-btn q-list-row__act" data-action="lib-add" data-id="${e.id}" aria-label="${btnLabel}: ${nm}"><i data-lucide="plus"></i></button>
      </div>`;
    }
    return `<button class="q-list-row" data-action="${action}" data-id="${e.id}" aria-label="${btnLabel}: ${nm}">${exThumbHTML(e)}${text}<i data-lucide="plus" class="q-list-row__add"></i></button>`;
  }

  function libEmptyHTML() {
    const q = (ui.libQ || '').trim();
    const chipsOn = [];
    if (ui.libMuscle !== 'all' && MUSCLES[ui.libMuscle]) chipsOn.push(`<button class="q-chip q-chip--removable" data-action="lib-muscle" data-v="all" aria-label="הסר סינון ${MUSCLES[ui.libMuscle].he}">${MUSCLES[ui.libMuscle].he}<i data-lucide="x" class="q-chip__remove"></i></button>`);
    if (ui.libEq !== 'all' && EQUIP[ui.libEq]) chipsOn.push(`<button class="q-chip q-chip--removable" data-action="lib-eq" data-v="all" aria-label="הסר סינון ${EQUIP[ui.libEq].he}">${EQUIP[ui.libEq].he}<i data-lucide="x" class="q-chip__remove"></i></button>`);
    const title = q ? `לא מצאנו את <bdi dir="auto">"${escQ(q)}"</bdi>` : 'לא נמצאו תרגילים';
    return `<div class="q-empty"><span class="q-empty__title">${title}</span>
      <span class="q-empty__text">בדוק את האיות או נקה את הסינון.</span>
      ${chipsOn.length ? `<div class="q-chips">${chipsOn.join('')}</div>` : ''}
      ${q ? `<button class="q-btn q-btn--secondary q-empty__action" data-action="lib-clear-q">נקה חיפוש</button>` : ''}</div>`;
  }

  function exerciseListHTML(list, action, btnLabel) {
    if (action === 'lib-add') {
      if (!list.length) return libEmptyHTML();
      let groups;
      if (ui.libSort === 'muscle') {
        groups = Object.keys(MUSCLES).map(k => ({ name: MUSCLES[k].he, idx: muscleAbbr(MUSCLES[k].he), items: list.filter(e => e.muscle === k) }));
        const rest = list.filter(e => !MUSCLES[e.muscle]);
        if (rest.length) groups.push({ name: 'אחר', idx: 'אחר', items: rest });
      } else {
        const by = {};
        list.forEach(e => { const c = exLetter(e); const k = /[A-Z]/.test(c) ? c : '#'; (by[k] = by[k] || []).push(e); });
        groups = Object.keys(by).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)).map(k => ({ name: k, idx: k, ltr: true, items: by[k] }));
      }
      groups = groups.filter(g => g.items.length);
      const byMuscle = ui.libSort === 'muscle';
      return `<div class="q-list">` + groups.map((g, i) => `
        <div class="q-section-header q-section-header--anchor" id="lib-sec-${i}"><span class="q-section-header__title ${g.ltr ? 'ltr' : ''}">${g.name}</span><span class="q-section-header__count num">${g.items.length}</span></div>
        ${g.items.slice().sort(exByName).map(e => exRowHTML(e, action, btnLabel, byMuscle ? `${e.heName || e.he || ''} · ${equipHe(e)}` : `${e.heName || e.he || ''} · ${muscleHe(e)}`)).join('')}`).join('') + `</div>
        <nav class="q-section-index q-section-index--sticky" aria-label="קפיצה לקטע"><div class="q-section-index__rail">${groups.map((g, i) => `<button data-action="lib-jump" data-v="lib-sec-${i}">${g.idx}</button>`).join('')}</div></nav>`;
    }
    if (!list.length) return '<div class="q-empty"><span class="q-empty__title">לא נמצאו תרגילים</span><span class="q-empty__text">נסה חיפוש או סינון אחר.</span></div>';
    return `<div class="q-list">` + list.map(e => exRowHTML(e, action, btnLabel, `${e.heName || e.he || ''} · ${muscleHe(e)}`)).join('') + `</div>`;
  }

  function homeRoutineCard(r) {
    const exercises = normalizeRoutineExercises(r);
    const muscles = [];
    exercises.forEach(item => { const ex = exById(item.exId); const m = ex && MUSCLES[ex.muscle] ? MUSCLES[ex.muscle].he : ''; if (m && !muscles.includes(m)) muscles.push(m); });
    const last = S.history.find(w => w.name === r.name);
    const open = !!(ui.menu && ui.menu.mid === r.id);
    return `<div class="q-card q-tpl">
      <button class="q-tpl__main" data-action="start-routine" data-id="${r.id}">
        <span class="q-tpl__title">${r.name}</span>
        <span class="q-tpl__sub">${muscles.join(' · ')}</span>
        ${last ? `<span class="q-tpl__meta"><i data-lucide="history"></i>${fmtDate(last.date)}</span>` : `<span class="q-tpl__meta"><span class="num">${exercises.length}</span> תרגילים</span>`}
      </button>
      <button class="q-icon-btn q-tpl__more" data-action="item-menu" data-id="${r.id}" aria-label="עוד" aria-expanded="${open}"><i data-lucide="ellipsis-vertical"></i></button>
      ${open ? `<div class="q-menu q-tpl__menu">
        <button class="q-menu__item" data-action="edit-routine" data-id="${r.id}"><i data-lucide="pencil"></i>ערוך</button>
        <button class="q-menu__item q-menu__item--danger" data-action="del-routine" data-id="${r.id}"><i data-lucide="trash-2"></i>מחק</button>
      </div>` : ''}
    </div>`;
  }

  function routineCard(r) { return homeRoutineCard(r); }

  function libDropdown(key, label, map, cur, action) {
    const open = !!(ui.menu && ui.menu.dd === key);
    const curLabel = cur !== 'all' && map[cur] ? map[cur].he : label;
    return `<div class="q-filter ${key === 'mus' ? 'q-filter--wide' : ''}"><button class="q-dropdown q-dropdown--block" data-action="lib-dd" data-v="${key}" aria-haspopup="listbox" aria-expanded="${open}"><span class="q-dropdown__label">${curLabel}</span><i data-lucide="chevron-down" class="q-dropdown__chevron"></i></button>
      ${open ? `<div class="q-menu q-filter__menu" role="listbox">
        <button class="q-menu__item" role="option" aria-selected="${cur === 'all'}" data-action="${action}" data-v="all">${label}</button>
        ${Object.keys(map).map(k => `<button class="q-menu__item" role="option" aria-selected="${cur === k}" data-action="${action}" data-v="${k}">${map[k].he}</button>`).join('')}
      </div>` : ''}</div>`;
  }

  function viewLibrary() {
    const tab = (v, label, n) => `<button class="q-segmented__item" role="tab" aria-selected="${ui.libView === v}" data-action="lib-view" data-v="${v}">${label}&nbsp;<span class="num">${n}</span></button>`;
    const head = `<div class="q-screen-title"><h1 class="q-screen-title__text">ספרייה</h1></div>
      <div class="q-segmented" role="tablist">${tab('ex', 'תרגילים', EX.length)}${tab('tpl', 'תבניות', S.routines.length)}</div>`;
    if (ui.libView === 'tpl') {
      const body = S.routines.length
        ? `<div class="q-section-header"><span class="q-section-header__title">תבניות · <span class="num">${S.routines.length}</span></span>
            <button class="q-section-header__action q-row q-gap-1" data-action="new-routine"><i data-lucide="plus"></i>חדשה</button></div>
           <div class="q-stack q-gap-2">${S.routines.map(routineCard).join('')}</div>`
        : `<div class="q-empty"><i data-lucide="layout-list" class="q-icon-24 q-muted"></i>
            <span class="q-empty__title">עוד אין תבניות</span>
            <span class="q-empty__text">תבנית שומרת את התרגילים והסטים שלך. בפעם הבאה מתחילים בלחיצה אחת.</span>
            <button class="q-btn q-btn--secondary q-empty__action" data-action="new-routine">צור תבנית</button></div>`;
      return `<div class="q-stack q-gap-4">${head}${body}</div>`;
    }
    const sortOpen = !!(ui.menu && ui.menu.dd === 'sort');
    const sort = `<div class="q-filter q-filter--end"><button class="q-icon-btn q-icon-btn--outlined" data-action="lib-dd" data-v="sort" aria-haspopup="listbox" aria-expanded="${sortOpen}" aria-label="מיון"><i data-lucide="${ui.libSort === 'muscle' ? 'layers' : 'arrow-down-a-z'}"></i></button>
      ${sortOpen ? `<div class="q-menu q-filter__menu" role="listbox">
        <button class="q-menu__item" role="option" aria-selected="${ui.libSort === 'az'}" data-action="lib-sort" data-v="az"><i data-lucide="arrow-down-a-z"></i>לפי שם A–Z</button>
        <button class="q-menu__item" role="option" aria-selected="${ui.libSort === 'muscle'}" data-action="lib-sort" data-v="muscle"><i data-lucide="layers"></i>לפי שריר</button>
      </div>` : ''}</div>`;
    return `<div class="q-stack q-gap-4">${head}
        ${searchInputHTML('lib', ui.libQ)}
        <div class="q-filter-bar">${libDropdown('mus', 'כל קבוצות השריר', MUSCLES, ui.libMuscle, 'lib-muscle')}${libDropdown('eq', 'כל הציוד', EQUIP, ui.libEq, 'lib-eq')}${sort}</div>
      </div>
      <div class="q-indexed" id="lib-list">${exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון')}</div>`;
  }

  /* ---- Nutrition Tab ---- */
  function macroBar(kind, label, val, goal, empty) {
    const over = goal > 0 && val > goal;
    const value = empty
      ? `<span><span class="q-macro__unit">יעד</span> <bdi class="q-macro__value" dir="ltr">${fmtN(goal)}</bdi> <span class="q-macro__unit">ג׳</span></span>`
      : `<span><bdi class="q-macro__value" dir="ltr">${fmtN(val)} / ${fmtN(goal)}</bdi> <span class="q-macro__unit">ג׳</span></span>`;
    return `<div class="q-macro q-macro--${kind} ${over ? 'is-over' : ''} ${empty ? 'is-empty' : ''}">
      <div class="q-macro__head"><span class="q-macro__label">${label}</span>${value}</div>
      <progress class="q-macro__bar" value="${empty ? 0 : Math.min(val, goal || 0)}" max="${goal || 1}" aria-label="${label}"></progress>
    </div>`;
  }

  const WEEK_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
  function getDatesOfWeek(baseDate = new Date()) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday
    const start = new Date(d.setDate(diff));
    return Array.from({length: 7}, (_, i) => {
      const nd = new Date(start);
      nd.setDate(start.getDate() + i);
      return nd.getFullYear() + '-' + pad(nd.getMonth()+1) + '-' + pad(nd.getDate());
    });
  }

  function getDayType(dateStr) {
    if (S.customDays && S.customDays[dateStr]) return S.customDays[dateStr];
    const d = new Date(dateStr);
    return S.weeklySchedule[d.getDay()] || 'rest';
  }
  function getGoals(dateStr) {
    const t = getDayType(dateStr);
    if (t === 'custom' && S.customDayGoals[dateStr]) return S.customDayGoals[dateStr];
    return S.goals[t] || S.goals.workout;
  }

  function calcSmartMacros(weight, goal = 'cut') {
    const w = Math.max(35, num(weight) || 75);
    let wCalK, rCalK, pFactor, fFactor;
    if (goal === 'cut') {
      wCalK = 30; rCalK = 26; pFactor = 2.2; fFactor = 0.85;
    } else if (goal === 'bulk') {
      wCalK = 38; rCalK = 33; pFactor = 2.0; fFactor = 1.05;
    } else {
      wCalK = 34; rCalK = 30; pFactor = 2.0; fFactor = 0.95;
    }

    const wKcal = Math.round(w * wCalK);
    const wP = Math.round(w * pFactor);
    const wF = Math.round(w * fFactor);
    const wC = Math.max(20, Math.round((wKcal - (wP * 4 + wF * 9)) / 4));

    const rKcal = Math.round(w * rCalK);
    const rP = Math.round(w * pFactor);
    const rF = Math.round(w * fFactor);
    const rC = Math.max(20, Math.round((rKcal - (rP * 4 + rF * 9)) / 4));

    return {
      workout: { kcal: wKcal, protein: wP, carbs: wC, fat: wF },
      rest: { kcal: rKcal, protein: rP, carbs: rC, fat: rF }
    };
  }

  function updateMacroCalcDisplay() {
    const wInput = $('#auto-macro-weight');
    if (!wInput) return;
    const w = num(wInput.value);
    if (!(w > 20)) return;
    ui.modal.weight = w;
    const calc = calcSmartMacros(w, ui.modal.goal || 'cut');
    
    const wKcal = $('#macro-w-kcal'); if (wKcal) wKcal.value = calc.workout.kcal;
    const wP = $('#macro-w-p'); if (wP) wP.value = calc.workout.protein;
    const wC = $('#macro-w-c'); if (wC) wC.value = calc.workout.carbs;
    const wF = $('#macro-w-f'); if (wF) wF.value = calc.workout.fat;

    const rKcal = $('#macro-r-kcal'); if (rKcal) rKcal.value = calc.rest.kcal;
    const rP = $('#macro-r-p'); if (rP) rP.value = calc.rest.protein;
    const rC = $('#macro-r-c'); if (rC) rC.value = calc.rest.carbs;
    const rF = $('#macro-r-f'); if (rF) rF.value = calc.rest.fat;
  }

  function viewNutrition() {
    if (!ui.nutriDate) ui.nutriDate = todayKey();
    const t = dayTotals(ui.nutriDate), g = getGoals(ui.nutriDate), log = dayLog(ui.nutriDate);
    const dates = getDatesOfWeek(new Date(ui.nutriDate));

    const weekSelector = `<div class="q-days">
      ${dates.map((d, i) => {
        const sel = d === ui.nutriDate;
        return `<button class="q-day ${d === todayKey() ? 'is-today' : ''} ${dayLog(d).length ? 'has-data' : ''}" aria-pressed="${sel}" data-action="set-nutri-date" data-d="${d}">
          <span>${WEEK_HE[i]}</span><span class="q-day__num">${new Date(d).getDate()}</span><span class="q-day__dot"></span>
        </button>`;
      }).join('')}
    </div>`;

    const dayType = getDayType(ui.nutriDate);
    const typeName = k => k === 'workout' ? 'יום אימון' : k === 'rest' ? 'יום מנוחה' : 'מותאם אישית';
    const typeIcon = dayType === 'workout' ? 'dumbbell' : dayType === 'rest' ? 'moon' : 'sliders-horizontal';
    const nextType = dayType === 'workout' ? 'rest' : dayType === 'rest' ? 'custom' : 'workout';
    const menuOpen = !!(ui.menu && ui.menu.nm === 'type');
    const typeBadge = `<div class="q-nutri-type">
      <button class="q-dropdown" data-action="nutri-menu" aria-haspopup="menu" aria-expanded="${menuOpen}"><i data-lucide="${typeIcon}"></i><span class="q-dropdown__label">${typeName(dayType)}</span><i data-lucide="chevron-down" class="q-dropdown__chevron"></i></button>
      ${menuOpen ? `<div class="q-menu q-nutri-type__menu">
        <button class="q-menu__item" data-action="toggle-day-type" data-d="${ui.nutriDate}"><i data-lucide="repeat"></i>החלף ל${typeName(nextType)}</button>
        <button class="q-menu__item" data-action="auto-macro-open"><i data-lucide="wand-sparkles"></i>הגדרת יעדים אוטומטית</button>
        <button class="q-menu__item" data-action="edit-goals"><i data-lucide="pencil"></i>ערוך יעדים ידנית</button>
      </div>` : ''}
    </div>`;

    const empty = log.length === 0;
    const kcal = Math.round(t.kcal), goalKcal = g.kcal;
    const over = goalKcal > 0 && kcal > goalKcal;
    const macros = [['protein', 'חלבון', t.p, g.protein], ['carbs', 'פחמימות', t.c, g.carbs], ['fat', 'שומן', t.f, g.fat]].map(([k, label, v, goal]) => macroBar(k, label, v, goal, empty)).join('');
    const summary = empty
      ? `<div class="q-card q-sum">
          <div class="q-sum__top"><div class="q-sum__main"><span class="q-sum__label">יעד להיום</span><span class="q-sum__big">${fmtN(goalKcal)}</span></div>
            <button class="q-btn q-btn--ghost q-btn--compact q-sum__link" data-action="edit-goals">ערוך יעדים</button></div>
          ${macros}</div>`
      : `<div class="q-card q-sum">
          <div class="q-sum__top"><div class="q-sum__main"><span class="q-sum__label">קלוריות</span><span class="q-sum__big ${over ? 'is-over' : ''}">${fmtN(kcal)}</span></div>
            <div class="q-sum__side"><span>מתוך <span class="num">${fmtN(goalKcal)}</span></span>
              ${over ? `<span class="is-over">חריגה <span class="num">${fmtN(kcal - goalKcal)}</span></span>` : `<span>נותרו <span class="num">${fmtN(goalKcal - kcal)}</span></span>`}</div></div>
          ${macros}</div>`;

    const meals = MEALS.map(meal => {
      const items = log.map((it, idx) => Object.assign({ idx }, it)).filter(it => (it.meal || 'snack') === meal.k);
      if (!items.length) {
        return `<button class="q-add-row" data-action="food-open-meal" data-meal="${meal.k}"><i data-lucide="plus"></i>הוסף ${meal.he}</button>`;
      }
      const kc = items.reduce((a, i) => a + i.kcal, 0);
      return `<section class="q-meal">
        <div class="q-meal__head"><span class="q-meal__title">${meal.he}</span><span class="q-meal__kcal">${Math.round(kc)}</span>
          <button class="q-icon-btn q-meal__add" data-action="food-open-meal" data-meal="${meal.k}" aria-label="הוסף ל${meal.he}"><i data-lucide="plus"></i></button></div>
        <div class="q-list">${items.map(i => {
          const open = !!(ui.menu && ui.menu.mid === 'nf-' + i.idx);
          return `<div class="q-list-row q-list-row--static q-meal__row">
            <span class="q-list-row__text"><span class="q-list-row__title">${i.name}</span><span class="q-list-row__sub">${i.label}</span></span>
            <span class="q-list-row__value">${Math.round(i.kcal)}</span>
            <button class="q-icon-btn q-list-row__more" data-action="item-menu" data-id="nf-${i.idx}" aria-label="עוד" aria-expanded="${open}"><i data-lucide="ellipsis-vertical"></i></button>
            ${open ? `<div class="q-menu q-meal__menu"><button class="q-menu__item q-menu__item--danger" data-action="food-del" data-i="${i.idx}"><i data-lucide="trash-2"></i>מחק</button></div>` : ''}
          </div>`;
        }).join('')}</div>
      </section>`;
    }).join('');

    return `<div class="q-stack q-gap-4">
      <div class="q-row q-between q-gap-3"><h1 class="q-screen-title__text">תזונה</h1>${typeBadge}</div>
      ${weekSelector}
      ${summary}
      <div class="q-stack ${empty ? 'q-gap-2' : 'q-gap-4'}">${meals}</div>
    </div>`;
  }

  /* ---- Weight & Progress Views ---- */
  function nutritionChart(w = 320, h = 120) {
    const cur = ui.nutriDate || todayKey();
    const dates = getDatesOfWeek(new Date(cur));
    const items = dates.map(d => {
      const t = dayTotals(d), g = getGoals(d);
      return { d, p: t.p, pg: g.protein, c: t.kcal, cg: g.kcal };
    });
    const bw = (w - 10) / 7, ch = h - 30, base = h - 24;
    const bar = (cls, x, bwid, pct) => {
      const hh = Math.max(2, Math.min(100, pct)) / 100 * ch;
      return `<rect class="${cls}" x="${x}" y="${base - hh}" width="${bwid}" height="${hh}" rx="2"/>`;
    };
    return `<div class="q-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="התמדה שבועית בתזונה">
      <line class="q-chart__target" x1="5" x2="${w - 5}" y1="${base - ch}" y2="${base - ch}"/>
      ${items.map((it, i) => {
        const x0 = 5 + i * bw + 2, half = (bw - 4) / 2 - 1;
        return bar('q-chart__bar--protein', x0, half, it.p / (it.pg || 1) * 100) +
               bar('q-chart__bar q-chart__bar--current', x0 + (bw - 4) / 2, half, it.c / (it.cg || 1) * 100) +
               `<text class="q-chart__label ${it.d === cur ? 'is-current' : ''}" x="${5 + i * bw + bw / 2}" y="${h - 8}" text-anchor="middle">${WEEK_HE[i]}</text>`;
      }).join('')}
    </svg>
    <div class="q-legend"><span class="q-legend__item q-legend__item--protein">יעד חלבון</span><span class="q-legend__item">יעד קלוריות</span></div></div>`;
  }

  function lineChartWeights(points, w = 320, h = 140) {
    if (points.length < 2) return '';
    const vals = points.map(p => p.kg), min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5, px = 14;
    const X = i => px + i * (w - 2 * px) / (points.length - 1), Y = v => h - 18 - (v - min) / (max - min) * (h - 36);
    const path = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.kg).toFixed(1)).join(' ');
    const ma = [];
    for (let i = 0; i < points.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) { sum += points[j].kg; count++; }
      ma.push(sum / count);
    }
    const pathMa = ma.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    return `<div class="q-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="גרף משקל גוף">
      <line class="q-chart__grid" x1="${px}" x2="${w - px}" y1="18" y2="18"/><line class="q-chart__grid" x1="${px}" x2="${w - px}" y1="${h - 18}" y2="${h - 18}"/>
      <path class="q-chart__line q-chart__line--avg" d="${pathMa}"/>
      <path class="q-chart__line" d="${path}"/>
      ${points.map((p, i) => `<circle class="q-chart__dot" cx="${X(i).toFixed(1)}" cy="${Y(p.kg).toFixed(1)}" r="3"/>`).join('')}
      <text class="q-chart__label" x="${px}" y="12">${max.toFixed(1)}</text>
      <text class="q-chart__label" x="${px}" y="${h - 3}">${min.toFixed(1)}</text>
    </svg><div class="q-chart__axis"><span>${fmtDate(points[0].date)}</span><span>${fmtDate(points[points.length - 1].date)}</span></div>
    <div class="q-legend"><span class="q-legend__item">משקל יומי</span><span class="q-legend__item q-legend__item--avg">ממוצע נע (7)</span></div></div>`;
  }

  /* bars: past workouts muted, latest = chart colour, workouts with a PR = done colour */
  function barChart(items, w = 320, h = 96) {
    if (!items.length) return '';
    const max = Math.max(...items.map(i => i.v), 1), bw = (w - 10) / items.length;
    return `<div class="q-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="נפח ב-12 האימונים האחרונים">${items.map((it, i) => {
      const bh = Math.max(2, it.v / max * (h - 8));
      const cls = 'q-chart__bar' + (it.pr ? ' q-chart__bar--pr' : i === items.length - 1 ? ' q-chart__bar--current' : '');
      return `<rect class="${cls}" x="${(5 + i * bw + 2).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>`;
    }).join('')}</svg></div>`;
  }

  function weeklyMuscleVolumeHTML() {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const muscleSets = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      biceps: 0,
      triceps: 0,
      core: 0
    };

    let totalSets = 0;
    (S.history || []).forEach(w => {
      const wDate = new Date(w.date);
      if (wDate >= sevenDaysAgo) {
        (w.exercises || []).forEach(e => {
          const ex = exById(e.exId);
          if (ex && ex.muscle && muscleSets[ex.muscle] !== undefined) {
            const count = (e.sets || []).filter(s => s.type !== 'W' && s.done !== false).length;
            muscleSets[ex.muscle] += count;
            totalSets += count;
          }
        });
      }
    });

    const targetMuscles = [
      { key: 'chest', he: 'חזה' },
      { key: 'back', he: 'גב' },
      { key: 'legs', he: 'רגליים' },
      { key: 'shoulders', he: 'כתפיים' },
      { key: 'biceps', he: 'יד קדמית' },
      { key: 'triceps', he: 'יד אחורית' },
      { key: 'core', he: 'בטן' }
    ];

    /* display scale: 0-25 sets; the 10-20 target band sits at 40%-80% of the track */
    const SCALE = 25, empty = totalSets === 0;
    const rows = targetMuscles.map(m => {
      const c = muscleSets[m.key];
      return `<div class="q-vol__row"><span class="q-vol__name">${m.he}</span>
        <span class="q-vol__track"><span class="q-vol__band"></span>${empty ? '' : `<progress class="q-vol__bar" value="${Math.min(c, SCALE)}" max="${SCALE}"></progress>`}</span>
        <span class="q-vol__val num">${empty ? '' : c}</span></div>`;
    }).join('');

    return `<section class="q-card q-card--panel">
      <div class="q-card__head"><span class="q-card__label">סטים השבוע לשריר</span><span class="q-card__meta">יעד <span class="num ltr">10–20</span></span></div>
      ${empty ? '<span class="q-card__text">אחרי האימון הראשון תראה כאן כמה סטים עשית לכל שריר. האזור המסומן הוא היעד.</span>' : ''}
      <div class="q-vol">${rows}</div>
      ${empty ? '' : `<span class="q-section-sub">סה״כ <span class="num">${totalSets}</span> סטים ב-7 הימים האחרונים</span>`}
    </section>`;
  }

  function lineChartExercise(points, w = 320, h = 130) {
    if (points.length < 2) return '';
    const vals = points.map(p => p.kg), min = Math.max(0, Math.min(...vals) - 2), max = Math.max(...vals) + 2, px = 14;
    const X = i => px + i * (w - 2 * px) / (points.length - 1), Y = v => h - 18 - (v - min) / (max - min) * (h - 36);
    const path = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.kg).toFixed(1)).join(' ');
    return `<div class="q-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="גרף התקדמות משקל">
      <line class="q-chart__grid" x1="${px}" x2="${w - px}" y1="18" y2="18"/><line class="q-chart__grid" x1="${px}" x2="${w - px}" y1="${h - 18}" y2="${h - 18}"/>
      <path class="q-chart__line" d="${path}"/>
      ${points.map((p, i) => `<circle class="q-chart__dot" cx="${X(i).toFixed(1)}" cy="${Y(p.kg).toFixed(1)}" r="3.5"/>`).join('')}
      <text class="q-chart__label" x="${px}" y="12">${max.toFixed(1)}</text>
      <text class="q-chart__label" x="${px}" y="${h - 3}">${min.toFixed(1)}</text>
    </svg><div class="q-chart__axis"><span>${fmtDate(points[0].date)}</span><span>${fmtDate(points[points.length - 1].date)}</span></div></div>`;
  }

  /* read-only per-exercise stats from S.history (shared by the progress explorer and the exercise page) */
  function exerciseStats(curId) {
    const exHistory = [];
    [...S.history].reverse().forEach(w => {
      const found = (w.exercises || []).find(e => e.exId === curId);
      if (found && found.sets && found.sets.length) {
        const validSets = found.sets.filter(s => s.type !== 'W' && num(s.kg) > 0);
        if (validSets.length) {
          const maxKg = Math.max(...validSets.map(s => num(s.kg)));
          const max1RM = Math.max(...validSets.map(s => e1rm(num(s.kg), num(s.reps))));
          exHistory.push({
            date: w.date,
            kg: maxKg,
            rm: Math.round(max1RM),
            sets: validSets
          });
        }
      }
    });

    let bestKg = 0, bestReps = 0, best1RM = 0;
    S.history.forEach(w => {
      const found = (w.exercises || []).find(e => e.exId === curId);
      if (found) {
        found.sets.forEach(s => {
          if (s.type !== 'W' && num(s.kg) > 0) {
            const k = num(s.kg), r = num(s.reps);
            const rm = e1rm(k, r);
            if (rm > best1RM) {
              best1RM = rm;
              bestKg = k;
              bestReps = r;
            }
          }
        });
      }
    });
    return { exHistory, bestKg, bestReps, best1RM };
  }

  function exerciseExplorerHTML() {
    let curId = ui.explorerExId;
    if (!curId || !exById(curId)) {
      if (S.history.length && S.history[0].exercises && S.history[0].exercises.length) {
        curId = S.history[0].exercises[0].exId;
      } else {
        curId = EX[0] ? EX[0].id : null;
      }
      ui.explorerExId = curId;
    }
    const curEx = exById(curId);
    if (!curEx) return '';

    if (!S.history.length) {
      return `<section class="q-card q-card--panel"><span class="q-card__label">התקדמות לפי תרגיל</span>
        <span class="q-card__text">שיאים ו-1RM משוער יופיעו לכל תרגיל אחרי הסט הראשון שתסמן.</span></section>`;
    }

    const { exHistory, bestKg, bestReps, best1RM } = exerciseStats(curId);

    return `<section class="q-card q-card--panel">
      <div class="q-card__head"><span class="q-card__label">התקדמות לפי תרגיל</span></div>
      <label class="q-field"><span class="q-sr-only">בחר תרגיל מהספרייה</span>
        <span class="q-input"><select id="select-explorer-ex" class="q-input__control">
          ${EX.map(e => `<option value="${e.id}" ${e.id === curId ? 'selected' : ''}>${e.name || e.en} · ${e.heName || e.he}</option>`).join('')}
        </select><i data-lucide="chevron-down" class="q-input__icon"></i></span></label>
      <span class="q-section-sub">${curEx.heName || curEx.he || ''} · ${muscleHe(curEx)} · ${equipHe(curEx)}</span>
      ${exHistory.length ? `
        <div class="q-stat-row">
          <div class="q-stat"><span class="q-stat__label">שיא עבודה · ק״ג × חזרות</span><span class="q-stat__value" dir="ltr">${fmtN(bestKg)}×${bestReps}</span></div>
          <div class="q-stat"><span class="q-stat__label">1RM משוער · ק״ג</span><span class="q-stat__value">${Math.round(best1RM)}</span></div>
          <div class="q-stat"><span class="q-stat__label">אימונים</span><span class="q-stat__value">${exHistory.length}</span></div>
        </div>
        ${exHistory.length >= 2 ? `<span class="q-card__label">משקל עבודה מקסימלי · ק״ג</span>${lineChartExercise(exHistory.map(h => ({ date: h.date, kg: h.kg })))}` : ''}
        <span class="q-card__label">הסטים האחרונים</span>
        <div class="q-list">${exHistory.slice(-5).reverse().map(h => `<div class="q-list-row q-list-row--static"><span class="q-list-row__text"><span class="q-list-row__title">${fmtDate(h.date)}</span><span class="q-list-row__sub ltr">${h.sets.map(setLabel).join(' · ')}</span></span></div>`).join('')}</div>
      ` : '<span class="q-card__text">עוד לא ביצעת את התרגיל הזה. שיאים ו-1RM משוער יופיעו אחרי הסט הראשון.</span>'}
    </section>`;
  }

  /* ---- Exercise page (presentation only: reads S.history, writes nothing) ---- */
  function setLabel(s) { return num(s.kg) > 0 ? `${fmtN(num(s.kg))} × ${num(s.reps)}` : `${num(s.reps)} חזרות`; }
  function exInfoEmpty(title, text) { return `<div class="q-empty"><span class="q-empty__title">${title}</span><span class="q-empty__text">${text}</span></div>`; }

  function exInfoHTML(m) {
    const ex = exById(m.id);
    if (!ex) return qSheet('תרגיל לא נמצא', exInfoEmpty('התרגיל לא נמצא', 'ייתכן שהוא הוסר מהספרייה.'), { full: true });
    const tab = m.tab || 'about';
    const tabs = [['about', 'אודות'], ['history', 'היסטוריה'], ['charts', 'גרפים'], ['records', 'שיאים']];
    const sessions = [];
    S.history.forEach(w => {
      const f = (w.exercises || []).find(e => e.exId === ex.id);
      const sets = f ? (f.sets || []).filter(s => s.type !== 'W') : [];
      if (sets.length) sessions.push({ date: w.date, sets });
    });
    let body = '';
    if (tab === 'about') {
      const pose = cap => `<figure class="q-board__pose"><div class="q-board__frame"><div class="q-board__placeholder"><span class="q-board__letter">${exLetter(ex)}</span></div></div><figcaption class="q-board__caption">${cap}</figcaption></figure>`;
      body = `<div class="q-board q-board--poses">${pose('התחלה')}${pose('סיום')}</div>
        <div class="q-stack q-gap-2">
          <span class="q-exp__name">${ex.heName || ex.he || ''}</span>
          <div class="q-badges"><span class="q-badge">${muscleHe(ex)}</span><span class="q-badge">${equipHe(ex)}</span></div>
        </div>
        <div class="q-section-header"><span class="q-section-header__title">הוראות ביצוע</span></div>
        ${exInfoEmpty('עוד אין הוראות ביצוע', 'לתרגיל הזה עוד לא נוספו הוראות ביצוע.')}`;
    } else if (tab === 'history') {
      body = sessions.length
        ? `<div class="q-list">${sessions.slice(0, 30).map(x => `<div class="q-list-row q-list-row--static"><span class="q-list-row__text"><span class="q-list-row__title">${fmtDate(x.date)}</span><span class="q-list-row__sub ltr">${x.sets.map(setLabel).join(' · ')}</span></span></div>`).join('')}</div>`
        : exInfoEmpty('עוד לא ביצעת את התרגיל', 'אחרי האימון הראשון תופיע כאן ההיסטוריה של הסטים.');
    } else if (tab === 'charts') {
      const st = exerciseStats(ex.id);
      body = st.exHistory.length >= 2
        ? `<div class="q-section-header"><span class="q-section-header__title">משקל עבודה מקסימלי · ק״ג</span></div>${lineChartExercise(st.exHistory.map(h => ({ date: h.date, kg: h.kg })), 320, 130, true)}`
        : exInfoEmpty('אין מספיק נתונים לגרף', 'הגרף יופיע אחרי שני אימונים לפחות עם משקל בתרגיל הזה.');
    } else {
      const st = exerciseStats(ex.id);
      const prs = [];
      S.history.forEach(w => {
        const f = (w.exercises || []).find(e => e.exId === ex.id);
        const ps = f ? (f.sets || []).filter(s => s.pr) : [];
        if (ps.length) { const b = ps.reduce((a, c) => num(c.kg) > num(a.kg) ? c : a); prs.push({ date: w.date, s: b }); }
      });
      body = st.best1RM > 0
        ? `<div class="q-stat-row">
            <div class="q-stat"><span class="q-stat__label">שיא עבודה · ק״ג</span><span class="q-stat__value" dir="ltr">${fmtN(st.bestKg)}×${st.bestReps}</span></div>
            <div class="q-stat"><span class="q-stat__label">1RM משוער · ק״ג</span><span class="q-stat__value">${Math.round(st.best1RM)}</span></div>
            <div class="q-stat"><span class="q-stat__label">אימונים</span><span class="q-stat__value">${st.exHistory.length}</span></div>
          </div>
          ${prs.length ? `<div class="q-section-header"><span class="q-section-header__title">שיאים אחרונים</span></div>
            <div class="q-list">${prs.slice(0, 5).map(p => `<div class="q-list-row q-list-row--static"><i data-lucide="trophy" class="q-list-row__icon-done"></i><span class="q-list-row__text"><span class="q-list-row__title">${fmtDate(p.date)}</span></span><span class="q-list-row__value q-list-row__value--lg ltr">${setLabel(p.s)}</span></div>`).join('')}</div>` : ''}`
        : exInfoEmpty('עוד אין שיאים', 'השיאים יופיעו אחרי שתבצע את התרגיל עם משקל באימון.');
    }
    return qSheet(ex.name || ex.en, `
      <div class="q-segmented" role="tablist">${tabs.map(t => `<button class="q-segmented__item" role="tab" aria-selected="${tab === t[0]}" data-action="ex-tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
      ${body}`, { full: true, ltr: true });
  }

  function backupCardHTML() {
    const hasData = S.history.length || S.weights.length || Object.keys(S.nutrition || {}).some(k => (S.nutrition[k] || []).length);
    const importBtn = `<button class="q-btn q-btn--secondary q-btn--block" data-action="import-backup-click"><i data-lucide="upload"></i>שחזר מגיבוי</button>`;
    return `<section class="q-card q-card--panel">
      <span class="q-card__title">${hasData ? 'גיבוי ושחזור' : 'שחזור מגיבוי'}</span>
      <span class="q-card__text">${hasData ? 'שמור עותק של האימונים, התפריטים, המשקלים והתבניות שלך על המכשיר, או שחזר מגיבוי קודם.' : 'עברת מכשיר? טען קובץ גיבוי.'}</span>
      ${hasData ? `<div class="q-row-split">
        <button class="q-btn q-btn--secondary q-btn--block" data-action="export-backup"><i data-lucide="download"></i>ייצא גיבוי</button>
        ${importBtn}</div>` : importBtn}
      <input type="file" id="backup-file-input" accept=".json,application/json" hidden />
    </section>`;
  }

  function viewProgress() {
    const ws = S.weights, last = ws[ws.length - 1], first = ws[0];
    const deltaAll = last && first && ws.length > 1 ? r1(last.kg - first.kg) : 0;

    // 7-day rolling average & delta vs previous 7 days
    const recent7 = ws.slice(-7);
    const avg7 = recent7.length ? r1(recent7.reduce((a, b) => a + b.kg, 0) / recent7.length) : null;
    const prev7 = ws.length >= 8 ? ws.slice(-Math.min(14, ws.length), -7) : [];
    const prevAvg7 = prev7.length ? r1(prev7.reduce((a, b) => a + b.kg, 0) / prev7.length) : null;
    const deltaWeekly = (avg7 !== null && prevAvg7 !== null) ? r1(avg7 - prevAvg7) : null;

    const hist = S.history.slice(0, 12).reverse();
    const totalPR = S.history.reduce((a, w) => a + (w.prs || 0), 0);
    const signed = n => (n > 0 ? '+' : '') + n;

    const weightEntry = (label) => `<div class="q-row q-gap-2">
        <label class="q-input q-input--number q-grow"><input id="weight-input" type="number" step="0.1" inputmode="decimal" class="q-input__control" dir="ltr" placeholder='ק"ג' value="${last ? last.kg : ''}" aria-label="משקל גוף בק״ג" /><span class="q-input__unit">ק״ג</span></label>
        <button class="q-btn q-btn--primary" data-action="weight-add">${label}</button>
      </div>`;

    const weightCard = !ws.length
      ? `<section class="q-card q-card--panel">
          <span class="q-card__title">רשום משקל, תראה מגמה</span>
          <span class="q-card__text">שקילה אחת בשבוע, באותה שעה, מספיקה כדי לראות לאן זה הולך.</span>
          ${weightEntry('רשום משקל')}
        </section>`
      : `<section class="q-card q-card--panel">
          <div class="q-card__head"><span class="q-card__label">משקל גוף · ק״ג</span><span class="q-card__meta"><span class="num">${ws.length}</span> שקילות</span></div>
          <div class="q-stat-row">
            <div class="q-stat"><span class="q-stat__label">אחרון</span><span class="q-stat__value">${last.kg}</span></div>
            <div class="q-stat"><span class="q-stat__label">ממוצע 7 ימים</span><span class="q-stat__value">${avg7}</span></div>
            ${deltaWeekly !== null ? `<div class="q-stat"><span class="q-stat__label">מול שבוע שעבר</span><span class="q-stat__value" dir="ltr">${signed(deltaWeekly)}</span></div>` : ''}
          </div>
          ${ws.length >= 2 ? lineChartWeights(ws.slice(-30)) : '<span class="q-section-sub">הוסף עוד שקילה אחת כדי לראות גרף.</span>'}
          ${ws.length >= 2 ? `<span class="q-section-sub">שינוי כולל <span class="num ltr">${signed(deltaAll)}</span> ק״ג</span>` : ''}
          ${weightEntry('שמור')}
        </section>`;

    const volumeCard = hist.length ? `<section class="q-card q-card--panel">
        <div class="q-card__head"><span class="q-card__label">נפח · 12 אימונים אחרונים</span><span class="q-card__meta">ממוצע <span class="num">${fmtN(hist.reduce((a, w) => a + w.volume, 0) / hist.length)}</span> ק״ג</span></div>
        ${barChart(hist.map(w => ({ v: w.volume, pr: w.prs > 0 })))}
        ${hist.some(w => w.prs > 0) ? '<div class="q-legend"><span class="q-legend__item">האימון האחרון</span><span class="q-legend__item q-legend__item--pr">אימון עם שיא</span></div>' : ''}
        <span class="q-section-sub">סה״כ אימונים <span class="num">${S.history.length}</span> · שיאים <span class="num">${totalPR}</span></span>
      </section>` : '';

    const hasNutrition = Object.keys(S.nutrition || {}).some(k => (S.nutrition[k] || []).length);
    const nutriCard = hasNutrition ? `<section class="q-card q-card--panel">
        <div class="q-card__head"><span class="q-card__label">התמדה שבועית בתזונה</span><span class="q-card__meta">קו = יעד</span></div>
        ${nutritionChart()}
      </section>` : '';

    const weightLog = ws.length ? `<section class="q-card q-card--panel">
        <span class="q-card__label">שקילות אחרונות</span>
        <div class="q-list">${ws.slice(-6).reverse().map(w => {
          const open = !!(ui.menu && ui.menu.mid === 'wt-' + w.date);
          return `<div class="q-list-row q-list-row--static q-list-row--menu">
            <span class="q-list-row__text"><span class="q-list-row__title">${fmtDate(w.date)}</span></span>
            <span class="q-list-row__value q-list-row__value--lg"><span class="num">${w.kg}</span> ק״ג</span>
            <button class="q-icon-btn q-list-row__more" data-action="item-menu" data-id="wt-${w.date}" aria-label="עוד" aria-expanded="${open}"><i data-lucide="ellipsis-vertical"></i></button>
            ${open ? `<div class="q-menu q-list-row__menu"><button class="q-menu__item q-menu__item--danger" data-action="weight-del" data-d="${w.date}"><i data-lucide="trash-2"></i>מחק שקילה</button></div>` : ''}
          </div>`;
        }).join('')}</div>
      </section>` : '';

    return `<div class="q-stack q-gap-4">
      <h1 class="q-screen-title__text">מעקב</h1>
      <div class="q-stack q-gap-2">
        ${weightCard}
        ${weeklyMuscleVolumeHTML()}
        ${exerciseExplorerHTML()}
        ${volumeCard}
        ${nutriCard}
        ${weightLog}
        ${backupCardHTML()}
      </div>
    </div>`;
  }

  /* ---- Modals ---- */
  function closeModal() { ui.modal = null; render(); }

  function routinePickHTML() {
    const m = ui.modal, list = filteredExercises(m.q, 'all', 'all');
    if (!list.length) return '<div class="q-empty"><span class="q-empty__title">לא נמצא</span><span class="q-empty__text">נסה חיפוש אחר.</span></div>';
    return '<div class="q-list">' + list.map(e => {
      const on = m.ids.includes(e.id);
      return `<button class="q-list-row ${on ? 'is-selected' : ''}" data-action="routine-toggle" data-id="${e.id}" aria-pressed="${on}">
        ${exThumbHTML(e)}
        <span class="q-list-row__text"><span class="q-list-row__title ltr">${e.name || e.en}</span><span class="q-list-row__sub">${e.heName || e.he || ''} · ${muscleHe(e)}</span></span>
        <i data-lucide="${on ? 'check' : 'plus'}" class="q-list-row__add"></i>
      </button>`;
    }).join('') + '</div>';
  }

  function foodRow(f) {
    const fav = S.favorites.includes(f.id);
    return `<div class="q-list-row q-list-row--split">
      <button class="q-list-row__main" data-action="food-pick" data-id="${f.id}">
        <span class="q-list-row__text"><span class="q-list-row__title">${f.he}${f.custom ? ' <span class="q-badge">מותאם</span>' : ''}</span>
          <span class="q-list-row__sub">ל-100 ג׳: <span class="num">${f.kcal}</span> קק״ל · <span class="num">${f.p}</span> ג׳ חלבון</span></span>
      </button>
      <button class="q-icon-btn q-fav ${fav ? 'is-fav' : ''}" data-action="food-fav" data-id="${f.id}" aria-label="מועדף" aria-pressed="${fav}"><i data-lucide="star"></i></button>
      <button class="q-icon-btn q-list-row__act" data-action="food-quick" data-id="${f.id}" aria-label="הוסף מהר: ${f.he}"><i data-lucide="plus"></i></button></div>`;
  }

  function foodListHTML() {
    const m = ui.modal, q = (m.q || '').trim();
    const list = allFoods().filter(f => (m.cat === 'all' || f.cat === m.cat) && (!q || f.he.includes(q)));
    return list.length ? list.map(foodRow).join('') : '<div class="q-empty"><span class="q-empty__title">לא נמצא מאכל</span><span class="q-empty__text">אפשר ליצור מאכל מותאם אישית.</span></div>';
  }

  function frequentFoods() {
    const ids = S.favorites.slice();
    Object.keys(S.foodCounts).sort((a, b) => S.foodCounts[b] - S.foodCounts[a]).slice(0, 6).forEach(id => { if (S.foodCounts[id] >= 2 && !ids.includes(id)) ids.push(id); });
    return ids.map(foodById).filter(Boolean);
  }

  function getFoodGrams(m, f) {
    const amt = num(m.amount);
    if (m.mode === '100g') return amt * 100;
    if (m.mode === 'grams') return amt;
    if (m.mode === 'unit') {
      const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
      const u = naturalUnits[+m.unitIdx];
      return u ? amt * u.g : amt * 100;
    }
    return amt * 100;
  }

  function foodPreview() {
    const m = ui.modal, f = foodById(m.foodId);
    const grams = getFoodGrams(m, f);
    const c = calcFood(f, grams);
    const cell = (v, l) => `<span class="q-nutrient"><span class="q-nutrient__v">${v}</span>${l}</span>`;
    return `<div class="q-nutrients"><span class="q-nutrients__grams"><span class="num">${Math.round(grams)}</span> גרם</span>
      ${cell(Math.round(c.kcal), 'קק״ל')}${cell(fmtN(c.p), 'חלבון')}${cell(fmtN(c.c), 'פחמימות')}${cell(fmtN(c.f), 'שומן')}</div>`;
  }
  function syncFoodCta() {
    const el = $('#food-cta-kcal'); if (!el || !ui.modal || !ui.modal.foodId) return;
    const f = foodById(ui.modal.foodId);
    el.textContent = Math.round(calcFood(f, getFoodGrams(ui.modal, f)).kcal);
  }

  const mealHe = k => (MEALS.find(x => x.k === k) || { he: '' }).he;
  function foodTabsHTML(mealKey, cur) {
    const tab = (id, label, attrs) => `<button class="q-segmented__item" role="tab" aria-selected="${cur === id}" ${attrs}>${label}</button>`;
    return `<div class="q-segmented" role="tablist">${tab('search', 'חיפוש', `data-action="food-open-meal" data-meal="${mealKey}"`)}${tab('saved', 'שמורות', `data-action="saved-meals" data-meal="${mealKey}"`)}${tab('yesterday', 'מאתמול', `data-action="food-yesterday" data-meal="${mealKey}"`)}</div>`;
  }
  const foodMealChips = m => `<div class="q-chips">${MEALS.map(x => `<button class="q-chip" aria-pressed="${m.meal === x.k}" data-action="food-meal" data-v="${x.k}">${x.he}</button>`).join('')}</div>`;
  const foodBackBtn = `<button class="q-btn q-btn--ghost q-btn--compact " data-action="food-back"><i data-lucide="chevron-right"></i>חזרה</button>`;

  function foodModalHTML() {
    const m = ui.modal;
    const title = `הוסף ל${mealHe(m.meal)}`;

    if (m.view === 'custom') {
      const c = m.cf, fld = (k, label, ph, type) => `<label class="q-field"><span class="q-field__label">${label}</span><span class="q-input ${type === 'text' ? '' : 'q-input--number'}"><input class="q-input__control" data-cf="${k}" type="${type || 'number'}" ${type === 'text' ? '' : 'inputmode="decimal" step="0.1" min="0"'} placeholder="${ph || ''}" value="${escQ(c[k])}" /></span></label>`;
      return qSheet('מאכל מותאם אישית', `${foodBackBtn}
        ${fld('name', 'שם המאכל', 'למשל: שייק חלבון ביתי', 'text')}
        <label class="q-field"><span class="q-field__label">קטגוריה</span><span class="q-input"><select class="q-input__control" data-cf="cat">${Object.keys(FOOD_CATS).map(k => `<option value="${k}" ${c.cat === k ? 'selected' : ''}>${FOOD_CATS[k]}</option>`).join('')}</select><i data-lucide="chevron-down" class="q-input__icon"></i></span></label>
        <span class="q-section-sub">ערכים ל-100 גרם</span>
        <div class="q-row-split">${fld('kcal', 'קלוריות')}${fld('p', 'חלבון (ג׳)')}${fld('c', 'פחמימות (ג׳)')}${fld('f', 'שומן (ג׳)')}</div>
        <span class="q-section-sub">יחידת מידה (אופציונלי)</span>
        <div class="q-row-split">${fld('unitName', 'שם היחידה', 'יחידה / כף / כוס', 'text')}${fld('unitG', 'משקל היחידה בגרם', '')}</div>`,
        { full: true, footer: `<button class="q-btn q-btn--primary q-btn--block" data-action="custom-save">שמור מאכל</button>` });
    }

    if (m.view === 'detail') {
      const f = foodById(m.foodId);
      const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
      const modeTab = (v, label) => `<button class="q-segmented__item" role="tab" aria-selected="${m.mode === v}" data-action="set-food-mode" data-v="${v}">${label}</button>`;
      const modeTabs = `<div class="q-segmented" role="tablist">${modeTab('100g', 'לפי 100 גרם')}${modeTab('grams', 'משקל חופשי')}${naturalUnits.length ? modeTab('unit', 'לפי יחידה') : ''}</div>`;

      let inputSection = '';
      if (m.mode === '100g') {
        inputSection = `<label class="q-field"><span class="q-field__label">כמות (מנות של 100 גרם)</span><span class="q-input q-input--number"><input id="food-amount" class="q-input__control" type="number" inputmode="decimal" step="0.5" min="0" dir="ltr" value="${m.amount}" placeholder="למשל 1.5" /></span></label>
          <div class="q-quick-amounts">${[0.5, 1, 1.5, 2, 2.5, 3].map(v => `<button class="q-chip" data-action="set-amount" data-v="${v}"><span class="num">${v * 100}</span> ג׳</button>`).join('')}</div>`;
      } else if (m.mode === 'grams') {
        inputSection = `<label class="q-field"><span class="q-field__label">משקל בגרמים</span><span class="q-input q-input--number"><input id="food-amount" class="q-input__control" type="number" inputmode="decimal" step="1" min="0" dir="ltr" value="${m.amount}" placeholder="הזן משקל בגרמים" /><span class="q-macro__unit">ג׳</span></span></label>`;
      } else if (m.mode === 'unit') {
        inputSection = `<div class="q-row-split q-row-split--auto">
          <label class="q-field"><span class="q-field__label">כמות</span><span class="q-input q-input--number"><input id="food-amount" class="q-input__control" type="number" inputmode="decimal" step="0.5" min="0" dir="ltr" value="${m.amount}" /></span></label>
          <label class="q-field"><span class="q-field__label">יחידה</span><span class="q-input"><select id="food-unit-idx" class="q-input__control">
            ${naturalUnits.map((u, i) => `<option value="${i}" ${String(m.unitIdx) === String(i) ? 'selected' : ''}>${u.name} (${u.g} ג׳)</option>`).join('')}
          </select><i data-lucide="chevron-down" class="q-input__icon"></i></span></label></div>`;
      }

      const cta = Math.round(calcFood(f, getFoodGrams(m, f)).kcal);
      return qSheet(title, `${foodBackBtn}
        ${foodMealChips(m)}
        <div class="q-food-sel">
          <div class="q-stack"><span class="q-food-sel__title">${escQ(f.he)}${f.custom ? ' <span class="q-badge">מותאם</span>' : ''}</span>
            <span class="q-section-sub">ל-100 גרם: <span class="num">${f.kcal}</span> קק״ל · ח <span class="num">${f.p}</span> · פ <span class="num">${f.c}</span> · ש <span class="num">${f.f}</span></span></div>
          ${modeTabs}
          ${inputSection}
          <div id="food-preview">${foodPreview()}</div>
        </div>
        ${f.custom ? `<button class="q-btn q-btn--danger-ghost q-btn--block" data-action="custom-del" data-id="${f.id}"><i data-lucide="trash-2"></i>מחק מאכל מותאם</button>` : ''}`,
        { full: true, footer: `<button class="q-btn q-btn--primary q-btn--block" data-action="food-confirm">הוסף · <span class="num" id="food-cta-kcal">${cta}</span> קק״ל</button>` });
    }

    if (m.tab === 'yesterday') {
      const prev = getPrevDay(ui.nutriDate || todayKey());
      const list = dayLog(prev).filter(it => (it.meal || 'snack') === m.meal);
      const body = `${foodTabsHTML(m.meal, 'yesterday')}
        ${list.length ? `<div class="q-section-header"><span class="q-section-header__title">${mealHe(m.meal)} מאתמול</span><span class="q-section-header__count num">${list.length}</span></div>
          <div class="q-list">${list.map(i => `<div class="q-list-row q-list-row--static">
            <span class="q-list-row__text"><span class="q-list-row__title">${escQ(i.name)}</span><span class="q-list-row__sub">${escQ(i.label)}</span></span>
            <span class="q-list-row__value">${Math.round(i.kcal)}</span></div>`).join('')}</div>`
          : `<div class="q-empty"><span class="q-empty__title">אין מאכלים מאתמול</span><span class="q-empty__text">כשיהיו מאכלים בארוחה הזו אתמול, אפשר להעתיק אותם מכאן.</span></div>`}`;
      return qSheet(title, body, { full: true, footer: list.length ? `<button class="q-btn q-btn--primary q-btn--block" data-action="copy-yesterday" data-meal="${m.meal}">העתק <span class="num">${list.length}</span> מאכלים</button>` : '' });
    }

    const fr = frequentFoods();
    return qSheet(title, `${foodTabsHTML(m.meal, 'search')}
      ${foodMealChips(m)}
      <label class="q-input"><i data-lucide="search" class="q-input__icon"></i><input class="q-input__control" autocomplete="off" placeholder="חיפוש מאכל" data-search="food" value="${escQ(m.q || '')}" /></label>
      <div class="q-chips"><button class="q-chip" aria-pressed="${m.cat === 'all'}" data-action="food-cat" data-v="all">הכל</button>
        ${Object.keys(FOOD_CATS).map(k => `<button class="q-chip" aria-pressed="${m.cat === k}" data-action="food-cat" data-v="${k}">${FOOD_CATS[k]}</button>`).join('')}</div>
      <button class="q-btn q-btn--secondary q-btn--block" data-action="food-custom"><i data-lucide="plus"></i>מאכל מותאם אישית</button>
      ${fr.length ? `<span class="q-section-sub">המאכלים הקבועים שלי · לחיצה מוסיפה מיד</span>
        <div class="q-chips">${fr.map(f => `<button class="q-chip" data-action="food-quick" data-id="${f.id}"><i data-lucide="plus"></i>${f.he}</button>`).join('')}</div>` : ''}
      <div class="q-list" id="food-list">${foodListHTML()}</div>`, { full: true });
  }

  function openRoutineEditor(routineId) {
    const r = S.routines.find(x => x.id === routineId);
    if (!r) return;
    const normalized = normalizeRoutineExercises(r);
    ui.modal = {
      type: 'editRoutine',
      routineId: r.id,
      name: r.name,
      exercises: normalized.map(e => ({
        exId: e.exId,
        targetSets: e.targetSets || 3,
        sets: (e.sets || []).map(s => ({ type: s.type || 'N', kg: s.kg !== undefined ? s.kg : '', reps: s.reps !== undefined ? s.reps : '' }))
      })),
      subview: 'main',
      q: '',
      mus: 'all'
    };
    renderModal();
  }

  /* Re-rendering the same sheet (stepper tap, menu open, subview) must not replay the slide-in or lose the scroll position. */
  function renderModal() {
    const el = $('#modal'), m = ui.modal;
    const key = m ? m.type + '|' + (m.subview || '') + '|' + (m.view || '') : '';
    const same = !!m && el.firstElementChild && renderModal._key === key;
    const prev = el.querySelector('.q-sheet__body');
    const top = same && prev ? prev.scrollTop : 0;
    renderModalHTML();
    renderModal._key = key;
    if (same) {
      const ov = el.querySelector('.q-overlay'); if (ov) ov.classList.add('is-static');
      const nb = el.querySelector('.q-sheet__body'); if (nb) nb.scrollTop = top;
    }
  }

  function renderModalHTML() {
    const el = $('#modal'), m = ui.modal;
    if (!m) { el.innerHTML = ''; return; }
    if (m.type === 'pickEx') {
      const title = m.replaceEi !== undefined ? 'החלפת תרגיל' : 'בחר תרגיל';
      const btnLabel = m.replaceEi !== undefined ? 'החלף' : 'הוסף';
      el.innerHTML = qSheet(title, `${searchInputHTML('pick', m.q || '')}
        ${chips(MUSCLES, m.mus || 'all', 'pick-muscle')}<div id="pick-list">${exerciseListHTML(filteredExercises(m.q, m.mus || 'all', 'all'), 'pick-ex', btnLabel)}</div>`, { full: true });
    } else if (m.type === 'exInfo') {
      el.innerHTML = exInfoHTML(m);
    } else if (m.type === 'food') {
      el.innerHTML = foodModalHTML();
    } else if (m.type === 'editRoutine') {
      if (m.subview === 'addEx') {
        const filtered = filteredExercises(m.q, m.mus || 'all', 'all');
        el.innerHTML = qSheet('הוסף תרגיל לתבנית', `
          <div class="q-row q-between">
            <button class="q-btn q-btn--ghost q-btn--compact" data-action="routine-editor-add-back"><i data-lucide="chevron-right"></i>חזרה לעריכה</button>
            <span class="q-section-sub"><span class="num">${filtered.length}</span> תרגילים זמינים</span>
          </div>
          ${searchInputHTML('redit-pick', m.q || '')}
          ${chips(MUSCLES, m.mus || 'all', 'redit-muscle')}
          <div id="redit-pick-list">
            ${exerciseListHTML(filtered, 'routine-editor-add-ex', 'הוסף לתבנית')}
          </div>
        `, { full: true });
      } else {
        const rows = m.exercises.map((item, idx) => {
          const ex = exById(item.exId) || { name: 'Exercise', en: 'Exercise', heName: 'תרגיל', he: 'תרגיל', muscle: 'chest', equipment: 'barbell', pose: 'bench-press' };
          const open = !!(ui.menu && ui.menu.mid === 're-' + idx);
          return `<div class="q-card q-card--nested q-redit">
              <div class="q-redit__head">
                ${exThumbHTML(ex)}
                <span class="q-list-row__text"><span class="q-list-row__title ltr">${ex.name || ex.en}</span><span class="q-list-row__sub">${ex.heName || ex.he}</span></span>
                <button class="q-icon-btn" data-action="item-menu" data-id="re-${idx}" aria-label="עוד" aria-expanded="${open}"><i data-lucide="ellipsis-vertical"></i></button>
              </div>
              ${open ? `<div class="q-menu q-redit__menu">
                <button class="q-menu__item" data-action="routine-ex-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i>העלה</button>
                <button class="q-menu__item" data-action="routine-ex-down" data-idx="${idx}" ${idx === m.exercises.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down"></i>הורד</button>
                <button class="q-menu__item q-menu__item--danger" data-action="routine-ex-del" data-idx="${idx}"><i data-lucide="trash-2"></i>הסר תרגיל</button>
              </div>` : ''}
              <div class="q-redit__sets">
                <span class="q-section-sub">יעד סטים</span>
                <div class="q-stepper">
                  <button class="q-stepper__btn" data-action="routine-set-dec" data-idx="${idx}" aria-label="פחות סטים"><i data-lucide="minus"></i></button>
                  <span class="q-stepper__value"><span class="num">${item.targetSets || 3}</span></span>
                  <button class="q-stepper__btn" data-action="routine-set-inc" data-idx="${idx}" aria-label="עוד סט"><i data-lucide="plus"></i></button>
                </div>
              </div>
            </div>`;
        }).join('');

        el.innerHTML = qSheet('עריכת תבנית', `
          <label class="q-field"><span class="q-field__label">שם התבנית</span>
            <span class="q-input"><input id="routine-edit-name" class="q-input__control" value="${escQ(m.name)}" placeholder="שם התבנית" /></span></label>
          <div class="q-section-header"><span class="q-section-header__title">תרגילי התבנית · <span class="num">${m.exercises.length}</span></span>
            <button class="q-section-header__action q-row q-gap-1" data-action="routine-editor-add-open"><i data-lucide="plus"></i>הוסף תרגיל</button></div>
          ${m.exercises.length ? rows : '<div class="q-empty"><span class="q-empty__title">אין תרגילים בתבנית</span><span class="q-empty__text">הוסף תרגילים כדי שהתבנית תתחיל אימון.</span></div>'}
        `, { full: true, footer: '<button class="q-btn q-btn--primary q-btn--block" data-action="routine-editor-save">שמור שינויים</button>' });
      }
    } else if (m.type === 'smartRoutineSync') {
      const opt = (action, icon, title, sub) => `<button class="q-list-row" data-action="${action}"><i data-lucide="${icon}" class="q-list-row__lead"></i><span class="q-list-row__text"><span class="q-list-row__title">${title}</span><span class="q-list-row__sub">${sub}</span></span><i data-lucide="chevron-left" class="q-list-row__chevron"></i></button>`;
      el.innerHTML = qSheet('סנכרון תבנית אימון', `
        <div class="q-stack q-gap-1">
          <span class="q-exp__name">עדכון התבנית "${escQ(m.routineName)}"</span>
          <span class="q-card__text">האימון נשמר בהיסטוריה. ביצעת שינויים בתרגילים או במספר הסטים במהלך האימון. כיצד לעדכן את התבנית הקבועה?</span>
        </div>
        <div class="q-list">
          ${opt('sync-routine-full', 'refresh-cw', 'עדכן תבנית במלואה', 'עדכן תרגילים, כמויות סטים ומשקלי עבודה')}
          ${opt('sync-routine-weights', 'scale', 'עדכן רק משקלי עבודה וחזרות', 'שמור על רשימת התרגילים המקורית של התבנית')}
          ${opt('sync-routine-none', 'archive', 'שמור אימון להיסטוריה בלבד', 'השאר את התבנית ללא שינוי')}
        </div>`);
    } else if (m.type === 'summary') {
      const w = m.w;
      el.innerHTML = qSheet('האימון נשמר', `
        ${w.name ? `<span class="q-exp__name">${escQ(w.name)}</span>` : ''}
        <div class="q-stat-row">
          <div class="q-stat"><span class="q-stat__label">משך</span><span class="q-stat__value" dir="ltr">${fmtClock(w.duration)}</span></div>
          <div class="q-stat"><span class="q-stat__label">נפח · ק״ג</span><span class="q-stat__value">${fmtN(w.volume)}</span></div>
          <div class="q-stat ${w.prs ? 'q-stat--pr' : 'is-empty'}"><span class="q-stat__label">שיאים</span><span class="q-stat__value">${w.prs ? '<i data-lucide="trophy"></i>' : ''}${w.prs}</span></div>
        </div>`, { footer: `<div class="q-stack q-gap-2">
          <button class="q-btn q-btn--secondary q-btn--block" data-action="share-workout"><i data-lucide="share-2"></i>שתף סיכום אימון (תמונה)</button>
          <button class="q-btn q-btn--ghost q-btn--block" data-action="close-modal">סגור</button></div>` });
    } else if (m.type === 'plateCalc') {
      const weight = num(m.weight) || 20, bar = num(m.bar) || 20;
      const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
      let left = (weight - bar) / 2;
      const used = [];
      if (left > 0) plates.forEach(p => { while (left >= p) { used.push(p); left -= p; } });
      el.innerHTML = qSheet('מחשבון פלטות', `<div class="q-row-split">
        <label class="q-field"><span class="q-field__label">משקל רצוי · ק״ג</span><span class="q-input q-input--number"><input class="q-input__control" type="number" inputmode="decimal" step="2.5" data-cf="weight" value="${weight}" dir="ltr" /></span></label>
        <label class="q-field"><span class="q-field__label">משקל מוט · ק״ג</span><span class="q-input q-input--number"><input class="q-input__control" type="number" inputmode="decimal" step="5" data-cf="bar" value="${bar}" dir="ltr" /></span></label></div>
        <span class="q-section-sub">פלטות לכל צד</span>
        ${used.length ? `<div class="q-plates ltr">${used.map(p => `<span class="q-plate">${p}</span>`).join('')}</div>` : '<span class="q-card__text">רק מוט ריק</span>'}`,
        { footer: '<button class="q-btn q-btn--secondary q-btn--block" data-action="close-modal">סגור</button>' });
    } else if (m.type === 'routine') {
      el.innerHTML = qSheet('שמירת תבנית', `<label class="q-field"><span class="q-field__label">שם התבנית</span>
        <span class="q-input"><input id="routine-name" class="q-input__control" placeholder="למשל: דחיפה A" value="${escQ(m.name || '')}" /></span></label>`,
        { footer: '<button class="q-btn q-btn--primary q-btn--block" data-action="routine-confirm">שמור תבנית</button>' });
    } else if (m.type === 'newRoutine') {
      el.innerHTML = qSheet('תבנית חדשה', `<label class="q-field"><span class="q-field__label">שם התבנית</span>
        <span class="q-input"><input id="routine-name" class="q-input__control" placeholder="למשל: רגליים כבד" value="${escQ(m.name || '')}" /></span></label>
        ${searchInputHTML('rpick', m.q || '')}
        <div id="rpick-list">${routinePickHTML()}</div>`,
        { full: true, footer: `<button class="q-btn q-btn--primary q-btn--block" data-action="routine-create">צור תבנית (<span class="num" id="rcount">${m.ids.length}</span> תרגילים)</button>` });
    } else if (m.type === 'savedMeals') {
      const mealObj = MEALS.find(x => x.k === m.meal) || { he: 'ארוחה' };
      const curDate = ui.nutriDate || todayKey();
      const currentItems = dayLog(curDate).filter(it => (it.meal || 'snack') === m.meal);
      const presets = (S.savedMeals || []).filter(p => !p.meal || p.meal === m.meal);

      const body = `${foodTabsHTML(m.meal, 'saved')}
        <button class="q-btn q-btn--secondary q-btn--block" data-action="save-meal-preset" ${currentItems.length ? '' : 'aria-disabled="true"'}><i data-lucide="bookmark-plus"></i>שמור את ${mealObj.he} של היום</button>
        ${!currentItems.length ? '<span class="q-section-sub">הוסף תחילה מאכלים לארוחה הזו כדי לשמור אותה.</span>' : ''}
        <div class="q-section-header"><span class="q-section-header__title">ארוחות שמורות</span><span class="q-section-header__count num">${presets.length}</span></div>
        ${presets.length ? presets.map(p => {
          const totKc = (p.items || []).reduce((a, b) => a + (b.kcal || 0), 0);
          const totP = (p.items || []).reduce((a, b) => a + (b.p || 0), 0);
          const pm = !!(ui.menu && ui.menu.mid === 'sm-' + p.id);
          return `<div class="q-card q-card--nested q-preset">
            <div class="q-preset__head">
              <div class="q-stack q-grow"><span class="q-preset__name">${escQ(p.name)}</span>
                <span class="q-card__sub"><span class="num">${Math.round(totKc)}</span> קק״ל · <span class="num">${fmtN(totP)}</span> ג׳ חלבון</span></div>
              <button class="q-icon-btn" data-action="item-menu" data-id="sm-${p.id}" aria-label="עוד" aria-expanded="${pm}"><i data-lucide="ellipsis-vertical"></i></button>
            </div>
            ${pm ? `<div class="q-menu q-preset__menu"><button class="q-menu__item q-menu__item--danger" data-action="delete-saved-meal" data-id="${p.id}"><i data-lucide="trash-2"></i>מחק</button></div>` : ''}
            <span class="q-card__sub">${(p.items || []).map(it => `${escQ(it.name)} (${escQ(it.label || `${Math.round(it.grams)} ג׳`)})`).join(' · ')}</span>
            <button class="q-btn q-btn--secondary q-btn--block" data-action="apply-saved-meal" data-id="${p.id}"><i data-lucide="plus"></i>הוסף ל${mealObj.he}</button>
          </div>`;
        }).join('') : `<div class="q-empty"><span class="q-empty__title">עוד אין ארוחות שמורות</span><span class="q-empty__text">שמור ארוחה שחוזרת הרבה, והיא תופיע כאן להוספה בלחיצה.</span></div>`}
      `;
      el.innerHTML = qSheet(`הוסף ל${mealObj.he}`, body, { full: true });
    } else if (m.type === 'autoMacro') {
      const calc = calcSmartMacros(m.weight, m.goal);
      const goalBtn = (g, label) => `<button class="q-segmented__item" role="tab" aria-selected="${m.goal === g}" data-action="set-macro-goal" data-g="${g}">${label}</button>`;
      const gField = (id, label, val, unit, step) => `<label class="q-field"><span class="q-field__label">${label}</span><span class="q-input q-input--number"><input id="${id}" class="q-input__control" type="number" inputmode="decimal" step="${step}" value="${val}" dir="ltr" /><span class="q-macro__unit">${unit}</span></span></label>`;
      const goalsCard = (p, title, icon, c) => `<div class="q-card q-card--nested q-goals">
          <span class="q-goals__title"><i data-lucide="${icon}"></i>${title}</span>
          <div class="q-goals__grid">
            ${gField(`macro-${p}-kcal`, 'קלוריות', c.kcal, 'קק״ל', 10)}
            ${gField(`macro-${p}-p`, 'חלבון', c.protein, 'ג׳', 1)}
            ${gField(`macro-${p}-c`, 'פחמימות', c.carbs, 'ג׳', 1)}
            ${gField(`macro-${p}-f`, 'שומן', c.fat, 'ג׳', 1)}
          </div></div>`;
      const body = `
        <label class="q-field"><span class="q-field__label">משקל גוף נוכחי (ק״ג)</span><span class="q-input q-input--number"><input id="auto-macro-weight" class="q-input__control" type="number" step="0.1" min="30" max="300" inputmode="decimal" value="${m.weight}" dir="ltr" placeholder="משקל בק״ג" /></span></label>
        <div class="q-field"><span class="q-field__label">יעד תזונתי</span>
          <div class="q-segmented" role="tablist">${goalBtn('cut', 'חיטוב')}${goalBtn('maintain', 'ניטרלי')}${goalBtn('bulk', 'מסה נקייה')}</div>
          <span class="q-section-sub">חלבון לכל ק״ג: חיטוב <span class="num">2.2</span> · ניטרלי <span class="num">2.0</span> · מסה <span class="num">2.0</span></span></div>
        <span class="q-section-sub">אפשר לערוך כל ערך ידנית לפי תוכנית התזונה שלך.</span>
        ${goalsCard('w', 'יום אימון', 'dumbbell', calc.workout)}
        ${goalsCard('r', 'יום מנוחה', 'moon', calc.rest)}
      `;
      el.innerHTML = qSheet('הגדרת יעדים אוטומטית', body, { full: true, footer: `<button class="q-btn q-btn--primary q-btn--block" data-action="apply-smart-macros">החל ושמור יעדים</button>` });
    }
    icons();
  }

  /* ============================ EVENTS ============================ */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-action],[data-nav]'); if (!t) { if (ui.menu) { ui.menu = null; render(); } return; }
    if (t.dataset.nav) { if (t.dataset.nav === 'workout' && ui.tab !== 'workout') ui.prevTab = ui.tab; ui.tab = t.dataset.nav; ui.menu = null; render(); window.scrollTo(0, 0); return; }
    const d = t.dataset, ei = +d.ei, si = +d.si;
    if (ui.menu && !['item-menu', 'type-menu', 'ex-menu', 'wk-menu', 'lib-dd', 'nutri-menu'].includes(d.action)) { ui.menu = null; render(); }
    switch (d.action) {
      case 'item-menu': ui.menu = ui.menu && ui.menu.mid === d.id ? null : { mid: d.id }; render(); ev.stopPropagation(); break;
      case 'ex-menu': ui.menu = ui.menu && ui.menu.exm === ei ? null : { exm: ei }; render(); ev.stopPropagation(); break;
      case 'wk-menu': ui.menu = ui.menu && ui.menu.wk ? null : { wk: true }; render(); ev.stopPropagation(); break;
      case 'ex-note': { ui.noteEi = ei; render(); const ni = document.querySelector('[data-field="note"][data-ei="' + ei + '"]'); if (ni) ni.focus(); break; }
      case 'start-empty': startWorkout([]); break;
      case 'start-routine': { 
        const r = S.routines.find(x => x.id === d.id); 
        if (!r) break;
        if (S.active && !confirm('יש אימון פעיל ברקע. להחליף אותו באימון חדש?')) break; 
        const normalized = normalizeRoutineExercises(r);
        startWorkout(normalized, r.id); 
        ui.tab = 'workout'; 
        render(); 
        break; 
      }
      case 'add-ex-open': ui.modal = { type: 'pickEx', q: '', mus: 'all' }; render(); break;
      case 'replace-ex-open': {
        const curEx = S.active && S.active.exercises[ei] ? exById(S.active.exercises[ei].exId) : null;
        ui.modal = { type: 'pickEx', q: '', mus: (curEx && curEx.muscle) ? curEx.muscle : 'all', replaceEi: ei }; 
        render(); 
        break;
      }
      case 'toggle-superset': {
        if (!S.active || !S.active.exercises[ei]) break;
        S.active.exercises[ei].superset = !S.active.exercises[ei].superset;
        save();
        render();
        toast(S.active.exercises[ei].superset ? 'סופר-סט חובר לתרגיל הבא' : 'חיבור סופר-סט בוטל');
        break;
      }
      case 'pick-muscle': ui.modal.mus = d.v; renderModal(); break;
      case 'pick-ex': {
        if (ui.modal.replaceEi !== undefined && S.active && S.active.exercises[ui.modal.replaceEi]) {
          const oldItem = S.active.exercises[ui.modal.replaceEi];
          const oldSetsCount = (oldItem.sets || []).length || 3;
          const mem = S.exerciseMemory && S.exerciseMemory[d.id];
          const newSets = [];
          for (let i = 0; i < oldSetsCount; i++) {
            if (mem && mem[i]) {
              newSets.push({ 
                type: mem[i].type || 'N', 
                kg: mem[i].kg !== undefined ? mem[i].kg : '', 
                reps: mem[i].reps !== undefined ? mem[i].reps : '', 
                done: false, 
                pr: false, 
                touched: false 
              });
            } else {
              newSets.push(newSet());
            }
          }
          S.active.exercises[ui.modal.replaceEi] = {
            exId: d.id,
            note: oldItem.note || '',
            superset: !!oldItem.superset,
            sets: newSets
          };
          const exNew = exById(d.id);
          toast(`התרגיל הוחלף ל-${exNew ? (exNew.name || exNew.en) : ''}`, true);
        } else {
          addExercise(d.id); 
        }
        ui.modal = null; save(); render(); break;
      }
      case 'remove-ex': if (confirm('להסיר את התרגיל מהאימון?')) { S.active.exercises.splice(ei, 1); save(); render(); } break;
      case 'add-set': { const sets = S.active.exercises[ei].sets; sets.push(newSet()); save(); render(); break; }
      case 'del-set': { const sets = S.active.exercises[ei].sets; sets.splice(si, 1); ui.menu = null; save(); render(); break; }
      case 'del-last-set': {
        if (!S.active) break;
        const ex = S.active.exercises[ei];
        if (ex && ex.sets.length > 1) {
          ex.sets.pop();
          save();
          render();
          toast('הסט האחרון הוסר');
        }
        break;
      }
      case 'type-menu': ui.menu = ui.menu && ui.menu.ei === ei && ui.menu.si === si ? null : { ei, si }; render(); ev.stopPropagation(); break;
      case 'set-type': S.active.exercises[ei].sets[si].type = d.t; ui.menu = null; save(); render(); break;
      case 'use-prev': { const ex = S.active.exercises[ei], p = prevSet(ex.exId, si); if (p) { ex.sets[si].kg = p.kg; ex.sets[si].reps = p.reps; ex.sets[si].touched = true; save(); render(); } break; }
      case 'toggle-done': toggleDone(ei, si); break;
      case 'finish': finishWorkout(); break;
      case 'edit-routine': openRoutineEditor(d.id); break;
      case 'routine-editor-add-open':
        ui.modal.subview = 'addEx';
        ui.modal.q = '';
        ui.modal.mus = 'all';
        renderModal();
        break;
      case 'routine-editor-add-back':
        ui.modal.subview = 'main';
        renderModal();
        break;
      case 'routine-editor-add-ex': {
        const exId = d.id;
        const targetSets = 3;
        const mem = S.exerciseMemory && S.exerciseMemory[exId];
        let sets = [];
        if (mem && mem.length) {
          sets = mem.slice(0, targetSets).map(s => ({ type: s.type || 'N', kg: s.kg !== undefined ? s.kg : '', reps: s.reps !== undefined ? s.reps : '' }));
          while (sets.length < targetSets) sets.push({ type: 'N', kg: '', reps: '' });
        } else {
          sets = [{ type: 'N', kg: '', reps: '' }, { type: 'N', kg: '', reps: '' }, { type: 'N', kg: '', reps: '' }];
        }
        ui.modal.exercises.push({ exId, targetSets, sets });
        const ex = exById(exId);
        toast(`נוסף לתבנית: ${ex ? (ex.name || ex.en) : ''}`, true);
        ui.modal.subview = 'main';
        renderModal();
        break;
      }
      case 'routine-set-inc': {
        const idx = +d.idx;
        if (ui.modal.exercises[idx] && ui.modal.exercises[idx].targetSets < 20) {
          ui.modal.exercises[idx].targetSets++;
          if (!ui.modal.exercises[idx].sets) ui.modal.exercises[idx].sets = [];
          ui.modal.exercises[idx].sets.push({ type: 'N', kg: '', reps: '' });
          renderModal();
        }
        break;
      }
      case 'routine-set-dec': {
        const idx = +d.idx;
        if (ui.modal.exercises[idx] && ui.modal.exercises[idx].targetSets > 1) {
          ui.modal.exercises[idx].targetSets--;
          if (ui.modal.exercises[idx].sets && ui.modal.exercises[idx].sets.length > ui.modal.exercises[idx].targetSets) {
            ui.modal.exercises[idx].sets.pop();
          }
          renderModal();
        }
        break;
      }
      case 'routine-ex-up': {
        const idx = +d.idx;
        if (idx > 0 && ui.modal.exercises[idx]) {
          const item = ui.modal.exercises.splice(idx, 1)[0];
          ui.modal.exercises.splice(idx - 1, 0, item);
          renderModal();
        }
        break;
      }
      case 'routine-ex-down': {
        const idx = +d.idx;
        if (idx < ui.modal.exercises.length - 1 && ui.modal.exercises[idx]) {
          const item = ui.modal.exercises.splice(idx, 1)[0];
          ui.modal.exercises.splice(idx + 1, 0, item);
          renderModal();
        }
        break;
      }
      case 'routine-ex-del': {
        const idx = +d.idx;
        if (ui.modal.exercises[idx]) {
          ui.modal.exercises.splice(idx, 1);
          renderModal();
        }
        break;
      }
      case 'routine-editor-save': {
        const m = ui.modal;
        const r = S.routines.find(x => x.id === m.routineId);
        if (r) {
          r.name = (m.name || '').trim() || r.name;
          r.exIds = m.exercises.map(e => e.exId);
          r.exercises = m.exercises.map(e => {
            const tSets = e.targetSets || 3;
            let sets = (e.sets || []).slice(0, tSets);
            while (sets.length < tSets) sets.push({ type: 'N', kg: '', reps: '' });
            return { exId: e.exId, targetSets: tSets, sets };
          });
          save();
          ui.modal = null;
          render();
          toast('התבנית עודכנה', true);
        }
        break;
      }
      case 'redit-muscle':
        ui.modal.mus = d.v;
        renderModal();
        break;
      case 'sync-routine-full': {
        const m = ui.modal;
        const r = S.routines.find(x => x.id === m.routineId);
        if (r && m.activeSnapshot) {
          r.exIds = m.activeSnapshot.exercises.map(e => e.exId);
          r.exercises = m.activeSnapshot.exercises.map(e => ({
            exId: e.exId,
            targetSets: e.targetSets,
            sets: e.sets
          }));
          save();
          toast(`התבנית "${r.name}" עודכנה`, true);
        }
        ui.modal = { type: 'summary', w: m.workout };
        render();
        break;
      }
      case 'sync-routine-weights': {
        const m = ui.modal;
        const r = S.routines.find(x => x.id === m.routineId);
        if (r && m.activeSnapshot) {
          const origNorm = normalizeRoutineExercises(r);
          r.exercises = origNorm.map(re => {
            const match = m.activeSnapshot.exercises.find(ae => ae.exId === re.exId);
            if (match) {
              return {
                exId: re.exId,
                targetSets: re.targetSets,
                sets: match.sets.slice(0, re.targetSets)
              };
            }
            return re;
          });
          save();
          toast(`משקלי העבודה עודכנו בתבנית "${r.name}"`, true);
        }
        ui.modal = { type: 'summary', w: m.workout };
        render();
        break;
      }
      case 'sync-routine-none': {
        const m = ui.modal;
        toast('האימון נשמר בהיסטוריה', true);
        ui.modal = { type: 'summary', w: m.workout };
        render();
        break;
      }
      case 'cancel-workout': if (confirm('לסיים אימון בלי לשמור נתונים?')) { S.active = null; stopRest(); save(); render(); if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } } break;
      case 'save-routine': ui.modal = { type: 'routine', name: '' }; renderModal(); break;
      case 'routine-confirm': { 
        const n = (ui.modal.name || '').trim() || 'תבנית חדשה'; 
        S.routines.push({ 
          id: uid(), 
          name: n, 
          exIds: S.active.exercises.map(e => e.exId), 
          exercises: S.active.exercises.map(e => ({ exId: e.exId, targetSets: e.sets.length, sets: e.sets.map(s => ({ type: s.type, kg: s.kg, reps: s.reps })) })) 
        }); 
        ui.modal = null; save(); render(); toast('התבנית נשמרה בהצלחה', true); break; 
      }
      case 'new-routine': ui.modal = { type: 'newRoutine', name: '', ids: [], q: '' }; renderModal(); break;
      case 'routine-toggle': {
        const ids = ui.modal.ids, i = ids.indexOf(d.id); if (i >= 0) ids.splice(i, 1); else ids.push(d.id);
        const rl = $('#rpick-list'); if (rl) rl.innerHTML = routinePickHTML(); 
        const rc = $('#rcount'); if (rc) rc.textContent = ids.length; 
        icons(); break;
      }
      case 'routine-create': {
        const m = ui.modal; if (!m.ids.length) { toast('בחר לפחות תרגיל אחד'); break; }
        S.routines.push({ 
          id: uid(), 
          name: (m.name || '').trim() || 'תבנית חדשה', 
          exIds: m.ids.slice(), 
          exercises: m.ids.map(id => { 
            const mem = S.exerciseMemory[id]; 
            let sets = []; 
            if (mem && mem.length) sets = mem.map(x => ({ type: x.type || 'N', kg: x.kg || '', reps: x.reps || '' })); 
            else sets = [{ type: 'N', kg: '', reps: '' }, { type: 'N', kg: '', reps: '' }, { type: 'N', kg: '', reps: '' }]; 
            return { exId: id, targetSets: sets.length, sets }; 
          }) 
        });
        ui.modal = null; save(); render(); toast('התבנית נוצרה בהצלחה', true); break;
      }
      case 'del-routine': if (confirm('למחוק תבנית זו?')) { S.routines = S.routines.filter(r => r.id !== d.id); save(); render(); toast('התבנית נמחקה'); } break;
      case 'del-workout': if (confirm('למחוק את האימון מההיסטוריה?')) { S.history = S.history.filter(w => w.id !== d.id); save(); render(); toast('האימון נמחק'); } break;
      case 'rest-add': if (ui.rest) { ui.rest.end += 15000; ui.rest.total += 15; renderRest(); } break;
      case 'rest-sub': if (ui.rest) { ui.rest.end -= 15000; ui.rest.total = Math.max(1, ui.rest.total - 15); renderRest(); } break;
      case 'rest-skip': stopRest(); break;
      case 'lib-dd': ui.menu = ui.menu && ui.menu.dd === d.v ? null : { dd: d.v }; render(); ev.stopPropagation(); break;
      case 'lib-sort': ui.libSort = d.v === 'muscle' ? 'muscle' : 'az'; render(); break;
      case 'lib-view': ui.libView = d.v === 'tpl' ? 'tpl' : 'ex'; render(); break;
      case 'lib-clear-q': ui.libQ = ''; render(); break;
      case 'lib-jump': {
        const el = document.getElementById(d.v);
        if (el) el.scrollIntoView({ block: 'start', behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        document.querySelectorAll('.q-section-index [aria-current]').forEach(b => b.removeAttribute('aria-current'));
        t.setAttribute('aria-current', 'true');
        break;
      }
      case 'ex-info': if (exById(d.id)) { ui.modal = { type: 'exInfo', id: d.id, tab: 'about' }; renderModal(); } break;
      case 'ex-tab': if (ui.modal && ui.modal.type === 'exInfo') { ui.modal.tab = d.v; renderModal(); } break;
      case 'lib-muscle': ui.libMuscle = d.v; render(); break;
      case 'lib-eq': ui.libEq = d.v; render(); break;
      case 'lib-add': addExercise(d.id); toast('התרגיל נוסף לאימון הפעיל', true); renderHeader(); break;
      
      case 'nutri-menu': ui.menu = ui.menu && ui.menu.nm ? null : { nm: 'type' }; render(); ev.stopPropagation(); break;
      case 'set-nutri-date': ui.nutriDate = d.d; render(); break;
      case 'toggle-day-type': {
        const cur = getDayType(ui.nutriDate);
        const next = cur === 'workout' ? 'rest' : cur === 'rest' ? 'custom' : 'workout';
        S.customDays[ui.nutriDate] = next;
        save(); render(); toast('סוג היום עודכן', true); break;
      }
      case 'open-plate-calc': ui.modal = { type: 'plateCalc', weight: '60', bar: '20' }; renderModal(); break; 
      case 'share-workout': if (ui.modal && ui.modal.w) shareWorkoutImage(ui.modal.w); break; 
      case 'open-calc': { 
        const kg = S.active && S.active.exercises[+d.ei] && S.active.exercises[+d.ei].sets[+d.si] ? S.active.exercises[+d.ei].sets[+d.si].kg : '';
        ui.modal = { type: 'plateCalc', weight: kg || '60', bar: '20' }; renderModal(); break; 
      }
      
      case 'food-open': ui.modal = { type: 'food', view: 'list', q: '', cat: 'all', meal: currentMeal() }; renderModal(); break;
      case 'food-open-meal': ui.modal = { type: 'food', view: 'list', q: '', cat: 'all', meal: d.meal || currentMeal() }; renderModal(); break;
      case 'food-yesterday': ui.modal = { type: 'food', view: 'list', q: '', cat: 'all', meal: d.meal || currentMeal(), tab: 'yesterday' }; renderModal(); break;
      case 'food-cat': ui.modal.cat = d.v; renderModal(); break;
      case 'food-meal': ui.modal.meal = d.v; renderModal(); break;
      case 'food-pick': { 
        const f = foodById(d.id); 
        ui.modal.view = 'detail'; 
        ui.modal.foodId = f.id; 
        const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
        if (f.cat === 'meat' || f.cat === 'carbs' || f.cat === 'canned') {
          ui.modal.mode = '100g';
          ui.modal.amount = 1;
        } else if (naturalUnits.length > 0) {
          ui.modal.mode = 'unit';
          ui.modal.unitIdx = 0;
          ui.modal.amount = 1;
        } else {
          ui.modal.mode = '100g';
          ui.modal.amount = 1;
        }
        renderModal(); break; 
      }
      case 'set-food-mode': {
        ui.modal.mode = d.v;
        if (d.v === 'grams') ui.modal.amount = 100;
        else ui.modal.amount = 1;
        renderModal(); break;
      }
      case 'set-amount': {
        ui.modal.amount = num(d.v);
        const fa = $('#food-amount'); if (fa) fa.value = ui.modal.amount;
        const fp = $('#food-preview'); if (fp) fp.innerHTML = foodPreview();
        syncFoodCta();
        break;
      }
      case 'food-back': ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); break;
      case 'food-fav': { const i = S.favorites.indexOf(d.id); if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(d.id); save(); renderModal(); break; }
      case 'food-quick': {
        const f = foodById(d.id);
        const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
        let mode = 'unit';
        if (f.cat === 'meat' || f.cat === 'carbs' || f.cat === 'canned' || naturalUnits.length === 0) {
          mode = '100g';
        }
        
        let grams = 100;
        let label = '100 גרם';
        if (mode === '100g') {
           grams = 100;
           label = '100 גרם (1 × 100 גרם)';
        } else {
           const u = naturalUnits[0];
           if (u) { grams = u.g; label = `1 ${u.name} (${Math.round(grams)} ג')`; }
        }
        logFood(f, grams, label, ui.modal ? ui.modal.meal : currentMeal(), 1); 
        toast(`נוסף: ${f.he}`, true); 
        render(); 
        break;
      }
      case 'food-confirm': {
        const m = ui.modal, f = foodById(m.foodId), amt = num(m.amount); if (!(amt > 0)) { toast('הזן כמות תקינה'); break; }
        const grams = getFoodGrams(m, f);
        let label = '';
        if (m.mode === '100g') label = `${Math.round(grams)} גרם (${amt} × 100 גרם)`;
        else if (m.mode === 'grams') label = `${Math.round(grams)} ג'`;
        else if (m.mode === 'unit') {
          const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
          const u = naturalUnits[+m.unitIdx];
          label = u ? `${amt} ${u.name} (${Math.round(grams)} ג')` : `${Math.round(grams)} ג'`;
        }
        logFood(f, grams, label, m.meal, amt);
        ui.modal = null; render(); toast('נוסף לתפריט', true); break;
      }
      case 'food-custom': ui.modal.view = 'custom'; ui.modal.cf = { name: '', cat: 'protein', kcal: '', p: '', c: '', f: '', unitName: '', unitG: '' }; renderModal(); break;
      case 'custom-save': {
        const c = ui.modal.cf; if (!c.name.trim() || !(num(c.kcal) >= 0) || c.kcal === '') { toast('הזן שם וקלוריות ל-100 גרם'); break; }
        const f = { id: 'c_' + uid(), he: c.name.trim(), cat: c.cat, kcal: num(c.kcal), p: num(c.p), c: num(c.c), f: num(c.f), custom: true, units: [] };
        if (c.unitName.trim() && num(c.unitG) > 0) f.units.push({ name: c.unitName.trim(), g: num(c.unitG) });
        f.units.push({ name: '100 גרם', g: 100 });
        S.customFoods.push(f); S.favorites.push(f.id); save(); toast('המאכל נשמר', true);
        ui.modal.view = 'detail'; ui.modal.foodId = f.id; 
        const idx100 = f.units.findIndex(u => u.name === '100 גרם');
        ui.modal.amount = 1; ui.modal.unit = String(idx100 >= 0 ? idx100 : 0); renderModal(); break;
      }
      case 'custom-del': if (confirm('למחוק את המאכל המותאם?')) { S.customFoods = S.customFoods.filter(f => f.id !== d.id); S.favorites = S.favorites.filter(x => x !== d.id); save(); ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); toast('המאכל נמחק'); } break;
      case 'food-del': { const it = dayLog(ui.nutriDate)[+d.i]; if (it) { dayLog(ui.nutriDate).splice(+d.i, 1); save(); render(); toast('נמחק: ' + it.name); } break; }
      case 'edit-goals': {
        const t = getDayType(ui.nutriDate);
        if (t === 'custom') {
          const g = S.customDayGoals[ui.nutriDate] || Object.assign({}, S.goals.workout);
          const v = prompt('יעד קלוריות (מותאם אישית):', g.kcal); if (v === null) break; g.kcal = num(v) || g.kcal;
          const p = prompt('יעד חלבון (ג\'):', g.protein); if (p !== null) g.protein = num(p) || g.protein;
          const c = prompt('יעד פחמימות (ג\'):', g.carbs); if (c !== null) g.carbs = num(c) || g.carbs;
          const f = prompt('יעד שומן (ג\'):', g.fat); if (f !== null) g.fat = num(f) || g.fat;
          S.customDayGoals[ui.nutriDate] = g;
        } else {
          const g = S.goals[t] || S.goals.workout;
          const v = prompt(`יעד קלוריות יומי (${t === 'workout' ? 'יום אימון' : 'יום מנוחה'}):`, g.kcal); if (v === null) break; g.kcal = num(v) || g.kcal;
          const p = prompt('יעד חלבון (ג\'):', g.protein); if (p !== null) g.protein = num(p) || g.protein;
          const c = prompt('יעד פחמימות (ג\'):', g.carbs); if (c !== null) g.carbs = num(c) || g.carbs;
          const f = prompt('יעד שומן (ג\'):', g.fat); if (f !== null) g.fat = num(f) || g.fat;
        }
        save(); render(); break;
      }
      case 'weight-add': { 
        const wi = $('#weight-input');
        const v = num(wi ? wi.value : 0); 
        if (v < 20 || v > 400) { toast('הזן משקל תקין (20-400 ק"ג)'); break; } 
        addWeight(v); render(); toast('המשקל נשמר', true); break; 
      }
      case 'weight-del': S.weights = S.weights.filter(w => w.date !== d.d); save(); render(); break;
      case 'copy-yesterday': {
        const mealKey = d.meal;
        const prevDate = getPrevDay(ui.nutriDate || todayKey());
        const prevList = dayLog(prevDate).filter(it => (it.meal || 'snack') === mealKey);
        if (!prevList.length) {
          toast('לא נמצאו מאכלים בארוחה זו מאתמול');
          break;
        }
        const curDate = ui.nutriDate || todayKey();
        S.nutrition[curDate] = S.nutrition[curDate] || [];
        prevList.forEach(item => {
          S.nutrition[curDate].push(Object.assign({}, item));
        });
        save();
        ui.modal = null;
        render();
        toast(`הועתקו ${prevList.length} מאכלים מאתמול`, true);
        break;
      }
      case 'saved-meals': {
        ui.modal = { type: 'savedMeals', meal: d.meal };
        renderModal();
        break;
      }
      case 'save-meal-preset': {
        const mealKey = ui.modal.meal;
        const curDate = ui.nutriDate || todayKey();
        const currentItems = dayLog(curDate).filter(it => (it.meal || 'snack') === mealKey);
        if (!currentItems.length) {
          toast('אין מאכלים בארוחה זו כעת לשמירה');
          break;
        }
        const mealObj = MEALS.find(x => x.k === mealKey) || { he: 'ארוחה' };
        const defaultName = mealObj.he + ' קבועה';
        const name = prompt('שם לארוחה השמורה:', defaultName);
        if (name === null) break;
        const finalName = name.trim() || defaultName;
        S.savedMeals = S.savedMeals || [];
        S.savedMeals.push({
          id: uid(),
          name: finalName,
          meal: mealKey,
          items: JSON.parse(JSON.stringify(currentItems))
        });
        save();
        renderModal();
        toast(`הארוחה "${finalName}" נשמרה בהצלחה`, true);
        break;
      }
      case 'apply-saved-meal': {
        const preset = (S.savedMeals || []).find(x => x.id === d.id);
        if (!preset || !preset.items || !preset.items.length) {
          toast('הארוחה השמורה ריקה');
          break;
        }
        const curDate = ui.nutriDate || todayKey();
        S.nutrition[curDate] = S.nutrition[curDate] || [];
        preset.items.forEach(it => {
          const copy = Object.assign({}, it, { meal: ui.modal.meal || preset.meal });
          S.nutrition[curDate].push(copy);
        });
        save();
        closeModal();
        toast(`ארוחת "${preset.name}" נוספה לתפריט`, true);
        break;
      }
      case 'delete-saved-meal': {
        if (confirm('למחוק ארוחה שמורה זו?')) {
          S.savedMeals = (S.savedMeals || []).filter(x => x.id !== d.id);
          save();
          renderModal();
          toast('הארוחה נמחקה');
        }
        break;
      }
      case 'export-backup': {
        try {
          const jsonStr = JSON.stringify(S, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'built-different-backup-' + todayKey() + '.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast('קובץ הגיבוי הורד', true);
        } catch (err) {
          toast('שגיאה בייצוא הגיבוי');
        }
        break;
      }
      case 'import-backup-click': {
        const fi = $('#backup-file-input');
        if (fi) fi.click();
        break;
      }
      case 'auto-macro-open': {
        const curW = S.weights.length ? S.weights[S.weights.length - 1].kg : 75;
        ui.modal = { type: 'autoMacro', weight: curW, goal: 'cut' };
        renderModal();
        break;
      }
      case 'set-macro-goal': {
        ui.modal.goal = d.g;
        document.querySelectorAll('.q-segmented__item[data-g]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.g === d.g);
          btn.setAttribute('aria-selected', String(btn.dataset.g === d.g));
        });
        updateMacroCalcDisplay();
        break;
      }
      case 'apply-smart-macros': {
        const wKcal = num($('#macro-w-kcal') ? $('#macro-w-kcal').value : 0);
        const wP = num($('#macro-w-p') ? $('#macro-w-p').value : 0);
        const wC = num($('#macro-w-c') ? $('#macro-w-c').value : 0);
        const wF = num($('#macro-w-f') ? $('#macro-w-f').value : 0);

        const rKcal = num($('#macro-r-kcal') ? $('#macro-r-kcal').value : 0);
        const rP = num($('#macro-r-p') ? $('#macro-r-p').value : 0);
        const rC = num($('#macro-r-c') ? $('#macro-r-c').value : 0);
        const rF = num($('#macro-r-f') ? $('#macro-r-f').value : 0);

        if (wKcal <= 0 || rKcal <= 0) {
          toast('הזן ערכי קלוריות תקינים');
          break;
        }

        S.goals.workout = { kcal: wKcal, protein: wP, carbs: wC, fat: wF };
        S.goals.rest = { kcal: rKcal, protein: rP, carbs: rC, fat: rF };
        save();
        closeModal();
        toast('יעדי התזונה נשמרו בהצלחה', true);
        render();
        break;
      }
      case 'close-modal': closeModal(); break;
      case 'close-modal-bg': if (ev.target === t) closeModal(); break;
    }
  });

  let _inTimer;
  document.addEventListener('input', ev => {
    const t = ev.target, d = t.dataset;
    if (d.field === 'note' && S.active) {
      S.active.exercises[+d.ei].note = t.value; save();
    } else if (d.field && S.active) {
      const s = S.active.exercises[+d.ei].sets[+d.si]; 
      s[d.field] = t.value; 
      s.touched = true;
      save();
      const v = $('#vol-total'); if (v) v.textContent = fmtN(activeVolume()); renderHeader();
      clearTimeout(_inTimer);
      _inTimer = setTimeout(() => {
        const s2 = S.active.exercises[+d.ei].sets[+d.si];
        if (!s2.done && num(s2.reps) > 0) { toggleDone(+d.ei, +d.si); }
        else if (s2.done) {
          const b = bestFor(S.active.exercises[+d.ei].exId, s2);
          s2.pr = s2.type !== 'W' && b.any && num(s2.kg) > 0 && (num(s2.kg) > b.kg || e1rm(num(s2.kg), num(s2.reps)) > b.rm + 0.01);
          save(); render();
        }
      }, 600);
    } else if (d.search === 'lib') { 
      ui.libQ = t.value; 
      const ll = $('#lib-list'); if (ll) { ll.innerHTML = exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון'); icons(); } 
    } else if (d.search === 'pick') { 
      ui.modal.q = t.value; 
      const pl = $('#pick-list'); if (pl) { pl.innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'pick-ex', 'הוסף'); icons(); } 
    } else if (d.search === 'rpick') { 
      ui.modal.q = t.value; 
      const rpl = $('#rpick-list'); if (rpl) { rpl.innerHTML = routinePickHTML(); icons(); } 
    } else if (d.search === 'redit-pick') { 
      ui.modal.q = t.value; 
      const rpl = $('#redit-pick-list'); if (rpl) { rpl.innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'routine-editor-add-ex', '+ הוסף לתבנית'); icons(); } 
    } else if (d.search === 'food') { 
      ui.modal.q = t.value; 
      const fl = $('#food-list'); if (fl) { fl.innerHTML = foodListHTML(); icons(); } 
    } else if (t.id === 'food-amount') { 
      ui.modal.amount = t.value; 
      const fp = $('#food-preview'); if (fp) fp.innerHTML = foodPreview(); syncFoodCta();
    } else if (t.id === 'auto-macro-weight') {
      updateMacroCalcDisplay();
    } else if (d.cf) { 
      ui.modal.cf[d.cf] = t.value; 
      if (ui.modal.type === 'plateCalc') renderModal(); 
    } else if (t.id === 'routine-name') { 
      ui.modal.name = t.value; 
    } else if (t.id === 'routine-edit-name') { 
      ui.modal.name = t.value; 
    }
  });

  document.addEventListener('change', ev => {
    if (ev.target.id === 'backup-file-input') {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && typeof parsed === 'object') {
            S = Object.assign(defaults(), parsed);
            save();
            render();
            toast('הנתונים שוחזרו מהגיבוי', true);
          } else {
            toast('קובץ הגיבוי אינו תקין');
          }
        } catch (err) {
          toast('שגיאה בקריאת קובץ הגיבוי');
        }
      };
      reader.readAsText(file, 'UTF-8');
      ev.target.value = '';
    } else if (ev.target.id === 'select-explorer-ex') {
      ui.explorerExId = ev.target.value;
      render();
    } else if (ev.target.id === 'food-unit-idx') { 
      ui.modal.unitIdx = ev.target.value; 
      const fp = $('#food-preview'); if (fp) fp.innerHTML = foodPreview(); syncFoodCta();
    } else if (ev.target.id === 'auto-macro-weight') {
      updateMacroCalcDisplay();
    } else if (ev.target.dataset.cf) {
      ui.modal.cf[ev.target.dataset.cf] = ev.target.value;
    }
  });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (ui.modal) closeModal(); else if (ui.menu) { ui.menu = null; render(); }
  });

  /* ---- Canvas Image Generator ---- */
  function shareWorkoutImage(w) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080 + w.exercises.length * 100;
    const ctx = canvas.getContext('2d');
    
    /* QUIET share card: colours and fonts are read from the design tokens (a canvas cannot use var()) */
    const css = getComputedStyle(document.documentElement);
    const tok = n => css.getPropertyValue(n).trim();
    const sans = tok('--font-sans') || 'sans-serif', mono = tok('--font-mono') || 'monospace';

    ctx.fillStyle = tok('--color-bg');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = tok('--color-text');
    ctx.font = '600 64px ' + mono;
    ctx.textAlign = 'center';
    ctx.fillText('BUILT DIFFERENT', canvas.width / 2, 140);

    ctx.fillStyle = tok('--color-text');
    ctx.font = '500 48px ' + sans;
    ctx.fillText('זמן אימון: ' + fmtClock(w.duration), canvas.width / 2, 250);
    ctx.fillText('נפח כולל: ' + fmtN(w.volume) + ' ק"ג', canvas.width / 2, 330);

    ctx.fillStyle = tok('--color-text-2');
    ctx.font = '400 38px ' + sans;
    ctx.textAlign = 'right';
    let y = 470;
    w.exercises.forEach(e => {
       const ex = exById(e.exId);
       const name = ex ? (ex.name || ex.en) : 'Exercise';
       const sets = e.sets.length + ' סטים';
       const best = e.sets.reduce((max, s) => Math.max(max, num(s.kg)), 0);
       const bestStr = best > 0 ? ' | מקסימום: ' + best + ' ק"ג' : '';
       ctx.fillText(name + ' - ' + sets + bestStr, canvas.width - 80, y);
       y += 95;
    });
    
    const link = document.createElement('a');
    link.download = 'built-different-' + w.date.slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /* ============================ BOOT ============================ */
  window.addEventListener('load', () => { render(); if (ui.rest) renderRest(true); });
  if (document.readyState === 'complete') render();
})();
