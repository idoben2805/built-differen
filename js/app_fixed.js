?/* BUILT DIFFERENT - core app (zero-build vanilla JS)
   Sections: State ?� Helpers ?� Workout engine ?� Nutrition ?� Weight/Progress ?� Views ?� Events */
(function () {
  'use strict';

  /* ============================ STATE ============================ */
  const KEY = 'built_different_state';
  const EX = window.BD_EXERCISES, FOODS = window.BD_FOODS;
  const MUSCLES = window.BD_MUSCLES, EQUIP = window.BD_EQUIPMENT;

  const defaults = () => ({
    active: null,            // {startedAt, routineId, exercises:[{exId, sets:[{type,kg,reps,done,pr,note}]}]}
    history: [],             // newest first: {id,date,duration,volume,prs,exercises:[{exId,sets}]}
    routines: [],            // {id,name,exIds:[]}
    nutrition: {},           // 'YYYY-MM-DD' -> [{foodId,name,grams,label,kcal,p,c,f}]
    weights: [],             // {date,kg} sorted ascending
    goals: { 
      workout: { kcal: 2600, protein: 180, carbs: 300, fat: 75 },
      rest: { kcal: 2200, protein: 160, carbs: 200, fat: 65 }
    },
    weeklySchedule: ['rest', 'workout', 'workout', 'workout', 'rest', 'workout', 'rest'], // Sun-Sat
    customDays: {},          // YYYY-MM-DD -> 'workout'|'rest'|'custom'
    customDayGoals: {},      // YYYY-MM-DD -> {kcal, protein, carbs, fat}
    restSeconds: 90,
    customFoods: [],         // user-created foods (same shape as seed foods + custom:true)
    favorites: [],           // starred food ids
    foodCounts: {},          // foodId -> times logged (drives "frequent foods")
    seeded: false
  });

  const PRESET_ROUTINES = [
    { name: 'Push ?� ?�?�?�???�', exIds: ['bench-press', 'incline-db-press', 'overhead-press', 'lateral-raise', 'tricep-pushdown', 'dips'] },
    { name: 'Pull ?� ???�?�?�?�', exIds: ['deadlift', 'pull-up', 'bent-over-row', 'lat-pulldown', 'face-pull', 'bicep-curl'] },
    { name: 'Legs ?� ?�?�???�?�?�', exIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'leg-extension', 'calf-raise'] },
    { name: 'Full Body ?� ?�?? ?�?�?�?�', exIds: ['squat', 'bench-press', 'bent-over-row', 'overhead-press', 'bicep-curl', 'plank'] }
  ];

  function load() {
    try {
      let s = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}'));
      if (!s.seeded) {
        if (!s.routines || !s.routines.length) s.routines = PRESET_ROUTINES.map(r => ({ id: 'preset-' + r.name.split(' ')[0].toLowerCase(), name: r.name, exIds: r.exIds.slice() }));
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
          if (!f.units.find(u => u.name === '100 ?�?�?�')) f.units.push({ name: '100 ?�?�?�', g: 100 });
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
          if (r.exIds && !r.exercises) {
            r.exercises = r.exIds.map(id => {
              const mem = s.exerciseMemory[id];
              let sets = [];
              if (mem && mem.length) sets = mem.map(x => ({ type: x.type || 'N', kg: x.kg || '', reps: x.reps || '' }));
              else sets = [{ type: 'N', kg: '', reps: '' }];
              return { exId: id, sets };
            });
          }
        });
      }

      return s;
    } catch (e) {
      console.error('State load error, resetting:', e);
      return defaults();
    }
  }
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const ui = { tab: 'workout', modal: null, menu: null, libQ: '', libMuscle: 'all', libEq: 'all', rest: null, nutriDate: null };

  /* ============================ HELPERS ============================ */
  const $ = (s, r = document) => r.querySelector(s);
  const exById = id => EX.find(e => e.id === id);
  const FOOD_CATS = window.BD_FOOD_CATS;
  const MEALS = [
    { k: 'breakfast', he: '?�?�?�?�?� ?�?�?�?�' }, { k: 'lunch', he: '?�?�?�?�?� ?�?�?�?�?�?�' },
    { k: 'dinner', he: '?�?�?�?�?� ?�?�?�' }, { k: 'snack', he: '?�?�?�?�?�?� / ?�?�?�?�' }
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
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (ok ? ' ok' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
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

  let wakeLock = null; function startWorkout(exData, routineId = null) { try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(w => wakeLock = w); } catch (e) {}
    S.active = { startedAt: Date.now(), routineId, exercises: (exData || []).map(item => {
       const id = typeof item === 'string' ? item : item.exId;
       let sets = [];
       if (typeof item === 'object' && item.sets && item.sets.length) {
         sets = item.sets.map(s => ({ type: s.type || 'N', kg: s.kg || '', reps: s.reps || '', done: false, pr: false, touched: false }));
       } else {
         const mem = S.exerciseMemory[id];
         if (mem && mem.length) {
           sets = mem.map(s => ({ type: s.type || 'N', kg: s.kg || '', reps: s.reps || '', done: false, pr: false, touched: false }));
         } else {
           sets = [newSet()];
         }
       }
       return { exId: id, sets };
    }) };
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

  /** Previous saved set for an exercise at the same set index. */
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
  const prevLabel = p => p ? `${fmtN(p.kg)}?�${p.reps}` : '?��';

  const e1rm = (kg, reps) => reps <= 1 ? kg : kg * (1 + reps / 30);

  /** Best historic numbers (working sets only) for PR detection. */
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
      if (s.kg === '' && p) s.kg = p.kg;           // fall back to previous values
      if (s.reps === '' && p) s.reps = p.reps;
      if (!(num(s.reps) > 0)) { toast('?�?�?? ?�?�?�?�?� ?????�?� ?�?�???�?? ?�?�?�'); return; }
      s.done = true;
      s.touched = true;
      const b = bestFor(ex.exId, s);
      s.pr = s.type !== 'W' && b.any && num(s.kg) > 0 && (num(s.kg) > b.kg || e1rm(num(s.kg), num(s.reps)) > b.rm + 0.01);
      if (s.pr) { toast('??�� ?�?�?� ?�?�?�?�! ' + exById(ex.exId).he, false); }
      startRest(S.restSeconds);
    } else { s.done = false; s.pr = false; }
    save(); render();
  }

  function finishWorkout(skipModal = false, updateRoutine = false) {
    const a = S.active;
    
    a.exercises.forEach(e => {
      e.sets.forEach((s, idx) => {
        if (!s.done && s.touched && (num(s.reps) > 0 || num(s.kg) > 0)) {
          s.done = true;
          const b = bestFor(e.exId, s);
          s.pr = s.type !== 'W' && b.any && num(s.kg) > 0 && (num(s.kg) > b.kg || e1rm(num(s.kg), num(s.reps)) > b.rm + 0.01);
        }
        
        if (!S.exerciseMemory[e.exId]) S.exerciseMemory[e.exId] = [];
        if (s.done || s.touched) {
          S.exerciseMemory[e.exId][idx] = { type: s.type, kg: s.kg, reps: s.reps };
        } else if (!S.exerciseMemory[e.exId][idx]) {
          S.exerciseMemory[e.exId][idx] = { type: s.type, kg: '', reps: '' };
        }
      });
      if (e.sets.length < S.exerciseMemory[e.exId].length) {
         S.exerciseMemory[e.exId].length = e.sets.length;
      }
    });

    const exercises = a.exercises.map(e => ({ exId: e.exId, sets: e.sets.filter(s => s.done).map(s => ({ type: s.type, kg: num(s.kg), reps: num(s.reps), pr: !!s.pr })) })).filter(e => e.sets.length);
    if (!exercises.length) {
      if (!confirm('?�?�?? ?�?�?�?� ?�?�?�?�?????�. ???�?�?? ?�?� ?�?�?�???�???')) return;
      S.active = null; stopRest(); save(); render(); if (wakeLock) { wakeLock.release(); wakeLock = null; } return;
    }
    
    if (a.routineId && !skipModal) {
      const r = S.routines.find(x => x.id === a.routineId);
      if (r) {
        const orig = r.exIds.join(',');
        const curr = a.exercises.map(e => e.exId).join(',');
        if (orig !== curr) {
          ui.modal = { type: 'finishConfirm', routineName: r.name };
          renderModal(); return;
        }
      }
    }
    
    if (a.routineId && updateRoutine) {
      const r = S.routines.find(x => x.id === a.routineId);
      if (r) r.exIds = a.exercises.map(e => e.exId);
    }

    const w = { id: uid(), name: '', date: new Date().toISOString(), duration: Math.floor((Date.now() - a.startedAt) / 1000), exercises };
    if (a.routineId) {
      const r = S.routines.find(x => x.id === a.routineId);
      if (r) w.name = r.name;
    }
    
    w.volume = workoutVolume(w);
    w.prs = exercises.reduce((n, e) => n + e.sets.filter(s => s.pr).length, 0);
    S.history.unshift(w); S.active = null; stopRest(); save();
    ui.modal = { type: 'summary', w }; render();
  }

  /* ---- Rest timer ---- */
  function startRest(sec) { ui.rest = { end: Date.now() + sec * 1000, total: sec, beeped: false }; renderRest(true); }
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
    const el = $('#rest-bar');
    if (!ui.rest) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    if (full || !el.innerHTML) {
      el.innerHTML = `<div class="flex items-center justify-between gap-2">
        <div><div class="text-[11px] muted font-bold">?�???? ???�?�?�?�</div><div id="rest-time" class="rest-time">0:00</div></div>
        <div class="flex gap-2">
          <button class="btn" data-action="rest-sub">-15</button>
          <button class="btn" data-action="rest-add">+15</button>
          <button class="btn btn-primary" data-action="rest-skip">?�???�</button>
        </div></div><div id="rest-prog" class="rest-progress"></div>`;
    }
    const left = (ui.rest.end - Date.now()) / 1000;
    if (left <= 0) {
      $('#rest-time').textContent = '0:00';
      $('#rest-prog').style.width = '0%';
      if (!ui.rest.beeped) {
        ui.rest.beeped = true;
        beepRest();
        el.classList.add('flash-green');
        setTimeout(() => el.classList.remove('flash-green'), 2000);
      }
    } else {
      $('#rest-time').textContent = fmtClock(Math.ceil(left));
      $('#rest-prog').style.width = Math.max(0, Math.min(100, left / ui.rest.total * 100)) + '%';
    }
  }
  setInterval(() => {
    if (ui.rest) renderRest();
    const t = $('#wk-timer');
    if (t && S.active) t.textContent = fmtClock((Date.now() - S.active.startedAt) / 1000);
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
    const g = typeof getGoals === 'function' ? getGoals(d) : { kcal: 2000 };
    $('#daily-badge').innerHTML = `<b>${Math.round(t.kcal)}</b> / ${g.kcal || 2000} ?�?�"??<br>?�???� ?�?�?�?�: ${Math.round(activeVolume() || todayVolume())} ?�"?�`;
  }
  function todayVolume() { const k = todayKey(); return S.history.filter(w => w.date.slice(0, 10) === k || new Date(w.date).toDateString() === new Date().toDateString()).reduce((a, w) => a + w.volume, 0); }

  function render() {
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === ui.tab));
    renderHeader();
    $('#screen').innerHTML = { workout: viewWorkout, library: viewLibrary, nutrition: viewNutrition, progress: viewProgress }[ui.tab]();
    renderModal(); renderRest(); icons();
  }

  /* ---- Active workout ---- */
  const TYPE_LABEL = { N: '?? ????', W: 'W ?????', D: 'D ????-??', F: 'F ???' };

  function viewWorkout() {
    if (!S.active) {
      return `<div class="card text-center py-6">
        <div class="text-5xl mb-2">??��?��</div>
        <div class="text-2xl font-black italic">???�?�?? ???�?�?�?????</div>
        <button class="btn btn-primary btn-block text-lg mt-3" data-action="start-empty">?�?�?�?? ?�?�???�?? ?�?�?�</button>
      </div>
      <div class="flex items-center justify-between mb-2"><div class="card-title text-lg">?�?�?�?�?�?�?� ?�???�</div>
        <button class="btn btn-ghost !py-1" data-action="new-routine">+ ?�?�?�?�?� ?�?�?�?�</button></div>
      ${S.routines.length ? S.routines.map(routineCard).join('') : '<div class="card muted text-sm">?�?�?? ?�?�?�?�?�?� ?�?�?�?�??.</div>'}
      <div class="card-title text-lg mt-4 mb-2">?�?�?�?�?�?�?�?�?� ?�?�???�?�?�?�</div>
      ${historyCards()}`;
    }
    const a = S.active;
    return `<div class="card flex items-center justify-between sticky top-[62px] z-20">
        <div><div class="text-[11px] muted font-bold">???�?? ?�?�???�??</div><div id="wk-timer" class="text-2xl font-black tabular-nums" dir="ltr">${fmtClock((Date.now() - a.startedAt) / 1000)}</div></div>
        <div class="text-center"><div class="text-[11px] muted font-bold">?�???� ?�?�????</div><div class="text-lg font-black text-emerald-400"><span id="vol-total">${fmtN(activeVolume())}</span> ?�"?�</div></div>
        <button class="btn btn-success" data-action="finish">?�?�?�?� ?�?�???�?� ?�?�???�??</button>
      </div>
      ${a.exercises.map(exCard).join('')}
      <button class="btn btn-primary btn-block mb-3" data-action="add-ex-open">+ ?�?�?�?� ?�?�?�?�??</button>
      <div class="flex gap-2">
        <button class="btn btn-ghost flex-1" data-action="save-routine">?�???�?� ?�?�?�?�?�?�</button>
        <button class="btn btn-danger flex-1" data-action="cancel-workout">?�?�?? ?�?�???�??</button>
      </div>`;
  }

  function exCard(e, ei) {
    const ex = exById(e.exId);
    let normalN = 0;
    const rows = e.sets.map((s, si) => {
      if (s.type === 'N') normalN++;
      const label = s.type === 'N' ? normalN : s.type;
      const p = prevSet(e.exId, si);
      const menu = ui.menu && ui.menu.ei === ei && ui.menu.si === si ? `<div class="type-menu">${Object.keys(TYPE_LABEL).map(t => `<button data-action="set-type" data-ei="${ei}" data-si="${si}" data-t="${t}">${TYPE_LABEL[t]}</button>`).join('')}<button data-action="del-set" data-ei="${ei}" data-si="${si}" style="color:#ef4444">???�?� ?�?�</button></div>` : '';
      return `<div class="set-row set-grid ${s.done ? 'done' : ''}">
        <div class="relative"><button class="type-btn type-${s.type}" data-action="type-menu" data-ei="${ei}" data-si="${si}">${label}</button>${menu}</div>
        <button class="prev-cell" data-action="use-prev" data-ei="${ei}" data-si="${si}">${prevLabel(p)}</button>
        <div style="position:relative"><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${p ? p.kg : '0'}" value="${s.kg}" data-field="kg" data-ei="${ei}" data-si="${si}" /><button class="calc-btn" data-action="open-calc" data-ei="${ei}" data-si="${si}">???</button></div>
        <input type="number" inputmode="numeric" min="0" placeholder="${p ? p.reps : '0'}" value="${s.reps}" data-field="reps" data-ei="${ei}" data-si="${si}" />
        <button class="check-btn" data-action="toggle-done" data-ei="${ei}" data-si="${si}"><i data-lucide="check"></i></button>
        ${s.pr ? `<span class="pr-badge" style="position:absolute;top:-6px;left:4px">??�� ?�?�?� ?�?�?�?�</span>` : ''}
      </div>`;
    }).join('');
    return `<div class="card">
      <div class="flex items-start justify-between mb-2">
        <div>
          <div class="card-title">${ex.he}</div>
          <div class="text-[11px] muted">${ex.en} ?� ${EQUIP[ex.equipment].he}</div>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-ghost !p-1 text-xs" data-action="replace-ex-open" data-ei="${ei}">?�?�???�</button>
          <button class="btn btn-ghost !p-1" data-action="remove-ex" data-ei="${ei}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>
      <div class="mb-2"><input class="input text-xs !py-1 !px-2" placeholder="?�?�?�?� ?�?�?�?�?� ???�?�?�?�??..." data-field="note" data-ei="${ei}" value="${e.note || ''}" /></div>
      <div class="set-grid set-head"><div>?�?�</div><div>?�?�???�?? ?�?�?�?�</div><div>?�"?�</div><div>?�?�?�?�?�</div><div>??�</div></div>
      ${rows}
      <button class="btn btn-block mt-2 !py-2" data-action="add-set" data-ei="${ei}">+ ?�?�?�?� ?�?�</button>
    </div>`;
  }

  function historyCards() {
    if (!S.history.length) return '<div class="card muted text-sm text-center">?�?�?�?�?? ?�?�?? ?�?�???�?�?�?� ?�???�?�?�?�. ?�?�?�?� ?�?�???�?? ?�?�?� ???�?�?�?� ?�?�?�?� ?�?�??.</div>';
    return S.history.slice(0, 20).map(w => `<div class="card">
      <div class="flex items-center justify-between">
        <div class="card-title">${w.name ? w.name : '?�?�???�?? ?�?�???�?�'} ?� ${new Date(w.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        <button class="btn btn-ghost !p-1" data-action="del-workout" data-id="${w.id}" aria-label="???�?� ?�?�???�??">??��</button>
      </div>
      <div class="flex gap-3 text-sm my-1"><span>?�� ${fmtClock(w.duration)}</span><span>??��?�� ${fmtN(w.volume)} ?�"?�</span>${w.prs ? `<span class="pr-badge" style="align-self:center">??�� ${w.prs} ?�?�?�?�?�</span>` : ''}</div>
      <div class="text-[11px] muted">${w.exercises.map(e => `${(exById(e.exId) || { he: '?' }).he} (${e.sets.length})`).join(' ?� ')}</div></div>`).join('');
  }

  /* ---- Library & routines ---- */
  function filteredExercises(q, mus, eq) {
    q = (q || '').trim().toLowerCase();
    return EX.filter(e => (mus === 'all' || e.muscle === mus) && (eq === 'all' || e.equipment === eq) && (!q || e.he.includes(q) || e.en.toLowerCase().includes(q)));
  }
  function chips(map, cur, action) {
    return `<div class="scroll-x"><button class="chip ${cur === 'all' ? 'active' : ''}" data-action="${action}" data-v="all">?�?�??</button>` +
      Object.keys(map).map(k => `<button class="chip ${cur === k ? 'active' : ''}" data-action="${action}" data-v="${k}">${map[k].he}</button>`).join('') + '</div>';
  }
  function exerciseListHTML(list, action, btnLabel) {
    if (!list.length) return '<div class="muted text-center py-6">???� ?�???�?�?� ?�?�?�?�???�?�</div>';
    return list.map(e => `<div class="list-item"><div><div class="font-bold">${e.he}</div>
      <div class="text-[11px] muted">${e.en} ?� ${MUSCLES[e.muscle].he} ?� ${EQUIP[e.equipment].he}</div></div>
      <button class="btn btn-ghost" data-action="${action}" data-id="${e.id}">${btnLabel}</button></div>`).join('');
  }

  function routineCard(r) {
    return `<div class="card"><div class="flex items-center justify-between">
        <div><div class="font-bold">${r.name}</div><div class="text-xs muted">${r.exIds.length} ?�?�?�?�???�?�</div></div>
        <div class="flex gap-1"><button class="btn btn-success" data-action="start-routine" data-id="${r.id}">?�?�?�?? ?�?�???�??</button>
        <button class="btn btn-danger" data-action="del-routine" data-id="${r.id}" aria-label="???�?� ?�?�?�?�?�">??��</button></div></div>
        <div class="text-[11px] muted mt-1">${r.exIds.map(i => (exById(i) || { he: '?' }).he).join(' ?� ')}</div></div>`;
  }

  function viewLibrary() {
    return `<div class="flex items-center justify-between mb-2"><div class="card-title text-lg">?�?�?�?�?�?� ?�?�???�??</div>
        <button class="btn btn-primary !py-1.5" data-action="new-routine">+ ?�?�?�?�?� ?�?�?�?�</button></div>
      ${S.routines.length ? S.routines.map(routineCard).join('')
        : '<div class="card muted text-sm">?�?�?? ?�?�?�?�?�?� ?�?�?�?�??. ???�?� ?�?? "?�?�?�?�?� ?�?�?�?�".</div>'}
      <div class="card-title mt-4 mb-2 text-lg">?�???�?�?�?� ?�?�?�?�???�?� (${EX.length})</div>
      <input class="input mb-2" placeholder="?�?�???�?� ?�?�?�?�??..." data-search="lib" value="${ui.libQ}" />
      ${chips(MUSCLES, ui.libMuscle, 'lib-muscle')}${chips(EQUIP, ui.libEq, 'lib-eq')}
      <div class="card" id="lib-list">${exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', '?�?�?�?� ???�?�???�??')}</div>`;
  }

  /* ---- Nutrition ---- */
  function macroBar(label, val, goal, color, unit) {
    const pct = Math.min(100, goal ? val / goal * 100 : 0);
    return `<div class="mb-2"><div class="flex justify-between text-xs mb-1"><span class="font-bold">${label}</span><span class="muted">${fmtN(val)} / ${goal} ${unit}</span></div>
      <div class="bar"><div style="width:${pct}%;background:${color}"></div></div></div>`;
  }
  const WEEK_HE = ['?�?�', '?�?�', '?�?�', '?�?�', '?�?�', '?�?�', '?�?�'];
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
    if (S.customDays[dateStr]) return S.customDays[dateStr];
    const d = new Date(dateStr);
    return S.weeklySchedule[d.getDay()] || 'rest';
  }
  function getGoals(dateStr) {
    const t = getDayType(dateStr);
    if (t === 'custom' && S.customDayGoals[dateStr]) return S.customDayGoals[dateStr];
    return S.goals[t] || S.goals.workout;
  }

  function viewNutrition() {
    if (!ui.nutriDate) ui.nutriDate = todayKey();
    const t = dayTotals(ui.nutriDate), g = getGoals(ui.nutriDate), log = dayLog(ui.nutriDate);
    const dates = getDatesOfWeek(new Date(ui.nutriDate));
    
    const weekSelector = `<div class="flex gap-1 justify-between mb-3" dir="rtl">
      ${dates.map((d, i) => {
        const active = d === ui.nutriDate ? 'bg-blue-600 text-white font-bold' : 'bg-[#161f33] text-gray-400';
        const isToday = d === todayKey();
        return `<button class="flex-1 py-1 rounded flex flex-col items-center ${active} ${isToday ? 'border border-blue-400' : ''}" data-action="set-nutri-date" data-d="${d}">
          <div class="text-[10px]">${WEEK_HE[i]}</div>
          <div class="text-xs">${new Date(d).getDate()}</div>
        </button>`;
      }).join('')}
    </div>`;

    const dayType = getDayType(ui.nutriDate);
    const typeLabel = dayType === 'workout' ? '?�?�?� ?�?�???�??' : dayType === 'rest' ? '?�?�?� ???�?�?�?�' : '???�?�?�?� ?�?�?�?�?�';

    return `${weekSelector}
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <div class="card-title">?�?�?�?�?� ?�?�???�</div>
        <div class="flex gap-2">
          <button class="btn btn-ghost !p-1 text-[11px] text-amber-400" data-action="toggle-day-type" data-d="${ui.nutriDate}">${typeLabel}</button>
          <button class="btn btn-ghost !p-1 text-[11px]" data-action="edit-goals">?�?�?�?? ?�?�?�?�?�</button>
        </div>
      </div>
      <div class="text-center mb-3"><span class="text-4xl font-black">${Math.round(t.kcal)}</span><span class="muted"> / ${g.kcal} ?�?�"??</span></div>
      ${macroBar('?�???�?�?�?�?�', t.kcal, g.kcal, '#3b82f6', '?�?�"??')}
      ${macroBar('?�???�?�??', t.p, g.protein, '#10b981', '?�?�')}
      ${macroBar('???�???�???�?�', t.c, g.carbs, '#f59e0b', '?�?�')}
      ${macroBar('?�?�????', t.f, g.fat, '#ef4444', '?�?�')}
    </div>
    <button class="btn btn-primary btn-block mb-3" data-action="food-open">+ ?�?�?�?� ???�?�?? (???�???�?? ?�???�?�?�?�?�)</button>
    ${MEALS.map(meal => {
      const items = log.map((it, idx) => Object.assign({ idx }, it)).filter(it => (it.meal || 'snack') === meal.k);
      const kc = items.reduce((a, i) => a + i.kcal, 0);
      return `<div class="card"><div class="flex items-center justify-between mb-1"><div class="card-title">${meal.he}</div><span class="text-xs muted">${Math.round(kc)} ?�?�"??</span></div>
        ${items.length ? items.map(i => `<div class="list-item"><div><div class="font-bold text-sm">${i.name}</div>
          <div class="text-[11px] muted">${i.label} ?� ?� ${fmtN(i.p)} ?� ?? ${fmtN(i.c)} ?� ?� ${fmtN(i.f)}</div></div>
          <div class="flex items-center gap-2"><b>${Math.round(i.kcal)}</b><button class="btn btn-danger !p-1.5" data-action="food-del" data-i="${i.idx}" aria-label="???�?�">??��</button></div></div>`).join('')
          : '<div class="muted text-xs py-2">?�� ?�?�?� ?��</div>'}</div>`;
    }).join('')}`;
  }

  /* ---- Weight & progress ---- */
  function nutritionChart(w = 320, h = 120) {
    const dates = getDatesOfWeek(new Date(ui.nutriDate || todayKey()));
    const items = dates.map(d => {
      const t = dayTotals(d), g = getGoals(d);
      return { p: t.p, pg: g.protein, c: t.kcal, cg: g.kcal };
    });
    const bw = (w - 10) / 7;
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">${items.map((it, i) => {
      const hp = Math.max(2, Math.min(100, it.p / (it.pg || 1) * 100));
      const hc = Math.max(2, Math.min(100, it.c / (it.cg || 1) * 100));
      return `<rect x="${5 + i * bw + 2}" y="${h - 24 - hp/100*(h-30)}" width="${(bw-4)/2 - 1}" height="${hp/100*(h-30)}" rx="2" fill="#10b981"/>
              <rect x="${5 + i * bw + 2 + (bw-4)/2}" y="${h - 24 - hc/100*(h-30)}" width="${(bw-4)/2 - 1}" height="${hc/100*(h-30)}" rx="2" fill="#3b82f6"/>
              <text x="${5 + i * bw + bw/2}" y="${h - 10}" fill="#8794ad" font-size="10" text-anchor="middle">${WEEK_HE[i]}</text>`;
    }).join('')}</svg>
    <div class="flex items-center justify-center gap-4 text-[10px] muted mt-1">
      <span class="flex items-center gap-1"><span class="w-2 h-2 bg-emerald-500"></span> ?�?�?� ?�???�?�??</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 bg-blue-500"></span> ?�?�?� ?�???�?�?�?�?�</span>
    </div>`;
  }

  function lineChartWeights(points, w = 320, h = 140) {
    if (points.length < 2) return '<div class="muted text-sm text-center py-8">?�?�?�?� ?????�?�?� 2 ?�?�?�???�?� ???�?�?�?� ?�?�?�</div>';
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
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">
      <path d="${pathMa}" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="4" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
      ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.kg)}" r="3.5" fill="#10b981"/>`).join('')}
      <text x="${px}" y="12" fill="#8794ad" font-size="10">${max.toFixed(1)}</text>
      <text x="${px}" y="${h - 3}" fill="#8794ad" font-size="10">${min.toFixed(1)}</text>
    </svg>
    <div class="flex items-center justify-center gap-4 text-[10px] muted mt-2">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> ???�?�?? ?�?�???�</span>
      <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-indigo-500"></span> ?????�?�?� ?�?� (7)</span>
    </div>`;
  }
  function barChart(items, w = 320, h = 120) {
    if (!items.length) return '<div class="muted text-sm text-center py-8">?�???�?� ?�?�???�?? ?�?�?� ???�?�?�?� ?�?�?�?�???�?�</div>';
    const max = Math.max(...items.map(i => i.v), 1), bw = (w - 10) / items.length;
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">${items.map((it, i) => {
      const bh = it.v / max * (h - 24);
      return `<rect x="${5 + i * bw + 2}" y="${h - 14 - bh}" width="${bw - 4}" height="${bh}" rx="3" fill="${it.pr ? '#f59e0b' : '#3b82f6'}"/>`;
    }).join('')}</svg>`;
  }
  function viewProgress() {
    const ws = S.weights, last = ws[ws.length - 1], first = ws[0];
    const delta = last && first && ws.length > 1 ? r1(last.kg - first.kg) : 0;
    const hist = S.history.slice(0, 12).reverse();
    const totalPR = S.history.reduce((a, w) => a + (w.prs || 0), 0);
    return `<div class="card">
      <div class="card-title mb-2">???�?�?? ?�?�?�</div>
      <div class="flex gap-2 mb-3"><input id="weight-input" type="number" step="0.1" inputmode="decimal" class="input" dir="ltr" placeholder='?�"?�' value="${last ? last.kg : ''}" />
      <button class="btn btn-primary" data-action="weight-add">?�???�?�</button></div>
      <div class="flex justify-between text-sm mb-2"><span>?�?�?�?�?�: <b>${last ? last.kg + ' ?�"?�' : '?��'}</b></span>
      <span class="${delta <= 0 ? 'text-emerald-400' : 'text-amber-400'}">?�?�?�?�?�: <b dir="ltr">${delta > 0 ? '+' : ''}${delta}</b></span></div>
      ${lineChartWeights(ws.slice(-30))}
    </div>
    <div class="card"><div class="card-title mb-1">?�?�???�?� ?�?�?�?�?�?� (?�?�?�?�?�)</div>${nutritionChart()}</div>
    <div class="card"><div class="card-title mb-1">?�???� ?�?�???�?�?�?� (12 ?�?�?�?�?�?�?�)</div>${barChart(hist.map(w => ({ v: w.volume, pr: w.prs > 0 })))}
      <div class="text-xs muted mt-1">?�???�?�?� ?�?�?�???� = ?�?�???�?? ?�?� ?�?�?� ?�?�?�?� ?� ?�?�"?� ?�?�???�?�?�?�: ${S.history.length} ?� ?�?�?�?�?�: ${totalPR}</div></div>
    ${S.history.length ? `<div class="card"><div class="card-title mb-1">?�?�?�?�?�?�?�?�?� ?�?�???�?�?�?�</div>${S.history.slice(0, 10).map(w => `
      <div class="list-item"><div><div class="font-bold text-sm">${w.name ? w.name + ' ?� ' : ''}${fmtDate(w.date)} ?� ${w.exercises.length} ?�?�?�?�???�?�</div>
      <div class="text-[11px] muted">${fmtClock(w.duration)}${w.prs ? ` ?� ??�� ${w.prs}` : ''}</div></div><b>${fmtN(w.volume)} ?�"?�</b></div>`).join('')}</div>` : ''}
    ${ws.length ? `<div class="card"><div class="card-title mb-1">?�?�?�???�?� ?�?�?�?�?�?�?�</div>${ws.slice(-6).reverse().map(w => `
      <div class="list-item"><span>${fmtDate(w.date)}</span><span class="flex items-center gap-2"><b>${w.kg} ?�"?�</b>
      <button class="btn btn-ghost !p-1" data-action="weight-del" data-d="${w.date}"><i data-lucide="x" class="w-4 h-4"></i></button></span></div>`).join('')}</div>` : ''}`;
  }

  /* ---- Modals ---- */
  function sheet(title, body) {
    return `<div class="modal-back" data-action="close-modal-bg"><div class="modal-sheet">
      <div class="flex items-center justify-between modal-header"><div class="text-xl font-black">${title}</div>
      <button class="btn btn-ghost !p-1" data-action="close-modal" aria-label="?�?�?�?�"><i data-lucide="x"></i></button></div>
      <div class="modal-body">${body}</div></div></div>`;
  }
  function closeModal() { ui.modal = null; render(); }

  function routinePickHTML() {
    const m = ui.modal, list = filteredExercises(m.q, 'all', 'all');
    return list.map(e => { const on = m.ids.includes(e.id); return `<div class="list-item"><div><div class="font-bold text-sm">${e.he}</div>
      <div class="text-[11px] muted">${MUSCLES[e.muscle].he} ?� ${EQUIP[e.equipment].he}</div></div>
      <button class="btn ${on ? 'btn-success' : ''}" data-action="routine-toggle" data-id="${e.id}">${on ? '??� ?�?�?�?�' : '?�?�?�'}</button></div>`; }).join('') || '<div class="muted text-center py-6">???� ?�???�?�</div>';
  }

  function foodRow(f) {
    const fav = S.favorites.includes(f.id);
    return `<div class="list-item"><button class="flex-1 text-right" style="background:none;border:0;color:inherit" data-action="food-pick" data-id="${f.id}">
        <div class="font-bold text-sm">${f.he}${f.custom ? ' <span class="pr-badge">?�?�?�?�</span>' : ''}</div>
        <div class="text-[11px] muted">??-100 ?�?�: ${f.kcal} ?�?�"?? ?� ?� ${f.p} ?� ?? ${f.c} ?� ?� ${f.f}</div></button>
      <button class="btn btn-ghost !p-1" data-action="food-fav" data-id="${f.id}" style="color:${fav ? '#f59e0b' : '#8794ad'}" aria-label="???�?�?�?�">${fav ? '?��' : '?��'}</button>
      <button class="btn btn-success !px-3" data-action="food-quick" data-id="${f.id}" aria-label="?�?�?�?� ???�?�">+</button></div>`;
  }
  function foodListHTML() {
    const m = ui.modal, q = (m.q || '').trim();
    const list = allFoods().filter(f => (m.cat === 'all' || f.cat === m.cat) && (!q || f.he.includes(q)));
    return list.length ? list.map(foodRow).join('') : '<div class="muted text-center py-6">???� ?�???�?�. ?�???�?� ???�?�?�?� ???�?�?? ???�?�?�?� ?�?�?�?�?� ?��</div>';
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
      const naturalUnits = f.units.filter(u => u.name !== '100 ?�?�?�');
      const u = naturalUnits[+m.unitIdx];
      return u ? amt * u.g : amt * 100;
    }
    return amt * 100;
  }

  function foodPreview() {
    const m = ui.modal, f = foodById(m.foodId);
    const grams = getFoodGrams(m, f);
    const c = calcFood(f, grams);
    return `<div class="text-xs muted mb-1">${Math.round(grams)} ?�?�</div>
      <div class="grid grid-cols-4 gap-1"><div><b class="text-lg text-blue-400">${Math.round(c.kcal)}</b><div class="text-[10px] muted">?�???�?�?�?�?�</div></div>
      <div><b class="text-lg text-emerald-400">${fmtN(c.p)}</b><div class="text-[10px] muted">?�???�?�??</div></div>
      <div><b class="text-lg text-amber-400">${fmtN(c.c)}</b><div class="text-[10px] muted">???�???�???�?�</div></div>
      <div><b class="text-lg text-red-400">${fmtN(c.f)}</b><div class="text-[10px] muted">?�?�????</div></div></div>`;
  }

  function foodModalHTML() {
    const m = ui.modal;
    const mealChips = `<div class="scroll-x">${MEALS.map(x => `<button class="chip ${m.meal === x.k ? 'active' : ''}" data-action="food-meal" data-v="${x.k}">${x.he}</button>`).join('')}</div>`;
    if (m.view === 'custom') {
      const c = m.cf, fld = (k, label, ph, type) => `<label class="block text-xs muted mb-2">${label}<input class="input mt-1" data-cf="${k}" type="${type || 'number'}" step="0.1" min="0" placeholder="${ph || ''}" value="${c[k]}" /></label>`;
      return sheet('???�?�?? ???�?�?�?� ?�?�?�?�?�', `${fld('name', '?�?� ?�???�?�??', '?????�??: ?�?�?�?� ?�?�?�?�', 'text')}
        <label class="block text-xs muted mb-2">?�?�?�?�?�?�?�<select class="input mt-1" data-cf="cat">${Object.keys(FOOD_CATS).map(k => `<option value="${k}" ${c.cat === k ? 'selected' : ''}>${FOOD_CATS[k]}</option>`).join('')}</select></label>
        <div class="text-xs font-bold mb-1">?�?�?�?�?� ??-100 ?�?�?�</div>
        <div class="grid grid-cols-2 gap-x-2">${fld('kcal', '?�???�?�?�?�?�')}${fld('p', '?�???�?�?? (?�?�)')}${fld('c', '???�???�???�?� (?�?�)')}${fld('f', '?�?�???? (?�?�)')}</div>
        <div class="text-xs font-bold mb-1">?�?�?�?�?� ???�?�?� (?�?�???�?�?�?�???�)</div>
        <div class="grid grid-cols-2 gap-x-2">${fld('unitName', '?�?� ?�?�?�?�?�?�', '?�?�?�?�?� / ?�?� / ?�?�?�?�', 'text')}${fld('unitG', '???�?�?? ?�?�?�?�?�?� ?�?�?�?�', '')}</div>
        <div class="flex gap-2 mt-2"><button class="btn flex-1" data-action="food-back">?�?�?�?�</button><button class="btn btn-success flex-1" data-action="custom-save">?�???�?� ???�?�??</button></div>`);
    }
    if (m.view === 'detail') {
      const f = foodById(m.foodId);
      const naturalUnits = f.units.filter(u => u.name !== '100 ?�?�?�');
      
      const modeTabs = `<div class="flex gap-1 mb-3">
        <button class="btn ${m.mode === '100g' ? 'btn-primary' : 'bg-[#161f33] text-gray-400'} flex-1 !p-1 text-[11px]" data-action="set-food-mode" data-v="100g">?????� 100 ?�?�?�</button>
        <button class="btn ${m.mode === 'grams' ? 'btn-primary' : 'bg-[#161f33] text-gray-400'} flex-1 !p-1 text-[11px]" data-action="set-food-mode" data-v="grams">???�?�?? (?�?�???�?�)</button>
        ${naturalUnits.length ? `<button class="btn ${m.mode === 'unit' ? 'btn-primary' : 'bg-[#161f33] text-gray-400'} flex-1 !p-1 text-[11px]" data-action="set-food-mode" data-v="unit">?????� ?�?�?�?�?�</button>` : ''}
      </div>`;

      let inputSection = '';
      if (m.mode === '100g') {
        inputSection = `<div class="mb-3">
          <input id="food-amount" class="input mb-2 text-center text-lg" type="number" step="0.5" min="0" dir="ltr" value="${m.amount}" placeholder="?�???�?� (?????�?? 1.5)" />
          <div class="flex flex-wrap gap-2">
            ${[0.5, 1, 1.5, 2, 2.5, 3].map(v => `<button class="btn btn-ghost !p-1 text-xs flex-1 border border-gray-700" data-action="set-amount" data-v="${v}">${v * 100} ?�?�</button>`).join('')}
          </div>
        </div>`;
      } else if (m.mode === 'grams') {
        inputSection = `<div class="mb-3">
          <input id="food-amount" class="input text-center text-lg" type="number" step="1" min="0" dir="ltr" value="${m.amount}" placeholder="?�?�?? ???�?�?? ?�?�?�???�?�" />
        </div>`;
      } else if (m.mode === 'unit') {
        inputSection = `<div class="flex gap-2 mb-3">
          <input id="food-amount" class="input flex-1 text-center text-lg" type="number" step="0.5" min="0" dir="ltr" value="${m.amount}" />
          <select id="food-unit-idx" class="input flex-2">
            ${naturalUnits.map((u, i) => `<option value="${i}" ${String(m.unitIdx) === String(i) ? 'selected' : ''}>${u.name} (${u.g} ?�?�)</option>`).join('')}
          </select>
        </div>`;
      }

      return sheet(f.he, `${mealChips}<div class="text-xs muted my-2">??-100 ?�?�: ${f.kcal} ?�?�"?? ?� ?� ${f.p} ?� ?? ${f.c} ?� ?� ${f.f}</div>
        ${modeTabs}
        ${inputSection}
        <div id="food-preview" class="card text-center">${foodPreview()}</div>
        <div class="flex gap-2"><button class="btn flex-1" data-action="food-back">?�?�?�?�</button><button class="btn btn-success flex-1" data-action="food-confirm">?�?�?�?� ??${MEALS.find(x => x.k === m.meal).he}</button></div>
        ${f.custom ? `<button class="btn btn-danger btn-block mt-2" data-action="custom-del" data-id="${f.id}">???�?� ???�?�?? ???�?�?�?�</button>` : ''}`);
    }
    const fr = frequentFoods();
    return sheet('???�???�?? ?�???�?�?�?�?�', `${mealChips}
      <input class="input my-2" placeholder="?�?�???�?� ???�?�??..." data-search="food" value="${m.q || ''}" />
      <div class="scroll-x"><button class="chip ${m.cat === 'all' ? 'active' : ''}" data-action="food-cat" data-v="all">?�?�??</button>
        ${Object.keys(FOOD_CATS).map(k => `<button class="chip ${m.cat === k ? 'active' : ''}" data-action="food-cat" data-v="${k}">${FOOD_CATS[k]}</button>`).join('')}</div>
      <button class="btn btn-ghost btn-block mb-1" data-action="food-custom">+ ???�?�?? ???�?�?�?� ?�?�?�?�?�</button>
      ${fr.length ? `<div class="text-xs font-bold text-amber-400 mb-1">?�� ?�???�?�???�?� ?�?�?�?�?�?�?� ?�???� (???�?�?�?� = ?�?�?�???�)</div>
        <div class="scroll-x mb-2">${fr.map(f => `<button class="chip" style="color:#fff" data-action="food-quick" data-id="${f.id}">+ ${f.he}</button>`).join('')}</div>` : ''}
      <div id="food-list">${foodListHTML()}</div>`);
  }

  function renderModal() {
    const el = $('#modal'), m = ui.modal;
    if (!m) { el.innerHTML = ''; return; }
    if (m.type === 'pickEx') {
      el.innerHTML = sheet('?�?�?� ?�?�?�?�??', `<input class="input mb-2" placeholder="?�?�???�?�..." data-search="pick" value="${m.q || ''}" />
        ${chips(MUSCLES, m.mus || 'all', 'pick-muscle')}<div id="pick-list">${exerciseListHTML(filteredExercises(m.q, m.mus || 'all', 'all'), 'pick-ex', '?�?�?�?�')}</div>`);
    } else if (m.type === 'food') {
      el.innerHTML = foodModalHTML();
    } else if (m.type === 'finishConfirm') {
      el.innerHTML = sheet('?�?�?�?� ?�?�???�??', `<div class="mb-3 text-center">?�?�?�???�?? ?�?�?�?�?? ???�?�?�?�?�?� <b>${m.routineName}</b> ?�?? ?�?�?�?�?� ?�?�?�?�?�?�?� ?�?�?�?�?�???�?�.<br>?�?�?� ???�?�?�?? ?�?� ?�?�?�?�?�?�?</div>
        <button class="btn btn-primary btn-block mb-2" data-action="finish-confirm-update">?�?�?�?? ?�?�?�?�?� ?�?�???�?� ?�?�???�??</button>
        <button class="btn btn-ghost btn-block" data-action="finish-confirm-skip">?�???�?� ???�?�???�?� ?�???�?� (?????� ?�?�?�?�?� ?�?�?�?�?�?�)</button>`);
    } else if (m.type === 'summary') {
      const w = m.w;
      el.innerHTML = sheet('?�?�?�???�?? ?�?�???�! ??��', `<div class="grid grid-cols-3 gap-2 text-center mb-3">
        <div class="card !mb-0"><div class="text-[11px] muted">???�??</div><b>${fmtClock(w.duration)}</b></div>
        <div class="card !mb-0"><div class="text-[11px] muted">?�???�</div><b>${fmtN(w.volume)} ?�"?�</b></div>
        <div class="card !mb-0"><div class="text-[11px] muted">?�?�?�?�?�</div><b>??�� ${w.prs}</b></div></div>
        <button class="btn btn-primary btn-block mb-2 !py-2" data-action="share-workout">??? ????? (?????)</button>
        <button class="btn btn-primary btn-block" data-action="close-modal">?�?�?�?�</button>`);
    } else if (m.type === 'plateCalc') {
      const weight = num(m.weight) || 20, bar = num(m.bar) || 20;
      const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
      let left = (weight - bar) / 2;
      const used = [];
      if (left > 0) plates.forEach(p => { while (left >= p) { used.push(p); left -= p; } });
      el.innerHTML = sheet('???�?�?�?�?? ?????�?�?�', `<div class="flex gap-2 mb-4">
        <label class="flex-1 text-xs muted">???�?�?? ?�?�?�?� (?�"?�)<input class="input mt-1" type="number" step="2.5" data-cf="weight" value="${weight}" /></label>
        <label class="flex-1 text-xs muted">???�?�?? ???�?� (?�"?�)<input class="input mt-1" type="number" step="5" data-cf="bar" value="${bar}" /></label></div>
        <div class="text-center mb-4"><div class="text-[11px] muted mb-1">?????�?�?� ???�?? ?�?�</div>
        ${used.length ? `<div class="flex flex-wrap justify-center gap-1">${used.map(p => `<span class="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold">${p}</span>`).join('')}</div>` : '<div class="text-sm">?�?� ???�?�</div>'}
        </div><button class="btn btn-primary btn-block" data-action="close-modal">?�?�?�?�</button>`);
    } else if (m.type === 'routine') {
      el.innerHTML = sheet('?�???�?�?� ?�?�?�?�?�', `<input id="routine-name" class="input mb-3" placeholder="?�?� ?�?�?�?�?�?� (?????�??: ?�?�?�???�)" value="${m.name || ''}" />
        <button class="btn btn-primary btn-block" data-action="routine-confirm">?�???�?�</button>`);
    } else if (m.type === 'newRoutine') {
      el.innerHTML = sheet('?�?�?�?�?� ?�?�?�?�', `<input id="routine-name" class="input mb-2" placeholder="?�?� ?�?�?�?�?�?�" value="${m.name || ''}" />
        <input class="input mb-2" placeholder="?�?�???�?� ?�?�?�?�??..." data-search="rpick" value="${m.q || ''}" />
        <div id="rpick-list" style="max-height:42vh;overflow-y:auto">${routinePickHTML()}</div>
        <button class="btn btn-success btn-block mt-3" data-action="routine-create">?�?�?� ?�?�?�?�?� (<span id="rcount">${m.ids.length}</span> ?�?�?�?�???�?�)</button>`);
    }
    icons();
  }

  /* ============================ EVENTS ============================ */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-action],[data-nav]'); if (!t) { if (ui.menu) { ui.menu = null; render(); } return; }
    if (t.dataset.nav) { ui.tab = t.dataset.nav; ui.menu = null; render(); window.scrollTo(0, 0); return; }
    const d = t.dataset, ei = +d.ei, si = +d.si;
    switch (d.action) {
      case 'start-empty': startWorkout([]); break;
      case 'start-routine': { const r = S.routines.find(x => x.id === d.id); if (S.active && !confirm('?�?� ?�?�???�?? ???�?�??. ???�?�???�?� ?�?�?�?�?')) break; startWorkout(r.exercises || r.exIds, r.id); ui.tab = 'workout'; render(); break; }
      case 'add-ex-open': ui.modal = { type: 'pickEx', q: '', mus: 'all' }; render(); break;
      case 'replace-ex-open': ui.modal = { type: 'pickEx', q: '', mus: 'all', replaceEi: ei }; render(); break;
      case 'pick-muscle': ui.modal.mus = d.v; renderModal(); break;
      case 'pick-ex': {
        if (ui.modal.replaceEi !== undefined) {
           S.active.exercises[ui.modal.replaceEi] = { exId: d.id, sets: [newSet()] };
        } else {
           addExercise(d.id); 
        }
        ui.modal = null; save(); render(); break;
      }
      case 'remove-ex': if (confirm('???�?�?�?� ?�?� ?�?�?�?�?�???')) { S.active.exercises.splice(ei, 1); save(); render(); } break;
      case 'add-set': { const sets = S.active.exercises[ei].sets; sets.push(newSet()); save(); render(); break; }
      case 'del-set': { const sets = S.active.exercises[ei].sets; sets.splice(si, 1); ui.menu = null; save(); render(); break; }
      case 'type-menu': ui.menu = ui.menu && ui.menu.ei === ei && ui.menu.si === si ? null : { ei, si }; render(); ev.stopPropagation(); break;
      case 'set-type': S.active.exercises[ei].sets[si].type = d.t; ui.menu = null; save(); render(); break;
      case 'use-prev': { const ex = S.active.exercises[ei], p = prevSet(ex.exId, si); if (p) { ex.sets[si].kg = p.kg; ex.sets[si].reps = p.reps; ex.sets[si].touched = true; save(); render(); } break; }
      case 'toggle-done': toggleDone(ei, si); break;
      case 'finish': finishWorkout(); break;
      case 'finish-confirm-update': finishWorkout(true, true); break;
      case 'finish-confirm-skip': finishWorkout(true, false); break;
      case 'cancel-workout': if (confirm('????? ????? ??? ????? ???????')) { S.active = null; stopRest(); save(); render(); if (wakeLock) { wakeLock.release(); wakeLock = null; } } break;
      case 'save-routine': ui.modal = { type: 'routine', name: '' }; renderModal(); break;
      case 'routine-confirm': { const n = (ui.modal.name || '').trim() || '?�?�?�?�?� ?�?�?�?�'; S.routines.push({ id: uid(), name: n, exIds: S.active.exercises.map(e => e.exId), exercises: S.active.exercises.map(e => ({ exId: e.exId, sets: e.sets.map(s => ({ type: s.type, kg: s.kg, reps: s.reps })) })) }); ui.modal = null; save(); render(); toast('?�?�?�?�?�?� ?�?�???�?�', true); break; }
      case 'new-routine': ui.modal = { type: 'newRoutine', name: '', ids: [], q: '' }; renderModal(); break;
      case 'routine-toggle': {
        const ids = ui.modal.ids, i = ids.indexOf(d.id); if (i >= 0) ids.splice(i, 1); else ids.push(d.id);
        $('#rpick-list').innerHTML = routinePickHTML(); $('#rcount').textContent = ids.length; icons(); break;
      }
      case 'routine-create': {
        const m = ui.modal; if (!m.ids.length) { toast('?�?�?� ?????�?�?� ?�?�?�?�?? ?�?�?�'); break; }
        S.routines.push({ id: uid(), name: (m.name || '').trim() || '?�?�?�?�?� ?�?�?�?�', exIds: m.ids.slice(), exercises: m.ids.map(id => { const mem = S.exerciseMemory[id]; let sets = []; if(mem && mem.length) { sets = mem.map(x => ({type: x.type||'N', kg: x.kg||'', reps: x.reps||''})); } else { sets = [{type: 'N', kg: '', reps: ''}]; } return {exId: id, sets}; }) });
        ui.modal = null; save(); render(); toast('?�?�?�?�?�?� ?�?�?�?�?�', true); break;
      }
      case 'del-routine': if (confirm('?????�?�?� ?�?�?�?�?�?')) { S.routines = S.routines.filter(r => r.id !== d.id); save(); render(); toast('?�?�?�?�?�?� ?�???�?�?�'); } break;
      case 'del-workout': if (confirm('?????�?�?� ?�?� ?�?�?�???�?? ???�?�?�?�?�?�?�?�?�?')) { S.history = S.history.filter(w => w.id !== d.id); save(); render(); toast('?�?�?�???�?? ?�???�?�'); } break;
      case 'rest-add': if (ui.rest) { ui.rest.end += 15000; ui.rest.total += 15; renderRest(); } break;
      case 'rest-sub': if (ui.rest) { ui.rest.end -= 15000; ui.rest.total = Math.max(1, ui.rest.total - 15); renderRest(); } break;
      case 'rest-skip': stopRest(); break;
      case 'lib-muscle': ui.libMuscle = d.v; render(); break;
      case 'lib-eq': ui.libEq = d.v; render(); break;
      case 'lib-add': addExercise(d.id); toast('?�?�?�?�?�?? ?�?�?�?� ???�?�???�?? ?�???�?�??', true); renderHeader(); break;
      
      case 'set-nutri-date': ui.nutriDate = d.d; render(); break;
      case 'toggle-day-type': {
        const cur = getDayType(ui.nutriDate);
        const next = cur === 'workout' ? 'rest' : cur === 'rest' ? 'custom' : 'workout';
        S.customDays[ui.nutriDate] = next;
        save(); render(); toast('?�?�?� ?�?�?�?� ?�?�?�?�??', true); break;
      }
      case 'open-plate-calc': ui.modal = { type: 'plateCalc', weight: '60', bar: '20' }; renderModal(); break; case 'share-workout': shareWorkoutImage(ui.modal.w); break; case 'open-calc': { const kg = S.active.exercises[+d.ei].sets[+d.si].kg; ui.modal = { type: 'plateCalc', weight: kg || '60', bar: '20' }; renderModal(); break; }
      
      case 'food-open': ui.modal = { type: 'food', view: 'list', q: '', cat: 'all', meal: currentMeal() }; renderModal(); break;
      case 'food-cat': ui.modal.cat = d.v; renderModal(); break;
      case 'food-meal': ui.modal.meal = d.v; renderModal(); break;
      case 'food-pick': { 
        const f = foodById(d.id); 
        ui.modal.view = 'detail'; 
        ui.modal.foodId = f.id; 
        const naturalUnits = f.units.filter(u => u.name !== '100 ?�?�?�');
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
        $('#food-amount').value = ui.modal.amount;
        $('#food-preview').innerHTML = foodPreview();
        break;
      }
      case 'food-back': ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); break;
      case 'food-fav': { const i = S.favorites.indexOf(d.id); if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(d.id); save(); renderModal(); break; }
      case 'food-quick': {
        const f = foodById(d.id);
        const naturalUnits = f.units.filter(u => u.name !== '100 ?�?�?�');
        let mode = 'unit';
        if (f.cat === 'meat' || f.cat === 'carbs' || f.cat === 'canned' || naturalUnits.length === 0) {
          mode = '100g';
        }
        
        let grams = 100;
        let label = '100 ?�?�';
        if (mode === '100g') {
           grams = 100;
           label = '100 ?�?�?� (1 ?� 100 ?�?�?�)';
        } else {
           const u = naturalUnits[0];
           if (u) { grams = u.g; label = `1 ${u.name} (${Math.round(grams)} ?�?�)`; }
        }
        logFood(f, grams, label, ui.modal ? ui.modal.meal : currentMeal(), 1); toast(`?�?�?�?�: ${f.he}`, true); render(); break;
      }
      case 'food-confirm': {
        const m = ui.modal, f = foodById(m.foodId), amt = num(m.amount); if (!(amt > 0)) { toast('?�?�?? ?�???�?�'); break; }
        const grams = getFoodGrams(m, f);
        let label = '';
        if (m.mode === '100g') label = `${Math.round(grams)} ?�?�?� (${amt} ?� 100 ?�?�?�)`;
        else if (m.mode === 'grams') label = `${Math.round(grams)} ?�?�`;
        else if (m.mode === 'unit') {
          const naturalUnits = f.units.filter(u => u.name !== '100 ?�?�?�');
          const u = naturalUnits[+m.unitIdx];
          label = u ? `${amt} ${u.name} (${Math.round(grams)} ?�?�)` : `${Math.round(grams)} ?�?�`;
        }
        logFood(f, grams, label, m.meal, amt);
        ui.modal = null; render(); toast('?�?�?�?� ???�???�?�?�', true); break;
      }
      case 'food-custom': ui.modal.view = 'custom'; ui.modal.cf = { name: '', cat: 'protein', kcal: '', p: '', c: '', f: '', unitName: '', unitG: '' }; renderModal(); break;
      case 'custom-save': {
        const c = ui.modal.cf; if (!c.name.trim() || !(num(c.kcal) >= 0) || c.kcal === '') { toast('?�?�?? ?�?� ?�?�???�?�?�?�?� ??-100 ?�?�'); break; }
        const f = { id: 'c_' + uid(), he: c.name.trim(), cat: c.cat, kcal: num(c.kcal), p: num(c.p), c: num(c.c), f: num(c.f), custom: true, units: [] };
        if (c.unitName.trim() && num(c.unitG) > 0) f.units.push({ name: c.unitName.trim(), g: num(c.unitG) });
        f.units.push({ name: '100 ?�?�?�', g: 100 });
        S.customFoods.push(f); S.favorites.push(f.id); save(); toast('?�???�?�?? ?�?�???�', true);
        ui.modal.view = 'detail'; ui.modal.foodId = f.id; 
        const idx100 = f.units.findIndex(u => u.name === '100 ?�?�?�');
        ui.modal.amount = 1; ui.modal.unit = String(idx100); renderModal(); break;
      }
      case 'custom-del': if (confirm('?????�?�?� ?�?� ?�???�?�?? ?�???�?�?�?�?')) { S.customFoods = S.customFoods.filter(f => f.id !== d.id); S.favorites = S.favorites.filter(x => x !== d.id); save(); ui.modal.view = 'list'; ui.modal.foodId = null; renderModal(); toast('?�???�?�?? ?�???�?�'); } break;
      case 'food-del': { const it = dayLog(ui.nutriDate)[+d.i]; if (it) { dayLog(ui.nutriDate).splice(+d.i, 1); save(); render(); toast('?�???�?�: ' + it.name); } break; }
      case 'edit-goals': {
        const t = getDayType(ui.nutriDate);
        if (t === 'custom') {
          const g = S.customDayGoals[ui.nutriDate] || Object.assign({}, S.goals.workout);
          const v = prompt('?�?�?� ?�???�?�?�?�?� (???�?�?�?� ?�?�?�?�?�):', g.kcal); if (v === null) break; g.kcal = num(v) || g.kcal;
          const p = prompt('?�?�?� ?�???�?�?? (?�?�):', g.protein); if (p !== null) g.protein = num(p) || g.protein;
          const c = prompt('?�?�?� ???�???�???�?� (?�?�):', g.carbs); if (c !== null) g.carbs = num(c) || g.carbs;
          const f = prompt('?�?�?� ?�?�???? (?�?�):', g.fat); if (f !== null) g.fat = num(f) || g.fat;
          S.customDayGoals[ui.nutriDate] = g;
        } else {
          const g = S.goals[t];
          const v = prompt(`?�?�?� ?�???�?�?�?�?� ?�?�???� (${t === 'workout' ? '?�?�?� ?�?�???�??' : '?�?�?� ???�?�?�?�'}):`, g.kcal); if (v === null) break; g.kcal = num(v) || g.kcal;
          const p = prompt('?�?�?� ?�???�?�?? (?�?�):', g.protein); if (p !== null) g.protein = num(p) || g.protein;
          const c = prompt('?�?�?� ???�???�???�?� (?�?�):', g.carbs); if (c !== null) g.carbs = num(c) || g.carbs;
          const f = prompt('?�?�?� ?�?�???? (?�?�):', g.fat); if (f !== null) g.fat = num(f) || g.fat;
        }
        save(); render(); break;
      }
      case 'weight-add': { const v = num($('#weight-input').value); if (v < 20 || v > 400) { toast('?�?�?? ???�?�?? ?�?�?�??'); break; } addWeight(v); render(); toast('?�???�?�?? ?�?�???�', true); break; }
      case 'weight-del': S.weights = S.weights.filter(w => w.date !== d.d); save(); render(); break;
      case 'close-modal': closeModal(); break;
      case 'close-modal-bg': if (ev.target === t) closeModal(); break;   // only when the dark backdrop itself is clicked
    }
  });

  let _inTimer;
  document.addEventListener('input', ev => {
    const t = ev.target, d = t.dataset;
    if (d.field === 'note' && S.active) {
      S.active.exercises[+d.ei].note = t.value; save();
    } else if (d.field && S.active) {                       // set weight/reps: update state only (keeps focus)
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
    } else if (d.search === 'lib') { ui.libQ = t.value; $('#lib-list').innerHTML = exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', '?�?�?�?� ???�?�???�??'); }
    else if (d.search === 'pick') { ui.modal.q = t.value; $('#pick-list').innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'pick-ex', '?�?�?�?�'); }
    else if (d.search === 'rpick') { ui.modal.q = t.value; $('#rpick-list').innerHTML = routinePickHTML(); }
    else if (d.search === 'food') { ui.modal.q = t.value; $('#food-list').innerHTML = foodListHTML(); }
    else if (t.id === 'food-amount') { ui.modal.amount = t.value; $('#food-preview').innerHTML = foodPreview(); }
    else if (d.cf) { ui.modal.cf[d.cf] = t.value; if (ui.modal.type === 'plateCalc') renderModal(); }
    else if (t.id === 'routine-name') { ui.modal.name = t.value; }
  });
  document.addEventListener('change', ev => {
    if (ev.target.id === 'food-unit-idx') { ui.modal.unitIdx = ev.target.value; $('#food-preview').innerHTML = foodPreview(); }
    else if (ev.target.dataset.cf) ui.modal.cf[ev.target.dataset.cf] = ev.target.value;
  });
  /* Escape closes any open modal (or the set-type popover) */
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (ui.modal) closeModal(); else if (ui.menu) { ui.menu = null; render(); }
  });

    function shareWorkoutImage(w) {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080 + w.exercises.length * 100;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#f97316';
      ctx.font = 'italic 900 80px "Roboto Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUILT DIFFERENT', canvas.width / 2, 140);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 50px "Roboto Mono", sans-serif';
      ctx.fillText('??? ?????: ' + fmtClock(w.duration), canvas.width / 2, 250);
      
      ctx.fillStyle = '#10b981';
      ctx.fillText('???: ' + fmtN(w.volume) + ' ?"?', canvas.width / 2, 330);
      
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '600 40px system-ui, sans-serif';
      ctx.textAlign = 'right';
      let y = 470;
      w.exercises.forEach(e => {
         const name = (exById(e.exId) || { he: '' }).he;
         const sets = e.sets.length + ' ????';
         const best = e.sets.reduce((max, s) => Math.max(max, num(s.kg)), 0);
         const bestStr = best > 0 ? '| ???????: ' + best + ' ?"?' : '';
         ctx.fillText(name + ' - ' + sets + ' ' + bestStr, canvas.width - 80, y);
         y += 100;
      });
      
      const link = document.createElement('a');
      link.download = 'built-different-' + w.date.slice(0,10) + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

  /* ============================ BOOT ============================ */
  window.addEventListener('load', () => { render(); if (ui.rest) renderRest(true); });
  if (document.readyState === 'complete') render();
})();

