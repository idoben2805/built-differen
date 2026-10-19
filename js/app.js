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

  const ui = { tab: 'workout', modal: null, menu: null, libQ: '', libMuscle: 'all', libEq: 'all', rest: null, nutriDate: null, explorerExId: null };

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
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.className = 'toast show' + (ok ? ' ok' : '');
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

  /* ==================== SVG THUMBNAIL GENERATOR ==================== */
  function getExerciseSvg(ex) {
    const pose = (ex && ex.pose) || 'bench-press';
    let svgContent = '';
    
    switch (pose) {
      case 'bench-press':
        svgContent = `
          <!-- Bench frame & legs -->
          <rect x="6" y="30" width="36" height="3" rx="1.5" fill="#1e293b" stroke="#334155" stroke-width="1"/>
          <path d="M12 33v8 M36 33v8" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Lifter body: head, torso on bench, bent leg down to floor -->
          <circle cx="12" cy="27" r="3.2" fill="#64748b"/>
          <path d="M15 28.5h16" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M30 29l4-3 3 13" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- TARGET: Pectorals (Chest) in glowing Electric Blue / Red-orange -->
          <path d="M18 28.5c0-3.5 6-3.5 6 0z" fill="#ef4444"/>
          <circle cx="21" cy="27" r="2.2" fill="#3b82f6"/>
          <!-- Arms pressing up to bar -->
          <path d="M19 28l2-8 3-7 M23 28l-2-8-3-7" stroke="#64748b" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Barbell & plates -->
          <line x1="8" y1="13" x2="36" y2="13" stroke="#cbd5e1" stroke-width="2.2" stroke-linecap="round"/>
          <rect x="9" y="8" width="3" height="10" rx="1" fill="#94a3b8"/>
          <rect x="32" y="8" width="3" height="10" rx="1" fill="#94a3b8"/>
        `;
        break;

      case 'incline-press':
        svgContent = `
          <!-- Incline bench frame -->
          <path d="M8 38l16-16" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
          <path d="M8 38l16-16" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
          <path d="M8 38h8 M20 25v14" stroke="#475569" stroke-width="2"/>
          <!-- Lifter on incline -->
          <circle cx="25" cy="19" r="3.2" fill="#64748b"/>
          <path d="M22 22l-12 12" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M10 34l6 2 4 6" fill="none" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>
          <!-- TARGET: Upper Pectorals in Electric Cyan / Orange -->
          <path d="M20 23l3-3-4-2z" fill="#06b6d4"/>
          <!-- Arms & Dumbbells pressing -->
          <path d="M18 24l5-6 6-5" stroke="#64748b" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="16" y1="12" x2="36" y2="7" stroke="#cbd5e1" stroke-width="2.2" stroke-linecap="round"/>
          <rect x="15" y="8" width="3" height="8" rx="1" transform="rotate(-15 16 12)" fill="#94a3b8"/>
          <rect x="34" y="3" width="3" height="8" rx="1" transform="rotate(-15 35 7)" fill="#94a3b8"/>
        `;
        break;

      case 'chest-fly':
        svgContent = `
          <!-- Top-down / front angle of chest fly -->
          <circle cx="24" cy="12" r="3.5" fill="#64748b"/>
          <path d="M20 16h8l-1 12h-6z" fill="#334155"/>
          <!-- TARGET: Full Pectorals in Glowing Electric Blue -->
          <path d="M20.5 17c1.5-1 3.5-1 3.5 4-2 1-3.5 0-3.5-4z" fill="#3b82f6"/>
          <path d="M27.5 17c-1.5-1-3.5-1-3.5 4 2 1 3.5 0 3.5-4z" fill="#3b82f6"/>
          <!-- Outstretched curved arms holding cables/dumbbells -->
          <path d="M20 18q-10 1-12 7" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M28 18q10 1 12 7" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Weights/Handles -->
          <rect x="6" y="23" width="3" height="6" rx="1" fill="#06b6d4"/>
          <rect x="39" y="23" width="3" height="6" rx="1" fill="#06b6d4"/>
          <line x1="2" y1="12" x2="6" y2="24" stroke="#3b82f6" stroke-width="1" stroke-dasharray="2 1"/>
          <line x1="46" y1="12" x2="42" y2="24" stroke="#3b82f6" stroke-width="1" stroke-dasharray="2 1"/>
        `;
        break;

      case 'deadlift':
        svgContent = `
          <!-- Lifter in hip-hinge / deadlift pull -->
          <circle cx="29" cy="11" r="3.2" fill="#64748b"/>
          <!-- Torso angled forward -->
          <path d="M14 24l13-10" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
          <!-- TARGET: Spinal Erectors, Glutes, Hamstrings -->
          <path d="M15 23l10-8-1-2-10 8z" fill="#3b82f6"/>
          <circle cx="14" cy="24" r="3.2" fill="#ef4444"/>
          <!-- Bent legs & feet -->
          <path d="M14 25l6 8 4 10" fill="none" stroke="#334155" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Arms hanging to bar -->
          <path d="M25 16l-1 17" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Barbell with large bumper plates -->
          <line x1="10" y1="33" x2="38" y2="33" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="15" cy="33" r="8" fill="#1e293b" stroke="#94a3b8" stroke-width="1.8"/>
          <circle cx="15" cy="33" r="2.5" fill="#64748b"/>
          <circle cx="34" cy="33" r="8" fill="#1e293b" stroke="#94a3b8" stroke-width="1.8"/>
          <circle cx="34" cy="33" r="2.5" fill="#64748b"/>
        `;
        break;

      case 'squat':
        svgContent = `
          <!-- Barbell across upper back -->
          <line x1="6" y1="14" x2="42" y2="14" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="7" y="7" width="3.5" height="14" rx="1" fill="#64748b" stroke="#94a3b8" stroke-width="1"/>
          <rect x="37.5" y="7" width="3.5" height="14" rx="1" fill="#64748b" stroke="#94a3b8" stroke-width="1"/>
          <!-- Head & upright torso -->
          <circle cx="24" cy="11" r="3.2" fill="#64748b"/>
          <path d="M24 15v8" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
          <!-- TARGET: Quadriceps & Glutes deep squat -->
          <path d="M24 23l-11 4 4 14" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 23l11 4-4 14" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Hands on bar -->
          <circle cx="15" cy="14" r="1.8" fill="#cbd5e1"/>
          <circle cx="33" cy="14" r="1.8" fill="#cbd5e1"/>
        `;
        break;

      case 'pullup':
        svgContent = `
          <!-- Pull-up Bar -->
          <line x1="4" y1="7" x2="44" y2="7" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
          <!-- Hands gripping bar -->
          <circle cx="14" cy="7" r="2" fill="#94a3b8"/>
          <circle cx="34" cy="7" r="2" fill="#94a3b8"/>
          <!-- Head looking up -->
          <circle cx="24" cy="12" r="3.2" fill="#64748b"/>
          <!-- Arms flexed pulling -->
          <path d="M14 7l3 10 4 2 M34 7l-3 10-4 2" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- TARGET: Latissimus Dorsi (V-Taper) in Electric Blue -->
          <path d="M19 18c-3 3-2 8 2 11h6c4-3 5-8 2-11z" fill="#3b82f6"/>
          <!-- Hanging legs -->
          <path d="M22 29l-1 9 2 4 M26 29l1 9-2 4" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>
        `;
        break;

      case 'pulldown':
        svgContent = `
          <!-- Overhead cable pulley & wide bar -->
          <line x1="24" y1="3" x2="24" y2="7" stroke="#3b82f6" stroke-width="1.5"/>
          <path d="M10 8l14 2 14-2" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Hands on bar -->
          <circle cx="13" cy="8.5" r="1.8" fill="#94a3b8"/>
          <circle cx="35" cy="8.5" r="1.8" fill="#94a3b8"/>
          <!-- Head & Seated Torso -->
          <circle cx="24" cy="14" r="3" fill="#64748b"/>
          <path d="M13 8.5l4 9 4 2 M35 8.5l-4 9-4 2" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <!-- TARGET: Lats in Cyan Glow -->
          <path d="M19 19c-3 3-2 7 2 10h6c4-3 5-7 2-10z" fill="#06b6d4"/>
          <!-- Machine seat & thigh pads -->
          <rect x="18" y="32" width="12" height="3" rx="1.5" fill="#475569"/>
          <path d="M21 29v10 M27 29v10" stroke="#334155" stroke-width="2.5"/>
        `;
        break;

      case 'row':
        svgContent = `
          <!-- 45 deg bent-over row posture -->
          <circle cx="30" cy="13" r="3.2" fill="#64748b"/>
          <path d="M15 25l13-9" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/>
          <!-- TARGET: Rhomboids & Upper Back -->
          <path d="M18 22l9-6-2-3-9 6z" fill="#3b82f6"/>
          <!-- Legs bent at knees -->
          <path d="M15 26l4 8 4 9" fill="none" stroke="#334155" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Arm pulling weight up to waist -->
          <path d="M26 17l-4-3-1 9" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Barbell/Dumbbell in hand -->
          <circle cx="21" cy="24" r="3.5" fill="#cbd5e1"/>
          <line x1="12" y1="24" x2="30" y2="24" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
        `;
        break;

      case 'overhead-press':
        svgContent = `
          <!-- Barbell pressed fully overhead -->
          <line x1="6" y1="7" x2="42" y2="7" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="7" y="3" width="3" height="8" rx="1" fill="#94a3b8"/>
          <rect x="38" y="3" width="3" height="8" rx="1" fill="#94a3b8"/>
          <!-- Arms extended straight up -->
          <path d="M18 19l-4-7-1-5 M30 19l4-7 1-5" stroke="#64748b" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="24" cy="16" r="3.2" fill="#64748b"/>
          <!-- TARGET: Deltoid caps glowing Electric Blue / Red -->
          <circle cx="18" cy="19" r="3.5" fill="#3b82f6"/>
          <circle cx="30" cy="19" r="3.5" fill="#3b82f6"/>
          <!-- Torso & legs standing tall -->
          <path d="M21 21h6l-1 10h-4z" fill="#334155"/>
          <path d="M22 31l-2 12 M26 31l2 12" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
        `;
        break;

      case 'lateral-raise':
        svgContent = `
          <!-- Standing figure with arms raised to side (T-pose) -->
          <circle cx="24" cy="11" r="3.2" fill="#64748b"/>
          <path d="M21 16h6l-1 12h-4z" fill="#334155"/>
          <path d="M22 28v14 M26 28v14" stroke="#475569" stroke-width="2.8" stroke-linecap="round"/>
          <!-- TARGET: Lateral Deltoid caps in Cyan Glow -->
          <circle cx="18" cy="16" r="3.5" fill="#06b6d4"/>
          <circle cx="30" cy="16" r="3.5" fill="#06b6d4"/>
          <!-- Extended arms & dumbbells -->
          <path d="M18 16l-11 2 M30 16l11 2" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="5" y="15" width="3" height="6" rx="1" fill="#cbd5e1"/>
          <rect x="40" y="15" width="3" height="6" rx="1" fill="#cbd5e1"/>
        `;
        break;

      case 'bicep-curl':
        svgContent = `
          <!-- Standing lifter curling arm -->
          <circle cx="24" cy="9" r="3.2" fill="#64748b"/>
          <path d="M21 14h6l-1 14h-4z" fill="#334155"/>
          <path d="M22 28v14 M26 28v14" stroke="#475569" stroke-width="2.8" stroke-linecap="round"/>
          <!-- Arm at side with elbow pinned -->
          <path d="M19 15l-1 9 4-8" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M29 15l1 9-4-8" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <!-- TARGET: Biceps Peak in Cyan Glow -->
          <ellipse cx="19" cy="19" rx="3.5" ry="2.2" transform="rotate(-20 19 19)" fill="#06b6d4"/>
          <ellipse cx="29" cy="19" rx="3.5" ry="2.2" transform="rotate(20 29 19)" fill="#06b6d4"/>
          <!-- Dumbbells in hands -->
          <rect x="19" y="13" width="5" height="3" rx="1" fill="#cbd5e1"/>
          <rect x="24" y="13" width="5" height="3" rx="1" fill="#cbd5e1"/>
        `;
        break;

      case 'hammer-curl':
        svgContent = `
          <!-- Neutral grip curl -->
          <circle cx="24" cy="9" r="3.2" fill="#64748b"/>
          <path d="M21 14h6l-1 14h-4z" fill="#334155"/>
          <path d="M22 28v14 M26 28v14" stroke="#475569" stroke-width="2.8"/>
          <!-- Forearm upright, dumbbell vertical -->
          <path d="M20 15l-2 9 3-8" fill="none" stroke="#64748b" stroke-width="2.2"/>
          <!-- TARGET: Brachialis / Bicep -->
          <ellipse cx="18" cy="20" rx="3" ry="2" fill="#06b6d4"/>
          <!-- Vertical Dumbbell -->
          <rect x="20" y="12" width="3" height="7" rx="1" fill="#cbd5e1"/>
        `;
        break;

      case 'preacher-curl':
        svgContent = `
          <!-- Preacher bench angled pad -->
          <line x1="12" y1="30" x2="28" y2="18" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
          <circle cx="14" cy="16" r="3.2" fill="#64748b"/>
          <!-- Arm extended on pad curling up -->
          <path d="M16 19l9-6-3-5" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- TARGET: Bicep isolated peak in Electric Blue -->
          <ellipse cx="22" cy="15" rx="3.5" ry="2.2" transform="rotate(-30 22 15)" fill="#3b82f6"/>
          <!-- Bar in hands -->
          <circle cx="22" cy="8" r="2.5" fill="#cbd5e1"/>
        `;
        break;

      case 'tricep-pushdown':
        svgContent = `
          <!-- High cable pulley -->
          <circle cx="34" cy="5" r="2.5" fill="#475569"/>
          <line x1="34" y1="7" x2="26" y2="24" stroke="#3b82f6" stroke-width="1.2"/>
          <!-- Lifter with pinned elbow -->
          <circle cx="16" cy="11" r="3.2" fill="#64748b"/>
          <path d="M16 15l-1 12 M15 27l2 15" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
          <path d="M17 16l4 8 5 4" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <!-- TARGET: Triceps Horseshoe in Electric Blue -->
          <path d="M18 16c2 2 3 5 2 8l-2-1c0-3-1-5-2-7z" fill="#3b82f6"/>
          <!-- Pushdown attachment -->
          <line x1="24" y1="28" x2="28" y2="28" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
        `;
        break;

      case 'overhead-tricep':
        svgContent = `
          <!-- Overhead Triceps Extension -->
          <circle cx="24" cy="16" r="3.2" fill="#64748b"/>
          <path d="M21 20h6v10h-6z" fill="#334155"/>
          <!-- Arms pointed up with forearms bent backwards behind head -->
          <path d="M19 20l2-10 4 7 M29 20l-2-10-4 7" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round"/>
          <!-- TARGET: Triceps long head in Cyan Glow -->
          <circle cx="21" cy="13" r="2.5" fill="#06b6d4"/>
          <circle cx="27" cy="13" r="2.5" fill="#06b6d4"/>
          <!-- Dumbbell / Cable handle behind head -->
          <rect x="22" y="15" width="4" height="6" rx="1" fill="#cbd5e1"/>
        `;
        break;

      case 'skullcrusher':
        svgContent = `
          <!-- Lying on bench extending elbows -->
          <rect x="8" y="30" width="32" height="3" rx="1.5" fill="#334155"/>
          <circle cx="13" cy="27" r="3" fill="#64748b"/>
          <path d="M16 28h14" stroke="#475569" stroke-width="4.5"/>
          <!-- Upper arm vertical, forearm hinged back -->
          <path d="M19 28l1-12-6 5" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- TARGET: Triceps in Cyan -->
          <path d="M18 26l2-9 2 0-1 9z" fill="#06b6d4"/>
          <circle cx="14" cy="21" r="2.5" fill="#cbd5e1"/>
        `;
        break;

      case 'dips':
        svgContent = `
          <!-- Parallel dip bars -->
          <line x1="8" y1="23" x2="18" y2="23" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="30" y1="23" x2="40" y2="23" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Suspended torso -->
          <circle cx="24" cy="11" r="3.2" fill="#64748b"/>
          <path d="M21 16h6l-1 11h-4z" fill="#334155"/>
          <!-- Hands on bars, arms supporting -->
          <path d="M19 17l-5 6v3 M29 17l5 6v3" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <!-- TARGET: Triceps & Lower Chest in Electric Blue -->
          <path d="M16 18c-1 2-1 4 0 5h2c-1-2-1-4 0-5z" fill="#3b82f6"/>
          <path d="M32 18c1 2 1 4 0 5h-2c1-2 1-4 0-5z" fill="#3b82f6"/>
          <!-- Legs tucked back -->
          <path d="M22 27l2 8 3 4" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>
        `;
        break;

      case 'leg-press':
        svgContent = `
          <!-- 45-degree sled and reclined seat -->
          <path d="M10 36l8-14" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
          <path d="M30 14l8-8" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
          <!-- Reclined lifter -->
          <circle cx="12" cy="20" r="3" fill="#64748b"/>
          <path d="M12 24l6 8 8-12 6-4" fill="none" stroke="#475569" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- TARGET: Quadriceps in Electric Blue -->
          <path d="M18 32l8-12 2 1-7 12z" fill="#3b82f6"/>
        `;
        break;

      case 'leg-curl':
        svgContent = `
          <!-- Lying/seated leg curl lever -->
          <rect x="8" y="24" width="24" height="4" rx="2" fill="#334155"/>
          <circle cx="10" cy="21" r="3" fill="#64748b"/>
          <path d="M12 24h12l8-8" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
          <!-- TARGET: Hamstrings highlighted in Cyan -->
          <path d="M16 23l8 0 1 2-8 0z" fill="#06b6d4"/>
          <circle cx="32" cy="16" r="3" fill="#64748b"/>
        `;
        break;

      case 'leg-extension':
        svgContent = `
          <!-- Seated leg extension machine -->
          <path d="M12 16v12h12" stroke="#334155" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="14" cy="12" r="3.2" fill="#64748b"/>
          <!-- Leg extending out with shin pad -->
          <path d="M24 28l9-4" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
          <!-- TARGET: Quadriceps in Cyan Glow -->
          <path d="M14 26l9 1-1-3-8 0z" fill="#06b6d4"/>
          <circle cx="33" cy="24" r="3" fill="#94a3b8"/>
        `;
        break;

      case 'calf-raise':
        svgContent = `
          <!-- Calf raise platform & standing figure -->
          <rect x="14" y="38" width="20" height="4" rx="1.5" fill="#334155"/>
          <circle cx="24" cy="10" r="3.2" fill="#64748b"/>
          <path d="M21 15h6v12h-6z" fill="#334155"/>
          <!-- Legs standing flexed on toes -->
          <path d="M22 27v11 M26 27v11" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
          <!-- TARGET: Gastrocnemius (Calf) in Electric Blue -->
          <ellipse cx="21" cy="32" rx="2.5" ry="3.5" fill="#3b82f6"/>
          <ellipse cx="27" cy="32" rx="2.5" ry="3.5" fill="#3b82f6"/>
        `;
        break;

      case 'core':
      default:
        svgContent = `
          <!-- Athletic torso with 6-pack rectus abdominis -->
          <circle cx="24" cy="9" r="3.2" fill="#64748b"/>
          <path d="M18 14h12l-2 16h-8z" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
          <!-- TARGET: 6-Pack Core Grid in Glowing Electric Blue -->
          <rect x="20" y="16" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <rect x="24.8" y="16" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <rect x="20" y="20" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <rect x="24.8" y="20" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <rect x="20" y="24" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <rect x="24.8" y="24" width="3.2" height="2.5" rx="0.8" fill="#3b82f6"/>
          <path d="M21 30l-3 12 M27 30l3 12" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
        `;
        break;
    }

    return `<div class="ex-thumb" aria-hidden="true"><svg viewBox="0 0 48 48">${svgContent}</svg></div>`;
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
      el.innerHTML = `<div class="flex items-center justify-between gap-2">
        <div><div class="text-[11px] muted font-bold">זמן מנוחה</div><div id="rest-time" class="rest-time">0:00</div></div>
        <div class="flex gap-2">
          <button class="btn" data-action="rest-sub">-15</button>
          <button class="btn" data-action="rest-add">+15</button>
          <button class="btn btn-primary" data-action="rest-skip">דלג</button>
        </div></div><div id="rest-prog" class="rest-progress"></div>`;
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
    const TYPE_NAME = { N: 'סט רגיל', W: 'חימום', D: 'דרופ-סט', F: 'כשל' };

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
          ${['N', 'W', 'D', 'F'].map(t => `<button class="q-menu__item" data-action="set-type" data-t="${t}" data-ei="${ei}" data-si="${si}" aria-selected="${type === t}">${TYPE_NAME[t]}</button>`).join('')}
          <button class="q-menu__item" data-action="open-calc" data-ei="${ei}" data-si="${si}"><i data-lucide="calculator"></i>מחשבון פלטות</button>
          ${e.sets.length > 1 ? `<button class="q-menu__item q-menu__item--danger" data-action="del-set" data-ei="${ei}" data-si="${si}"><i data-lucide="trash-2"></i>מחק סט</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    return `<section class="q-ex ${isSuperset ? 'q-ex--linked' : ''}">
      <div class="q-ex__head">
        <span class="q-thumb"><span class="q-thumb__letter">${name.trim().charAt(0).toUpperCase()}</span></span>
        <div class="q-ex__text">
          <span class="q-ex__name ltr">${name}</span>
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
    return `<div class="scroll-x"><button class="chip ${cur === 'all' ? 'active' : ''}" data-action="${action}" data-v="all">הכל</button>` +
      Object.keys(map).map(k => `<button class="chip ${cur === k ? 'active' : ''}" data-action="${action}" data-v="${k}">${map[k].he}</button>`).join('') + '</div>';
  }

  function exerciseListHTML(list, action, btnLabel) {
    if (!list.length) return '<div class="muted text-center py-6">לא נמצאו תרגילים</div>';
    return list.map(e => `<div class="list-item">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        ${getExerciseSvg(e)}
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm text-white truncate" dir="ltr" style="text-align: right;">${e.name || e.en}</div>
          <div class="text-xs text-blue-400 font-semibold">${e.heName || e.he}</div>
          <div class="text-[11px] muted">${MUSCLES[e.muscle] ? MUSCLES[e.muscle].he : e.muscle} · ${EQUIP[e.equipment] ? EQUIP[e.equipment].he : (e.equip || '')}</div>
        </div>
      </div>
      <button class="btn btn-ghost" data-action="${action}" data-id="${e.id}">${btnLabel}</button>
    </div>`).join('');
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

  function routineCard(r) {
    const exercises = normalizeRoutineExercises(r);
    return `<div class="card"><div class="flex items-center justify-between">
        <div><div class="font-bold text-white text-base">${r.name}</div><div class="text-xs text-blue-400 font-semibold">${exercises.length} תרגילים</div></div>
        <div class="flex gap-1.5 items-center">
          <button class="btn btn-success !py-1.5 !px-3 text-xs font-bold" data-action="start-routine" data-id="${r.id}">התחל אימון</button>
          <button class="btn btn-ghost !py-1.5 !px-2.5 text-xs font-semibold border border-blue-500/30 text-blue-400" data-action="edit-routine" data-id="${r.id}">✏️ ערוך</button>
          <button class="btn btn-danger !p-1.5" data-action="del-routine" data-id="${r.id}" aria-label="מחק תבנית">🗑️</button>
        </div></div>
        <div class="text-[11px] muted mt-1.5">${exercises.map(item => {
          const ex = exById(item.exId);
          const sCount = item.targetSets ? ` (${item.targetSets})` : '';
          return (ex ? (ex.name || ex.en) : '?') + sCount;
        }).join(' · ')}</div></div>`;
  }

  function viewLibrary() {
    return `<div class="flex items-center justify-between mb-2"><div class="card-title text-lg">התבניות שלי</div>
        <button class="btn btn-primary !py-1.5" data-action="new-routine">+ תבנית חדשה</button></div>
      ${S.routines.length ? S.routines.map(routineCard).join('')
        : '<div class="card muted text-sm text-center">אין תבניות עדיין. לחץ על "+ תבנית חדשה".</div>'}
      <div class="card-title mt-4 mb-2 text-lg">רשימת תרגילים (${EX.length})</div>
      <input class="input mb-2" placeholder="חפש תרגיל (באנגלית או בעברית)..." data-search="lib" value="${ui.libQ}" />
      ${chips(MUSCLES, ui.libMuscle, 'lib-muscle')}${chips(EQUIP, ui.libEq, 'lib-eq')}
      <div class="card" id="lib-list">${exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון')}</div>`;
  }

  /* ---- Nutrition Tab ---- */
  function macroBar(label, val, goal, gradient, unit) {
    const pct = Math.min(100, goal ? val / goal * 100 : 0);
    return `<div class="mb-2.5">
      <div class="flex justify-between text-xs mb-1 font-bold">
        <span>${label}</span>
        <span class="muted">${fmtN(val)} / ${goal} ${unit}</span>
      </div>
      <div class="bar"><div style="width:${pct}%;background:${gradient}"></div></div>
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
    
    const weekSelector = `<div class="flex gap-1 justify-between mb-3" dir="rtl">
      ${dates.map((d, i) => {
        const active = d === ui.nutriDate ? 'day-pill active' : 'day-pill';
        const isToday = d === todayKey();
        return `<button class="flex-1 py-1.5 rounded-xl flex flex-col items-center ${active} ${isToday ? 'today' : ''}" data-action="set-nutri-date" data-d="${d}">
          <div class="text-[10px] font-bold">${WEEK_HE[i]}</div>
          <div class="text-xs font-black">${new Date(d).getDate()}</div>
        </button>`;
      }).join('')}
    </div>`;

    const dayType = getDayType(ui.nutriDate);
    const typeLabel = dayType === 'workout' ? 'יום אימון' : dayType === 'rest' ? 'יום מנוחה' : 'מותאם אישית';

    return `${weekSelector}
    <div class="card">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="card-title">סיכום יומי</div>
        <div class="flex gap-1.5 items-center flex-wrap">
          <button class="btn btn-ghost !py-1 !px-2 text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 font-bold flex items-center gap-1" data-action="auto-macro-open" title="חישוב אוטומטי מותאם אישית לפי משקל ויעד">
            <span>⚙️</span> הגדרת יעדים אוטומטית
          </button>
          <button class="btn btn-ghost !p-1 text-[11px] text-blue-400" data-action="toggle-day-type" data-d="${ui.nutriDate}">${typeLabel}</button>
          <button class="btn btn-ghost !p-1 text-[11px]" data-action="edit-goals">ערוך ידנית</button>
        </div>
      </div>
      <div class="text-center mb-4">
        <span class="text-4xl font-black text-white">${Math.round(t.kcal)}</span>
        <span class="muted text-sm font-bold"> / ${g.kcal} קק"ל</span>
      </div>
      ${macroBar('קלוריות', t.kcal, g.kcal, 'linear-gradient(90deg, #3b82f6, #60a5fa)', 'קק"ל')}
      ${macroBar('חלבון', t.p, g.protein, 'linear-gradient(90deg, #06b6d4, #22d3ee)', 'ג\'')}
      ${macroBar('פחמימות', t.c, g.carbs, 'linear-gradient(90deg, #6366f1, #818cf8)', 'ג\'')}
      ${macroBar('שומן', t.f, g.fat, 'linear-gradient(90deg, #8b5cf6, #a78bfa)', 'ג\'')}
    </div>
    <button class="btn btn-primary btn-block mb-3" data-action="food-open">+ הוסף מאכל (או בחר מהמאגר)</button>
    ${MEALS.map(meal => {
      const items = log.map((it, idx) => Object.assign({ idx }, it)).filter(it => (it.meal || 'snack') === meal.k);
      const kc = items.reduce((a, i) => a + i.kcal, 0);
      return `<div class="card meal-card">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="card-title text-base">${meal.he}</div>
            <span class="text-xs text-blue-400 font-bold">${Math.round(kc)} קק"ל</span>
          </div>
          <button class="btn btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1 font-bold" data-action="food-open-meal" data-meal="${meal.k}">
            + הוסף
          </button>
        </div>
        <div class="flex gap-2 mb-2 pb-2 border-b border-slate-800/80">
          <button class="btn btn-ghost !py-1 !px-2 text-xs flex-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold" data-action="copy-yesterday" data-meal="${meal.k}" title="העתק את המאכלים מאתמול">
            ⚡ העתק מאתמול
          </button>
          <button class="btn btn-ghost !py-1 !px-2 text-xs flex-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 font-bold" data-action="saved-meals" data-meal="${meal.k}" title="ארוחות שמורות">
            ⭐ ארוחות שמורות
          </button>
        </div>
        ${items.length ? items.map(i => `<div class="list-item">
          <div>
            <div class="font-bold text-sm">${i.name}</div>
            <div class="text-[11px] muted">${i.label} · ח ${fmtN(i.p)} · פ ${fmtN(i.c)} · ש ${fmtN(i.f)}</div>
          </div>
          <div class="flex items-center gap-2">
            <b class="text-sm">${Math.round(i.kcal)}</b>
            <button class="btn btn-danger !p-1.5" data-action="food-del" data-i="${i.idx}" aria-label="מחק">🗑️</button>
          </div>
        </div>`).join('') : '<div class="muted text-xs py-3 text-center">אין פריטים עדיין</div>'}
      </div>`;
    }).join('')}`;
  }

  /* ---- Weight & Progress Views ---- */
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
      return `<rect x="${5 + i * bw + 2}" y="${h - 24 - hp/100*(h-30)}" width="${(bw-4)/2 - 1}" height="${hp/100*(h-30)}" rx="2" fill="#06b6d4"/>
              <rect x="${5 + i * bw + 2 + (bw-4)/2}" y="${h - 24 - hc/100*(h-30)}" width="${(bw-4)/2 - 1}" height="${hc/100*(h-30)}" rx="2" fill="#3b82f6"/>
              <text x="${5 + i * bw + bw/2}" y="${h - 10}" fill="#94a3b8" font-size="10" text-anchor="middle">${WEEK_HE[i]}</text>`;
    }).join('')}</svg>
    <div class="flex items-center justify-center gap-4 text-[10px] muted mt-1 font-bold">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-cyan-400"></span> יעד חלבון</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-blue-500"></span> יעד קלוריות</span>
    </div>`;
  }

  function lineChartWeights(points, w = 320, h = 140) {
    if (points.length < 2) return '<div class="muted text-sm text-center py-8">הוסף לפחות 2 שקילות להצגת גרף</div>';
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
      <text x="${px}" y="12" fill="#94a3b8" font-size="10">${max.toFixed(1)}</text>
      <text x="${px}" y="${h - 3}" fill="#94a3b8" font-size="10">${min.toFixed(1)}</text>
    </svg>
    <div class="flex items-center justify-center gap-4 text-[10px] muted mt-2 font-bold">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> משקל יומי</span>
      <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-indigo-500"></span> ממוצע נע (7)</span>
    </div>`;
  }

  function barChart(items, w = 320, h = 120) {
    if (!items.length) return '<div class="muted text-sm text-center py-8">שמור אימון כדי לראות התקדמות</div>';
    const max = Math.max(...items.map(i => i.v), 1), bw = (w - 10) / items.length;
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">${items.map((it, i) => {
      const bh = it.v / max * (h - 24);
      return `<rect x="${5 + i * bw + 2}" y="${h - 14 - bh}" width="${bw - 4}" height="${bh}" rx="3" fill="${it.pr ? '#06b6d4' : '#3b82f6'}"/>`;
    }).join('')}</svg>`;
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
      { key: 'chest', he: 'חזה', color: '#3b82f6' },
      { key: 'back', he: 'גב', color: '#06b6d4' },
      { key: 'legs', he: 'רגליים', color: '#10b981' },
      { key: 'shoulders', he: 'כתפיים', color: '#f59e0b' },
      { key: 'biceps', he: 'יד קדמית', color: '#ec4899' },
      { key: 'triceps', he: 'יד אחורית', color: '#8b5cf6' },
      { key: 'core', he: 'בטן', color: '#6366f1' }
    ];

    const maxVal = Math.max(15, ...Object.values(muscleSets));

    return `<div class="card">
      <div class="flex items-center justify-between mb-3">
        <div class="card-title">נפח שרירי שבועי (7 ימים אחרונים)</div>
        <span class="text-xs text-blue-400 font-bold">${totalSets} סטים סה״כ</span>
      </div>
      <div class="space-y-2.5">
        ${targetMuscles.map(m => {
          const c = muscleSets[m.key];
          const pct = Math.min(100, Math.round((c / maxVal) * 100));
          return `<div>
            <div class="flex justify-between text-xs mb-1 font-semibold">
              <span>${m.he}</span>
              <span class="${c > 0 ? 'text-white font-bold' : 'muted'}">${c} סטים</span>
            </div>
            <div class="h-2 rounded-full bg-slate-800/80 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:${m.color}"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="text-[11px] muted mt-3 text-center">יעד מומלץ: 10–20 סטים שבועיים לכל קבוצת שריר להיפרטרופיה אופטימלית</div>
    </div>`;
  }

  function lineChartExercise(points, w = 320, h = 130) {
    if (points.length < 2) return '';
    const vals = points.map(p => p.kg), min = Math.max(0, Math.min(...vals) - 2), max = Math.max(...vals) + 2, px = 14;
    const X = i => px + i * (w - 2 * px) / (points.length - 1), Y = v => h - 18 - (v - min) / (max - min) * (h - 36);
    const path = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.kg).toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="direction:ltr">
      <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
      ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.kg)}" r="3.5" fill="#f59e0b"/>`).join('')}
      <text x="${px}" y="12" fill="#94a3b8" font-size="10">${max.toFixed(1)} ק״ג</text>
      <text x="${px}" y="${h - 3}" fill="#94a3b8" font-size="10">${min.toFixed(1)} ק״ג</text>
    </svg>
    <div class="flex items-center justify-center gap-4 text-[10px] muted mt-1 font-bold">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> משקל עבודה מקסימלי (ק״ג)</span>
    </div>`;
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

    return `<div class="card">
      <div class="card-title mb-2">חקר תרגילים ושיאים (PR Explorer)</div>
      <label class="block text-xs muted font-bold mb-1">בחר תרגיל מהספרייה:</label>
      <select id="select-explorer-ex" class="input mb-3">
        ${EX.map(e => `<option value="${e.id}" ${e.id === curId ? 'selected' : ''}>${e.name || e.en} (${e.heName || e.he})</option>`).join('')}
      </select>

      <div class="flex items-center gap-3 p-2 bg-slate-900/60 border border-slate-800 rounded-xl mb-3">
        ${getExerciseSvg(curEx)}
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm text-white truncate" dir="ltr" style="text-align: right;">${curEx.name || curEx.en}</div>
          <div class="text-xs text-blue-400 font-semibold">${curEx.heName || curEx.he}</div>
          <div class="text-[11px] muted">${MUSCLES[curEx.muscle] ? MUSCLES[curEx.muscle].he : curEx.muscle} · ${EQUIP[curEx.equipment] ? EQUIP[curEx.equipment].he : ''}</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center mb-3">
        <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div class="text-[11px] muted mb-0.5">שיא עבודה</div>
          <div class="text-sm font-bold text-amber-400">${bestKg > 0 ? `${bestKg} ק״ג × ${bestReps}` : '—'}</div>
        </div>
        <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div class="text-[11px] muted mb-0.5">1RM משוער</div>
          <div class="text-sm font-bold text-cyan-400">${best1RM > 0 ? `${Math.round(best1RM)} ק״ג` : '—'}</div>
        </div>
        <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div class="text-[11px] muted mb-0.5">אימונים שבוצעו</div>
          <div class="text-sm font-bold text-blue-400">${exHistory.length}</div>
        </div>
      </div>

      ${exHistory.length >= 2 ? `
        <div class="text-xs font-bold text-slate-300 mb-1">גרף התקדמות משקל (ק״ג):</div>
        ${lineChartExercise(exHistory.map(h => ({ date: h.date, kg: h.kg })))}
      ` : ''}

      ${exHistory.length ? `
        <div class="mt-3">
          <div class="text-xs font-bold text-slate-300 mb-1">היסטוריית סטים אחרונה:</div>
          ${exHistory.slice(-5).reverse().map(h => `
            <div class="list-item !py-1.5 text-xs">
              <span class="muted">${fmtDate(h.date)}</span>
              <span class="font-bold text-slate-200" dir="ltr">${h.sets.map(s => `${s.kg}×${s.reps}`).join(' · ')}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div class="muted text-xs text-center py-4 bg-slate-900/30 rounded-lg">תרגיל זה טרם נרשם באימונים שבוצעו.</div>'}
    </div>`;
  }

  function backupCardHTML() {
    return `<div class="card">
      <div class="card-title mb-1">גיבוי ושחזור נתונים</div>
      <div class="text-xs muted mb-3">שמור עותק מלא של כל האימונים, התפריטים, המשקלים והתבניות שלך במכשיר, או שחזר מגיבוי קודם.</div>
      <div class="flex gap-2">
        <button class="btn btn-primary flex-1 font-bold text-xs !py-2.5 flex items-center justify-center gap-1.5" data-action="export-backup">
          📥 ייצא גיבוי מלא
        </button>
        <button class="btn btn-ghost flex-1 font-bold text-xs !py-2.5 border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-1.5" data-action="import-backup-click">
          📤 שחזר מגיבוי
        </button>
      </div>
      <input type="file" id="backup-file-input" accept=".json,application/json" style="display:none" />
    </div>`;
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
    return `<div class="card">
      <div class="card-title mb-2">משקל גוף</div>
      <div class="flex gap-2 mb-3">
        <input id="weight-input" type="number" step="0.1" inputmode="decimal" class="input" dir="ltr" placeholder='ק"ג' value="${last ? last.kg : ''}" />
        <button class="btn btn-primary" data-action="weight-add">שמור</button>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center mb-3">
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="text-[10px] muted mb-0.5 font-bold">משקל אחרון</div>
          <div class="text-sm font-black text-white">${last ? last.kg + ' ק״ג' : '—'}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="text-[10px] muted mb-0.5 font-bold">ממוצע 7 ימים אחרונים</div>
          <div class="text-sm font-black text-blue-400">${avg7 !== null ? avg7 + ' ק״ג' : '—'}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="text-[10px] muted mb-0.5 font-bold">שינוי מול שבוע שעבר</div>
          <div class="text-sm font-black ${deltaWeekly !== null && deltaWeekly <= 0 ? 'text-emerald-400' : 'text-blue-400'}" dir="ltr">
            ${deltaWeekly !== null ? (deltaWeekly > 0 ? '+' : '') + deltaWeekly + ' ק״ג' : '—'}
          </div>
        </div>
      </div>

      <div class="flex justify-between text-xs mb-2 font-bold px-1">
        <span class="muted">שינוי כולל: <b class="${deltaAll <= 0 ? 'text-emerald-400' : 'text-blue-400'}" dir="ltr">${deltaAll > 0 ? '+' : ''}${deltaAll} ק״ג</b></span>
        <span class="muted">${ws.length} שקילות רשומות</span>
      </div>
      ${lineChartWeights(ws.slice(-30))}
    </div>
    ${weeklyMuscleVolumeHTML()}
    ${exerciseExplorerHTML()}
    <div class="card"><div class="card-title mb-1">התמדה שבועית (תזונה)</div>${nutritionChart()}</div>
    <div class="card"><div class="card-title mb-1">נפח אימונים (12 אחרונים)</div>${barChart(hist.map(w => ({ v: w.volume, pr: w.prs > 0 })))}
      <div class="text-xs muted mt-2">עמודה כחולה-בהירה = אימון עם שיא אישי · סה"כ אימונים: ${S.history.length} · שיאים: ${totalPR}</div></div>
    ${S.history.length ? `<div class="card"><div class="card-title mb-1">היסטוריית אימונים</div>${S.history.slice(0, 10).map(w => `
      <div class="list-item"><div><div class="font-bold text-sm">${w.name ? w.name + ' · ' : ''}${fmtDate(w.date)} · ${w.exercises.length} תרגילים</div>
      <div class="text-[11px] muted">${fmtClock(w.duration)}${w.prs ? ` · 🏆 ${w.prs}` : ''}</div></div><b>${fmtN(w.volume)} ק"ג</b></div>`).join('')}</div>` : ''}
    ${ws.length ? `<div class="card"><div class="card-title mb-1">שקילות אחרונות</div>${ws.slice(-6).reverse().map(w => `
      <div class="list-item"><span>${fmtDate(w.date)}</span><span class="flex items-center gap-2"><b>${w.kg} ק"ג</b>
      <button class="btn btn-ghost !p-1" data-action="weight-del" data-d="${w.date}"><i data-lucide="x" class="w-4 h-4"></i></button></span></div>`).join('')}</div>` : ''}
    ${backupCardHTML()}`;
  }

  /* ---- Modals ---- */
  function sheet(title, body) {
    return `<div class="modal-back" data-action="close-modal-bg"><div class="modal-sheet">
      <div class="flex items-center justify-between modal-header"><div class="text-xl font-black">${title}</div>
      <button class="btn btn-ghost !p-1" data-action="close-modal" aria-label="סגור"><i data-lucide="x"></i></button></div>
      <div class="modal-body">${body}</div></div></div>`;
  }
  function closeModal() { ui.modal = null; render(); }

  function routinePickHTML() {
    const m = ui.modal, list = filteredExercises(m.q, 'all', 'all');
    return list.map(e => { 
      const on = m.ids.includes(e.id); 
      return `<div class="list-item">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          ${getExerciseSvg(e)}
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm text-white truncate" dir="ltr" style="text-align: right;">${e.name || e.en}</div>
            <div class="text-xs text-blue-400 font-semibold">${e.heName || e.he}</div>
            <div class="text-[11px] muted">${MUSCLES[e.muscle] ? MUSCLES[e.muscle].he : e.muscle} · ${EQUIP[e.equipment] ? EQUIP[e.equipment].he : (e.equip || '')}</div>
          </div>
        </div>
        <button class="btn ${on ? 'btn-success' : ''}" data-action="routine-toggle" data-id="${e.id}">${on ? '✓ נבחר' : 'בחר'}</button>
      </div>`; 
    }).join('') || '<div class="muted text-center py-6">לא נמצא</div>';
  }

  function foodRow(f) {
    const fav = S.favorites.includes(f.id);
    return `<div class="list-item"><button class="flex-1 text-right" style="background:none;border:0;color:inherit" data-action="food-pick" data-id="${f.id}">
        <div class="font-bold text-sm">${f.he}${f.custom ? ' <span class="pr-badge">מותאם</span>' : ''}</div>
        <div class="text-[11px] muted">ל-100 גרם: ${f.kcal} קק"ל · ח ${f.p} · פ ${f.c} · ש ${f.f}</div></button>
      <button class="btn btn-ghost !p-1" data-action="food-fav" data-id="${f.id}" style="color:${fav ? '#3b82f6' : '#64748b'}" aria-label="מועדף">${fav ? '★' : '☆'}</button>
      <button class="btn btn-success !px-3" data-action="food-quick" data-id="${f.id}" aria-label="הוסף מהר">+</button></div>`;
  }

  function foodListHTML() {
    const m = ui.modal, q = (m.q || '').trim();
    const list = allFoods().filter(f => (m.cat === 'all' || f.cat === m.cat) && (!q || f.he.includes(q)));
    return list.length ? list.map(foodRow).join('') : '<div class="muted text-center py-6">לא נמצא. ניתן ליצור מאכל מותאם אישית למעלה ↑</div>';
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
    return `<div class="text-xs muted mb-1 font-bold">${Math.round(grams)} גרם</div>
      <div class="grid grid-cols-4 gap-1"><div><b class="text-lg text-blue-400">${Math.round(c.kcal)}</b><div class="text-[10px] muted">קלוריות</div></div>
      <div><b class="text-lg text-cyan-400">${fmtN(c.p)}</b><div class="text-[10px] muted">חלבון</div></div>
      <div><b class="text-lg text-indigo-400">${fmtN(c.c)}</b><div class="text-[10px] muted">פחמימות</div></div>
      <div><b class="text-lg text-purple-400">${fmtN(c.f)}</b><div class="text-[10px] muted">שומן</div></div></div>`;
  }

  function foodModalHTML() {
    const m = ui.modal;
    const mealChips = `<div class="scroll-x mb-2">${MEALS.map(x => `<button class="chip ${m.meal === x.k ? 'active' : ''}" data-action="food-meal" data-v="${x.k}">${x.he}</button>`).join('')}</div>`;
    
    if (m.view === 'custom') {
      const c = m.cf, fld = (k, label, ph, type) => `<label class="block text-xs muted mb-2 font-bold">${label}<input class="input mt-1" data-cf="${k}" type="${type || 'number'}" step="0.1" min="0" placeholder="${ph || ''}" value="${c[k]}" /></label>`;
      return sheet('מאכל מותאם אישית', `${fld('name', 'שם המאכל', 'למשל: שייק חלבון ביתי', 'text')}
        <label class="block text-xs muted mb-2 font-bold">קטגוריה<select class="input mt-1" data-cf="cat">${Object.keys(FOOD_CATS).map(k => `<option value="${k}" ${c.cat === k ? 'selected' : ''}>${FOOD_CATS[k]}</option>`).join('')}</select></label>
        <div class="text-xs font-bold mb-1 text-blue-400">ערכים ל-100 גרם</div>
        <div class="grid grid-cols-2 gap-x-2">${fld('kcal', 'קלוריות')}${fld('p', 'חלבון (ג\')')}${fld('c', 'פחמימות (ג\')')}${fld('f', 'שומן (ג\')')}</div>
        <div class="text-xs font-bold mb-1 text-cyan-400">יחידת מידה (אופציונלי)</div>
        <div class="grid grid-cols-2 gap-x-2">${fld('unitName', 'שם היחידה', 'יחידה / כף / כוס', 'text')}${fld('unitG', 'משקל היחידה בגרם', '')}</div>
        <div class="flex gap-2 mt-3"><button class="btn flex-1" data-action="food-back">חזרה</button><button class="btn btn-success flex-1" data-action="custom-save">שמור מאכל</button></div>`);
    }

    if (m.view === 'detail') {
      const f = foodById(m.foodId);
      const naturalUnits = (f.units || []).filter(u => u.name !== '100 גרם');
      
      const modeTabs = `<div class="flex gap-1 mb-3">
        <button class="btn ${m.mode === '100g' ? 'btn-primary' : ''} flex-1 !p-1 text-xs" data-action="set-food-mode" data-v="100g">לפי 100 גרם</button>
        <button class="btn ${m.mode === 'grams' ? 'btn-primary' : ''} flex-1 !p-1 text-xs" data-action="set-food-mode" data-v="grams">משקל (חופשי)</button>
        ${naturalUnits.length ? `<button class="btn ${m.mode === 'unit' ? 'btn-primary' : ''} flex-1 !p-1 text-xs" data-action="set-food-mode" data-v="unit">לפי יחידה</button>` : ''}
      </div>`;

      let inputSection = '';
      if (m.mode === '100g') {
        inputSection = `<div class="mb-3">
          <input id="food-amount" class="input mb-2 text-center text-lg font-bold" type="number" step="0.5" min="0" dir="ltr" value="${m.amount}" placeholder="כמות (למשל 1.5)" />
          <div class="flex flex-wrap gap-2">
            ${[0.5, 1, 1.5, 2, 2.5, 3].map(v => `<button class="btn !p-1.5 text-xs flex-1" data-action="set-amount" data-v="${v}">${v * 100} ג'</button>`).join('')}
          </div>
        </div>`;
      } else if (m.mode === 'grams') {
        inputSection = `<div class="mb-3">
          <input id="food-amount" class="input text-center text-lg font-bold" type="number" step="1" min="0" dir="ltr" value="${m.amount}" placeholder="הזן משקל בגרמים" />
        </div>`;
      } else if (m.mode === 'unit') {
        inputSection = `<div class="flex gap-2 mb-3">
          <input id="food-amount" class="input flex-1 text-center text-lg font-bold" type="number" step="0.5" min="0" dir="ltr" value="${m.amount}" />
          <select id="food-unit-idx" class="input flex-2">
            ${naturalUnits.map((u, i) => `<option value="${i}" ${String(m.unitIdx) === String(i) ? 'selected' : ''}>${u.name} (${u.g} ג')</option>`).join('')}
          </select>
        </div>`;
      }

      return sheet(f.he, `${mealChips}
        <div class="text-xs muted my-2">ל-100 גרם: ${f.kcal} קק"ל · ח ${f.p} · פ ${f.c} · ש ${f.f}</div>
        ${modeTabs}
        ${inputSection}
        <div id="food-preview" class="card text-center">${foodPreview()}</div>
        <div class="flex gap-2">
          <button class="btn flex-1" data-action="food-back">חזרה</button>
          <button class="btn btn-success flex-1" data-action="food-confirm">הוסף ל${(MEALS.find(x => x.k === m.meal) || { he: '' }).he}</button>
        </div>
        ${f.custom ? `<button class="btn btn-danger btn-block mt-2" data-action="custom-del" data-id="${f.id}">מחק מאכל מותאם</button>` : ''}`);
    }

    const fr = frequentFoods();
    return sheet('מאגר המזונות', `${mealChips}
      <input class="input my-2" placeholder="חיפוש מאכל..." data-search="food" value="${m.q || ''}" />
      <div class="scroll-x mb-2"><button class="chip ${m.cat === 'all' ? 'active' : ''}" data-action="food-cat" data-v="all">הכל</button>
        ${Object.keys(FOOD_CATS).map(k => `<button class="chip ${m.cat === k ? 'active' : ''}" data-action="food-cat" data-v="${k}">${FOOD_CATS[k]}</button>`).join('')}</div>
      <button class="btn btn-ghost btn-block mb-2" data-action="food-custom">+ מאכל מותאם אישית</button>
      ${fr.length ? `<div class="text-xs font-bold text-blue-400 mb-1">★ המאכלים הקבועים שלי (לחיצה = הוספה מהירה)</div>
        <div class="scroll-x mb-2">${fr.map(f => `<button class="chip" style="color:#fff" data-action="food-quick" data-id="${f.id}">+ ${f.he}</button>`).join('')}</div>` : ''}
      <div id="food-list">${foodListHTML()}</div>`);
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

  function renderModal() {
    const el = $('#modal'), m = ui.modal;
    if (!m) { el.innerHTML = ''; return; }
    if (m.type === 'pickEx') {
      const title = m.replaceEi !== undefined ? 'החלפת תרגיל' : 'בחר תרגיל';
      const btnLabel = m.replaceEi !== undefined ? 'החלף' : 'הוסף';
      el.innerHTML = sheet(title, `<input class="input mb-2" placeholder="חיפוש תרגיל (באנגלית או בעברית)..." data-search="pick" value="${m.q || ''}" />
        ${chips(MUSCLES, m.mus || 'all', 'pick-muscle')}<div id="pick-list">${exerciseListHTML(filteredExercises(m.q, m.mus || 'all', 'all'), 'pick-ex', btnLabel)}</div>`);
    } else if (m.type === 'food') {
      el.innerHTML = foodModalHTML();
    } else if (m.type === 'editRoutine') {
      if (m.subview === 'addEx') {
        const filtered = filteredExercises(m.q, m.mus || 'all', 'all');
        el.innerHTML = sheet('הוסף תרגיל לתבנית', `
          <div class="flex items-center justify-between mb-3">
            <button class="btn btn-ghost !p-1 text-xs flex items-center gap-1 text-blue-400 font-bold" data-action="routine-editor-add-back">
              <span>←</span> חזרה לעריכה
            </button>
            <div class="text-xs muted font-bold">${filtered.length} תרגילים זמינים</div>
          </div>
          <input class="input mb-2" placeholder="חיפוש תרגיל (באנגלית או בעברית)..." data-search="redit-pick" value="${m.q || ''}" />
          ${chips(MUSCLES, m.mus || 'all', 'redit-muscle')}
          <div id="redit-pick-list" style="max-height:46vh;overflow-y:auto;padding-right:2px">
            ${exerciseListHTML(filtered, 'routine-editor-add-ex', '+ הוסף לתבנית')}
          </div>
        `);
      } else {
        const rows = m.exercises.map((item, idx) => {
          const ex = exById(item.exId) || { name: 'Exercise', en: 'Exercise', heName: 'תרגיל', he: 'תרגיל', muscle: 'chest', equipment: 'barbell', pose: 'bench-press' };
          return `
            <div class="routine-ex-item mb-2.5">
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  ${getExerciseSvg(ex)}
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-white truncate" dir="ltr" style="text-align: right;">${ex.name || ex.en}</div>
                    <div class="text-[11px] text-blue-400 font-medium truncate">${ex.heName || ex.he}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button class="btn btn-ghost !p-1 text-slate-400 hover:text-white" data-action="routine-ex-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.25"' : ''} title="העלה מעלה">↑</button>
                  <button class="btn btn-ghost !p-1 text-slate-400 hover:text-white" data-action="routine-ex-down" data-idx="${idx}" ${idx === m.exercises.length - 1 ? 'disabled style="opacity:0.25"' : ''} title="הורד מטה">↓</button>
                  <button class="btn btn-ghost !p-1 text-red-400 hover:text-red-300" data-action="routine-ex-del" data-idx="${idx}" title="הסר תרגיל">✕</button>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs">
                <span class="text-slate-400 font-medium">יעד סטים (סטים באימון):</span>
                <div class="flex items-center gap-2">
                  <button class="set-stepper-btn" data-action="routine-set-dec" data-idx="${idx}">-</button>
                  <span class="font-bold text-white text-sm tabular-nums w-6 text-center">${item.targetSets || 3}</span>
                  <button class="set-stepper-btn" data-action="routine-set-inc" data-idx="${idx}">+</button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        el.innerHTML = sheet('עריכת תבנית', `
          <div class="mb-3">
            <label class="block text-xs text-blue-400 font-bold mb-1.5">שם התבנית</label>
            <input id="routine-edit-name" class="input text-base font-bold" value="${m.name}" placeholder="שם התבנית..." />
          </div>

          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-slate-300">תרגילי התבנית (${m.exercises.length})</div>
            <button class="btn btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1 font-bold" data-action="routine-editor-add-open">
              <span>+</span> הוסף תרגיל לתבנית
            </button>
          </div>

          <div class="mb-4" style="max-height: 44vh; overflow-y: auto; padding-right: 2px;">
            ${m.exercises.length ? rows : '<div class="card muted text-center py-6 text-xs">אין תרגילים בתבנית עדיין.<br>לחץ על "+ הוסף תרגיל לתבנית" כדי לבחור תרגילים.</div>'}
          </div>

          <div class="flex gap-2 pt-2 border-t border-slate-800">
            <button class="btn btn-ghost flex-1 text-xs font-bold" data-action="close-modal">ביטול</button>
            <button class="btn btn-success flex-2 text-sm font-bold !py-2.5" data-action="routine-editor-save">שמור שינויים בתבנית 💾</button>
          </div>
        `);
      }
    } else if (m.type === 'smartRoutineSync') {
      el.innerHTML = sheet('סנכרון תבנית אימון', `
        <div class="text-center mb-4">
          <div class="text-3xl mb-1">⚡</div>
          <div class="text-base font-black text-white">עדכון התבנית "${m.routineName}"</div>
          <div class="text-xs text-slate-400 mt-1.5 leading-relaxed">
            האימון נשמר בהיסטוריה! ביצעת שינויים בתרגילים או במספר הסטים במהלך האימון.<br>כיצד תרצה לעדכן את התבנית הקבועה?
          </div>
        </div>

        <div class="space-y-2.5">
          <button class="sync-card-btn primary" data-action="sync-routine-full">
            <span class="text-2xl mt-0.5">🔄</span>
            <div>
              <div class="font-black text-white text-sm">עדכן תבנית במלואה</div>
              <div class="text-[11px] text-blue-200 mt-0.5">עדכן תרגילים, כמויות סטים ומשקלי עבודה</div>
            </div>
          </button>

          <button class="sync-card-btn" data-action="sync-routine-weights">
            <span class="text-2xl mt-0.5">⚖️</span>
            <div>
              <div class="font-black text-white text-sm">עדכן רק משקלי עבודה וחזרות</div>
              <div class="text-[11px] text-slate-400 mt-0.5">שמור על רשימת התרגילים המקורית של התבנית</div>
            </div>
          </button>

          <button class="sync-card-btn" data-action="sync-routine-none" style="background:transparent;border-color:rgba(255,255,255,0.08)">
            <span class="text-xl mt-0.5">📁</span>
            <div>
              <div class="font-bold text-slate-300 text-sm">שמור אימון להיסטוריה בלבד</div>
              <div class="text-[11px] text-slate-500 mt-0.5">השאר את התבנית ללא שינוי</div>
            </div>
          </button>
        </div>
      `);
    } else if (m.type === 'summary') {
      const w = m.w;
      el.innerHTML = sheet('האימון נשמר! 🔥', `<div class="grid grid-cols-3 gap-2 text-center mb-3">
        <div class="card !mb-0"><div class="text-[11px] muted">משך</div><b>${fmtClock(w.duration)}</b></div>
        <div class="card !mb-0"><div class="text-[11px] muted">נפח</div><b>${fmtN(w.volume)} ק"ג</b></div>
        <div class="card !mb-0"><div class="text-[11px] muted">שיאים</div><b>🏆 ${w.prs}</b></div></div>
        <button class="btn btn-primary btn-block mb-2 !py-2.5" data-action="share-workout">שתף סיכום אימון (תמונה)</button>
        <button class="btn btn-ghost btn-block" data-action="close-modal">סגור</button>`);
    } else if (m.type === 'plateCalc') {
      const weight = num(m.weight) || 20, bar = num(m.bar) || 20;
      const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
      let left = (weight - bar) / 2;
      const used = [];
      if (left > 0) plates.forEach(p => { while (left >= p) { used.push(p); left -= p; } });
      el.innerHTML = sheet('מחשבון פלטות', `<div class="flex gap-2 mb-4">
        <label class="flex-1 text-xs muted font-bold">משקל רצוי (ק"ג)<input class="input mt-1" type="number" step="2.5" data-cf="weight" value="${weight}" /></label>
        <label class="flex-1 text-xs muted font-bold">משקל מוט (ק"ג)<input class="input mt-1" type="number" step="5" data-cf="bar" value="${bar}" /></label></div>
        <div class="text-center mb-4"><div class="text-xs muted font-bold mb-2">פלטות לכל צד</div>
        ${used.length ? `<div class="flex flex-wrap justify-center gap-1.5">${used.map(p => `<span class="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-lg font-black shadow">${p}</span>`).join('')}</div>` : '<div class="text-sm font-bold">רק מוט ריק</div>'}
        </div><button class="btn btn-primary btn-block" data-action="close-modal">סגור</button>`);
    } else if (m.type === 'routine') {
      el.innerHTML = sheet('שמירת תבנית', `<input id="routine-name" class="input mb-3" placeholder="שם התבנית (למשל: דחיפה A)" value="${m.name || ''}" />
        <button class="btn btn-primary btn-block" data-action="routine-confirm">שמור תבנית</button>`);
    } else if (m.type === 'newRoutine') {
      el.innerHTML = sheet('תבנית חדשה', `<input id="routine-name" class="input mb-2" placeholder="שם התבנית (למשל: רגליים כבד)" value="${m.name || ''}" />
        <input class="input mb-2" placeholder="חיפוש תרגיל (באנגלית או בעברית)..." data-search="rpick" value="${m.q || ''}" />
        <div id="rpick-list" style="max-height:42vh;overflow-y:auto">${routinePickHTML()}</div>
        <button class="btn btn-success btn-block mt-3" data-action="routine-create">צור תבנית (<span id="rcount">${m.ids.length}</span> תרגילים)</button>`);
    } else if (m.type === 'savedMeals') {
      const mealObj = MEALS.find(x => x.k === m.meal) || { he: 'ארוחה' };
      const curDate = ui.nutriDate || todayKey();
      const currentItems = dayLog(curDate).filter(it => (it.meal || 'snack') === m.meal);
      const presets = (S.savedMeals || []).filter(p => !p.meal || p.meal === m.meal);
      
      const body = `
        <div class="mb-3">
          <button class="btn btn-primary btn-block text-xs font-bold !py-2.5 flex items-center justify-center gap-1.5 ${currentItems.length ? '' : 'opacity-50'}" data-action="save-meal-preset">
            💾 שמור את ארוחת היום (${mealObj.he}) כשבלונה
          </button>
          ${!currentItems.length ? '<div class="text-[10px] muted text-center mt-1">הוסף תחילה מאכלים לארוחה זו היום כדי לשמור אותה כשבלונה</div>' : ''}
        </div>
        <div class="text-xs font-bold text-slate-300 mb-2">שבלונות שמורות (${presets.length}):</div>
        ${presets.length ? presets.map(p => {
          const totKc = (p.items || []).reduce((a, b) => a + (b.kcal || 0), 0);
          const totP = (p.items || []).reduce((a, b) => a + (b.p || 0), 0);
          return `<div class="card !p-3 mb-2 bg-slate-900/60 border border-slate-800">
            <div class="flex items-center justify-between mb-1.5">
              <div class="font-bold text-sm text-white">${p.name}</div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-blue-400 font-bold">${Math.round(totKc)} קק"ל · ${fmtN(totP)}ג' חלבון</span>
                <button class="btn btn-ghost !p-1 text-red-400" data-action="delete-saved-meal" data-id="${p.id}" title="מחק שבלונה">🗑️</button>
              </div>
            </div>
            <div class="text-xs text-slate-400 mb-2">
              ${(p.items || []).map(it => `${it.name} (${it.label || `${Math.round(it.grams)}ג'`})`).join(' · ')}
            </div>
            <button class="btn btn-success btn-block text-xs font-bold !py-1.5" data-action="apply-saved-meal" data-id="${p.id}">
              + הוסף ארוחה זו ל${mealObj.he}
            </button>
          </div>`;
        }).join('') : '<div class="card muted text-xs text-center py-6">אין ארוחות שמורות עדיין. שמור את ארוחת היום בלחיצה למעלה!</div>'}
      `;
      el.innerHTML = sheet(`ארוחות שמורות · ${mealObj.he}`, body);
    } else if (m.type === 'autoMacro') {
      const calc = calcSmartMacros(m.weight, m.goal);
      const body = `
        <div class="mb-3">
          <label class="block text-xs muted font-bold mb-1">משקל גוף נוכחי (ק"ג):</label>
          <input id="auto-macro-weight" type="number" step="0.1" min="30" max="300" class="input font-bold text-center text-lg text-white" value="${m.weight}" dir="ltr" placeholder="משקל בק״ג" />
        </div>
        <div class="mb-3">
          <label class="block text-xs muted font-bold mb-1.5">בחר יעד תזונתי:</label>
          <div class="flex gap-2">
            <button class="goal-choice-btn ${m.goal === 'cut' ? 'active' : ''}" data-action="set-macro-goal" data-g="cut">
              <span class="text-base mb-1">🔥</span>
              <span>חיטוב</span>
              <span class="text-[10px] opacity-70">גרעון (2.2ג' חלבון)</span>
            </button>
            <button class="goal-choice-btn ${m.goal === 'maintain' ? 'active' : ''}" data-action="set-macro-goal" data-g="maintain">
              <span class="text-base mb-1">⚖️</span>
              <span>ניטרלי</span>
              <span class="text-[10px] opacity-70">תחזוקה (2.0ג' חלבון)</span>
            </button>
            <button class="goal-choice-btn ${m.goal === 'bulk' ? 'active' : ''}" data-action="set-macro-goal" data-g="bulk">
              <span class="text-base mb-1">💪</span>
              <span>מסה נקייה</span>
              <span class="text-[10px] opacity-70">עודף (2.0ג' חלבון)</span>
            </button>
          </div>
        </div>

        <div class="text-xs font-bold text-slate-300 mb-2">יעדי קלוריות ומקרואים (ניתן לערוך ידנית):</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 shadow-lg">
            <div class="text-xs font-black text-blue-400 mb-2 flex items-center gap-1">
              <span>🏋️</span> יום אימון
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-300 font-bold">קלוריות:</span>
              <div class="flex items-center gap-1">
                <input id="macro-w-kcal" type="number" step="10" class="macro-kcal-val" value="${calc.workout.kcal}" dir="ltr" />
                <span class="text-[11px] muted font-bold">קק"ל</span>
              </div>
            </div>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-cyan-400 font-bold">חלבון:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-w-p" type="number" step="1" class="macro-input-val" value="${calc.workout.protein}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-indigo-400 font-bold">פחמימות:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-w-c" type="number" step="1" class="macro-input-val" value="${calc.workout.carbs}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-purple-400 font-bold">שומן:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-w-f" type="number" step="1" class="macro-input-val" value="${calc.workout.fat}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shadow-lg">
            <div class="text-xs font-black text-slate-300 mb-2 flex items-center gap-1">
              <span>🛋️</span> יום מנוחה
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-300 font-bold">קלוריות:</span>
              <div class="flex items-center gap-1">
                <input id="macro-r-kcal" type="number" step="10" class="macro-kcal-val" value="${calc.rest.kcal}" dir="ltr" />
                <span class="text-[11px] muted font-bold">קק"ל</span>
              </div>
            </div>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-cyan-400 font-bold">חלבון:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-r-p" type="number" step="1" class="macro-input-val" value="${calc.rest.protein}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-indigo-400 font-bold">פחמימות:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-r-c" type="number" step="1" class="macro-input-val" value="${calc.rest.carbs}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-purple-400 font-bold">שומן:</span>
                <div class="flex items-center gap-1">
                  <input id="macro-r-f" type="number" step="1" class="macro-input-val" value="${calc.rest.fat}" dir="ltr" />
                  <span class="text-[11px] muted">ג'</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="text-[10px] muted text-center mt-1 mb-3">ניתן לערוך ידנית כל אחד מהערכים שלמעלה לפי תוכנית התזונה שלך</div>

        <button class="btn btn-success btn-block font-bold text-sm !py-2.5 shadow-lg" data-action="apply-smart-macros">
          החל ושמור יעדים 🎯
        </button>
      `;
      el.innerHTML = sheet('הגדרת יעדים אוטומטית', body);
    }
    icons();
  }

  /* ============================ EVENTS ============================ */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-action],[data-nav]'); if (!t) { if (ui.menu) { ui.menu = null; render(); } return; }
    if (t.dataset.nav) { if (t.dataset.nav === 'workout' && ui.tab !== 'workout') ui.prevTab = ui.tab; ui.tab = t.dataset.nav; ui.menu = null; render(); window.scrollTo(0, 0); return; }
    const d = t.dataset, ei = +d.ei, si = +d.si;
    if (ui.menu && !['item-menu', 'type-menu', 'ex-menu', 'wk-menu'].includes(d.action)) { ui.menu = null; render(); }
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
          toast('התבנית עודכנה בהצלחה! 💾', true);
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
          toast(`התבנית "${r.name}" עודכנה במלואה! 🔄`, true);
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
          toast(`משקלי העבודה עודכנו בתבנית "${r.name}"! ⚖️`, true);
        }
        ui.modal = { type: 'summary', w: m.workout };
        render();
        break;
      }
      case 'sync-routine-none': {
        const m = ui.modal;
        toast('האימון נשמר בהיסטוריה 📁', true);
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
      case 'lib-muscle': ui.libMuscle = d.v; render(); break;
      case 'lib-eq': ui.libEq = d.v; render(); break;
      case 'lib-add': addExercise(d.id); toast('התרגיל נוסף לאימון הפעיל', true); renderHeader(); break;
      
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
          toast('לא נמצאו מאכלים בארוחה זו מאתמול ⚠️');
          break;
        }
        const curDate = ui.nutriDate || todayKey();
        S.nutrition[curDate] = S.nutrition[curDate] || [];
        prevList.forEach(item => {
          S.nutrition[curDate].push(Object.assign({}, item));
        });
        save();
        render();
        toast(`הועתקו ${prevList.length} מאכלים מאתמול! ⚡`, true);
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
        toast(`הארוחה "${finalName}" נשמרה בהצלחה! ⭐`, true);
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
        toast(`ארוחת "${preset.name}" נוספה לתפריט! 🍽️`, true);
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
          toast('קובץ הגיבוי הורד בהצלחה! 📥', true);
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
        document.querySelectorAll('.goal-choice-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.g === d.g);
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
        toast('יעדי התזונה נשמרו בהצלחה! 🎯', true);
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
      const ll = $('#lib-list'); if (ll) ll.innerHTML = exerciseListHTML(filteredExercises(ui.libQ, ui.libMuscle, ui.libEq), 'lib-add', 'הוסף לאימון'); 
    } else if (d.search === 'pick') { 
      ui.modal.q = t.value; 
      const pl = $('#pick-list'); if (pl) pl.innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'pick-ex', 'הוסף'); 
    } else if (d.search === 'rpick') { 
      ui.modal.q = t.value; 
      const rpl = $('#rpick-list'); if (rpl) rpl.innerHTML = routinePickHTML(); 
    } else if (d.search === 'redit-pick') { 
      ui.modal.q = t.value; 
      const rpl = $('#redit-pick-list'); if (rpl) rpl.innerHTML = exerciseListHTML(filteredExercises(ui.modal.q, ui.modal.mus || 'all', 'all'), 'routine-editor-add-ex', '+ הוסף לתבנית'); 
    } else if (d.search === 'food') { 
      ui.modal.q = t.value; 
      const fl = $('#food-list'); if (fl) fl.innerHTML = foodListHTML(); 
    } else if (t.id === 'food-amount') { 
      ui.modal.amount = t.value; 
      const fp = $('#food-preview'); if (fp) fp.innerHTML = foodPreview(); 
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
            toast('הנתונים שוחזרו בהצלחה מהגיבוי! 🔄', true);
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
      const fp = $('#food-preview'); if (fp) fp.innerHTML = foodPreview(); 
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
    
    // Deep obsidian background
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Header brand in electric blue
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'italic 900 80px "Roboto Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUILT DIFFERENT', canvas.width / 2, 140);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px "Heebo", system-ui, sans-serif';
    ctx.fillText('זמן אימון: ' + fmtClock(w.duration), canvas.width / 2, 250);
    
    ctx.fillStyle = '#10b981';
    ctx.fillText('נפח כולל: ' + fmtN(w.volume) + ' ק"ג', canvas.width / 2, 330);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 38px "Heebo", system-ui, sans-serif';
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
