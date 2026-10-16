/* BUILT DIFFERENT - Seed Exercise Database (STRONG / HEVY convention)
   80+ Core Exercises with Split Arm Categories and SVG Vector Pose Mapping */

window.BD_MUSCLES = {
  chest: { he: 'חזה', en: 'Chest' },
  back: { he: 'גב', en: 'Back' },
  legs: { he: 'רגליים', en: 'Legs' },
  shoulders: { he: 'כתפיים', en: 'Shoulders' },
  biceps: { he: 'יד קדמית', en: 'Biceps' },
  triceps: { he: 'יד אחורית', en: 'Triceps' },
  core: { he: 'בטן', en: 'Core' }
};

window.BD_EQUIPMENT = {
  barbell: { he: 'מוט', en: 'Barbell' },
  dumbbell: { he: 'משקולות יד', en: 'Dumbbell' },
  cable: { he: 'כבלים', en: 'Cable' },
  machine: { he: 'מכונה', en: 'Machine' },
  bodyweight: { he: 'משקל גוף', en: 'Bodyweight' }
};

window.BD_EXERCISES = [
  /* ==================== חזה (CHEST) ==================== */
  {
    id: 'bench-press',
    name: 'Bench Press (Barbell)',
    heName: 'לחיצת חזה במוט',
    en: 'Bench Press (Barbell)',
    he: 'לחיצת חזה במוט',
    muscle: 'chest',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'bench-press'
  },
  {
    id: 'db-bench',
    name: 'Bench Press (Dumbbell)',
    heName: 'לחיצת חזה במשקולות',
    en: 'Bench Press (Dumbbell)',
    he: 'לחיצת חזה במשקולות',
    muscle: 'chest',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'bench-press'
  },
  {
    id: 'incline-bench',
    name: 'Incline Bench Press (Barbell)',
    heName: 'לחיצת חזה שיפוע חיובי במוט',
    en: 'Incline Bench Press (Barbell)',
    he: 'לחיצת חזה שיפוע חיובי במוט',
    muscle: 'chest',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'incline-press'
  },
  {
    id: 'incline-db-press',
    name: 'Incline Bench Press (Dumbbell)',
    heName: 'לחיצת חזה שיפוע חיובי במשקולות',
    en: 'Incline Bench Press (Dumbbell)',
    he: 'לחיצת חזה שיפוע חיובי במשקולות',
    muscle: 'chest',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'incline-press'
  },
  {
    id: 'decline-bench-press',
    name: 'Decline Bench Press (Barbell)',
    heName: 'לחיצת חזה שיפוע שלילי במוט',
    en: 'Decline Bench Press (Barbell)',
    he: 'לחיצת חזה שיפוע שלילי במוט',
    muscle: 'chest',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'bench-press'
  },
  {
    id: 'chest-press-machine',
    name: 'Chest Press (Machine)',
    heName: 'לחיצת חזה במכונה',
    en: 'Chest Press (Machine)',
    he: 'לחיצת חזה במכונה',
    muscle: 'chest',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'bench-press'
  },
  {
    id: 'chest-fly-cable',
    name: 'Seated Cable Fly',
    heName: 'פרפר בכבלים בישיבה',
    en: 'Seated Cable Fly',
    he: 'פרפר בכבלים בישיבה',
    muscle: 'chest',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'chest-fly'
  },
  {
    id: 'cable-crossover-high',
    name: 'Cable Crossover (High to Low)',
    heName: 'קרוסאובר בכבלים מלמעלה למטה',
    en: 'Cable Crossover (High to Low)',
    he: 'קרוסאובר בכבלים מלמעלה למטה',
    muscle: 'chest',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'chest-fly'
  },
  {
    id: 'cable-fly-low',
    name: 'Cable Fly (Low to High)',
    heName: 'פרפר בכבלים מלמטה למעלה',
    en: 'Cable Fly (Low to High)',
    he: 'פרפר בכבלים מלמטה למעלה',
    muscle: 'chest',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'chest-fly'
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck / Butterfly (Machine)',
    heName: 'פרפר במכונה',
    en: 'Pec Deck / Butterfly (Machine)',
    he: 'פרפר במכונה',
    muscle: 'chest',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'chest-fly'
  },
  {
    id: 'chest-dip',
    name: 'Chest Dip',
    heName: 'מקבילים לחזה',
    en: 'Chest Dip',
    he: 'מקבילים לחזה',
    muscle: 'chest',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'dips'
  },
  {
    id: 'push-up',
    name: 'Push Up',
    heName: 'שכיבות סמיכה',
    en: 'Push Up',
    he: 'שכיבות סמיכה',
    muscle: 'chest',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'bench-press'
  },

  /* ==================== גב (BACK) ==================== */
  {
    id: 'deadlift',
    name: 'Deadlift (Barbell)',
    heName: 'דדליפט במוט',
    en: 'Deadlift (Barbell)',
    he: 'דדליפט במוט',
    muscle: 'back',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'deadlift'
  },
  {
    id: 'pull-up',
    name: 'Pull Up',
    heName: 'מתח באחיזה רחבה',
    en: 'Pull Up',
    he: 'מתח באחיזה רחבה',
    muscle: 'back',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'pullup'
  },
  {
    id: 'chin-up',
    name: 'Chin Up',
    heName: 'מתח באחיזה הפוכה',
    en: 'Chin Up',
    he: 'מתח באחיזה הפוכה',
    muscle: 'back',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'pullup'
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown (Cable)',
    heName: 'פולי עליון אחיזה רחבה',
    en: 'Lat Pulldown (Cable)',
    he: 'פולי עליון אחיזה רחבה',
    muscle: 'back',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'pulldown'
  },
  {
    id: 'close-grip-lat-pulldown',
    name: 'Close-Grip Lat Pulldown (V-Bar)',
    heName: 'פולי עליון אחיזה צרה / משולש',
    en: 'Close-Grip Lat Pulldown (V-Bar)',
    he: 'פולי עליון אחיזה צרה / משולש',
    muscle: 'back',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'pulldown'
  },
  {
    id: 'bent-over-row',
    name: 'Bent Over Row (Barbell)',
    heName: 'חתירה בהטיה במוט',
    en: 'Bent Over Row (Barbell)',
    he: 'חתירה בהטיה במוט',
    muscle: 'back',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'row'
  },
  {
    id: 'pendlay-row',
    name: 'Pendlay Row (Barbell)',
    heName: 'חתירת פנדליי במוט',
    en: 'Pendlay Row (Barbell)',
    he: 'חתירת פנדליי במוט',
    muscle: 'back',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'row'
  },
  {
    id: 'db-row',
    name: 'Single-Arm Row (Dumbbell)',
    heName: 'חתירה במשקולת יד אחת - מסור',
    en: 'Single-Arm Row (Dumbbell)',
    he: 'חתירה במשקולת יד אחת - מסור',
    muscle: 'back',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'row'
  },
  {
    id: 'cable-row',
    name: 'Seated Cable Row',
    heName: 'חתירה בישיבה בכבלים',
    en: 'Seated Cable Row',
    he: 'חתירה בישיבה בכבלים',
    muscle: 'back',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'row'
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    heName: 'חתירה במוט T',
    en: 'T-Bar Row',
    he: 'חתירה במוט T',
    muscle: 'back',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'row'
  },
  {
    id: 'seated-row',
    name: 'Chest-Supported Row (Machine)',
    heName: 'חתירה במכונה בתמיכת חזה',
    en: 'Chest-Supported Row (Machine)',
    he: 'חתירה במכונה בתמיכת חזה',
    muscle: 'back',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'row'
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Pulldown (Cable)',
    heName: 'פולאובר בעמידה בכבלים',
    en: 'Straight-Arm Pulldown (Cable)',
    he: 'פולאובר בעמידה בכבלים',
    muscle: 'back',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'pulldown'
  },
  {
    id: 'back-extension',
    name: 'Back Extension (Hyperextension)',
    heName: 'זוקפי גב בכיסא רומי',
    en: 'Back Extension (Hyperextension)',
    he: 'זוקפי גב בכיסא רומי',
    muscle: 'back',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'deadlift'
  },

  /* ==================== רגליים (LEGS) ==================== */
  {
    id: 'squat',
    name: 'Squat (Barbell)',
    heName: 'סקוואט במוט',
    en: 'Squat (Barbell)',
    he: 'סקוואט במוט',
    muscle: 'legs',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'squat'
  },
  {
    id: 'front-squat',
    name: 'Front Squat (Barbell)',
    heName: 'פרונט סקוואט במוט',
    en: 'Front Squat (Barbell)',
    he: 'פרונט סקוואט במוט',
    muscle: 'legs',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'squat'
  },
  {
    id: 'rdl',
    name: 'Romanian Deadlift (Barbell)',
    heName: 'דדליפט רומני במוט',
    en: 'Romanian Deadlift (Barbell)',
    he: 'דדליפט רומני במוט',
    muscle: 'legs',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'deadlift'
  },
  {
    id: 'rdl-dumbbell',
    name: 'Romanian Deadlift (Dumbbell)',
    heName: 'דדליפט רומני במשקולות',
    en: 'Romanian Deadlift (Dumbbell)',
    he: 'דדליפט רומני במשקולות',
    muscle: 'legs',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'deadlift'
  },
  {
    id: 'leg-press',
    name: 'Leg Press (Machine)',
    heName: 'לחיצת רגליים במכונה',
    en: 'Leg Press (Machine)',
    he: 'לחיצת רגליים במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-press'
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat (Machine)',
    heName: 'האק סקוואט במכונה',
    en: 'Hack Squat (Machine)',
    he: 'האק סקוואט במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-press'
  },
  {
    id: 'bulgarian-split',
    name: 'Bulgarian Split Squat (Dumbbell)',
    heName: 'סקוואט בולגרי במשקולות',
    en: 'Bulgarian Split Squat (Dumbbell)',
    he: 'סקוואט בולגרי במשקולות',
    muscle: 'legs',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'squat'
  },
  {
    id: 'lunge',
    name: 'Walking Lunge (Dumbbell)',
    heName: 'מכרעים בהליכה עם משקולות',
    en: 'Walking Lunge (Dumbbell)',
    he: 'מכרעים בהליכה עם משקולות',
    muscle: 'legs',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'squat'
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust (Barbell)',
    heName: 'היפ ת\'ראסט במוט',
    en: 'Hip Thrust (Barbell)',
    he: 'היפ ת\'ראסט במוט',
    muscle: 'legs',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'deadlift'
  },
  {
    id: 'lying-leg-curl',
    name: 'Lying Leg Curl (Machine)',
    heName: 'כפיפת ברכיים בשכיבה במכונה',
    en: 'Lying Leg Curl (Machine)',
    he: 'כפיפת ברכיים בשכיבה במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-curl'
  },
  {
    id: 'leg-curl',
    name: 'Seated Leg Curl (Machine)',
    heName: 'כפיפת ברכיים בישיבה במכונה',
    en: 'Seated Leg Curl (Machine)',
    he: 'כפיפת ברכיים בישיבה במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-curl'
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension (Machine)',
    heName: 'פשיטת ברכיים במכונה',
    en: 'Leg Extension (Machine)',
    he: 'פשיטת ברכיים במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-extension'
  },
  {
    id: 'hip-abduction',
    name: 'Hip Abduction (Machine)',
    heName: 'הרחקת ירכיים במכונה',
    en: 'Hip Abduction (Machine)',
    he: 'הרחקת ירכיים במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-press'
  },
  {
    id: 'hip-adduction',
    name: 'Hip Adduction (Machine)',
    heName: 'קירוב ירכיים במכונה',
    en: 'Hip Adduction (Machine)',
    he: 'קירוב ירכיים במכונה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'leg-press'
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise (Machine)',
    heName: 'הרמות תאומים בעמידה',
    en: 'Standing Calf Raise (Machine)',
    he: 'הרמות תאומים בעמידה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'calf-raise'
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise (Machine)',
    heName: 'הרמות תאומים בישיבה',
    en: 'Seated Calf Raise (Machine)',
    he: 'הרמות תאומים בישיבה',
    muscle: 'legs',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'calf-raise'
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat (Dumbbell)',
    heName: 'סקוואט גביע',
    en: 'Goblet Squat (Dumbbell)',
    he: 'סקוואט גביע',
    muscle: 'legs',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'squat'
  },
  {
    id: 'bw-squat',
    name: 'Bodyweight Squat',
    heName: 'סקוואט משקל גוף',
    en: 'Bodyweight Squat',
    he: 'סקוואט משקל גוף',
    muscle: 'legs',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'squat'
  },

  /* ==================== כתפיים (SHOULDERS) ==================== */
  {
    id: 'overhead-press',
    name: 'Overhead Press (Barbell)',
    heName: 'לחיצת כתפיים בעמידה במוט - מילטרי',
    en: 'Overhead Press (Barbell)',
    he: 'לחיצת כתפיים בעמידה במוט - מילטרי',
    muscle: 'shoulders',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'overhead-press'
  },
  {
    id: 'db-shoulder-press',
    name: 'Seated Shoulder Press (Dumbbell)',
    heName: 'לחיצת כתפיים בישיבה במשקולות',
    en: 'Seated Shoulder Press (Dumbbell)',
    he: 'לחיצת כתפיים בישיבה במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'overhead-press'
  },
  {
    id: 'shoulder-press-machine',
    name: 'Shoulder Press (Machine)',
    heName: 'לחיצת כתפיים במכונה',
    en: 'Shoulder Press (Machine)',
    he: 'לחיצת כתפיים במכונה',
    muscle: 'shoulders',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'overhead-press'
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press (Dumbbell)',
    heName: 'לחיצת ארנולד במשקולות',
    en: 'Arnold Press (Dumbbell)',
    he: 'לחיצת ארנולד במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'overhead-press'
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise (Dumbbell)',
    heName: 'הרחקת כתפיים לצדדים במשקולות',
    en: 'Lateral Raise (Dumbbell)',
    he: 'הרחקת כתפיים לצדדים במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'lateral-raise'
  },
  {
    id: 'cable-lateral',
    name: 'Lateral Raise (Cable)',
    heName: 'הרחקת כתפיים לצדדים בכבל',
    en: 'Lateral Raise (Cable)',
    he: 'הרחקת כתפיים לצדדים בכבל',
    muscle: 'shoulders',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'lateral-raise'
  },
  {
    id: 'machine-lateral',
    name: 'Lateral Raise (Machine)',
    heName: 'הרחקת כתפיים במכונה',
    en: 'Lateral Raise (Machine)',
    he: 'הרחקת כתפיים במכונה',
    muscle: 'shoulders',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'lateral-raise'
  },
  {
    id: 'front-raise',
    name: 'Front Raise (Dumbbell)',
    heName: 'כפיפת כתפיים לפנים במשקולות',
    en: 'Front Raise (Dumbbell)',
    he: 'כפיפת כתפיים לפנים במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'lateral-raise'
  },
  {
    id: 'face-pull',
    name: 'Face Pull (Cable)',
    heName: 'פייס פול בכבלים',
    en: 'Face Pull (Cable)',
    he: 'פייס פול בכבלים',
    muscle: 'shoulders',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'row'
  },
  {
    id: 'reverse-fly-machine',
    name: 'Reverse Fly / Rear Delt (Machine)',
    heName: 'פרפר הפוך לכתף אחורית במכונה',
    en: 'Reverse Fly / Rear Delt (Machine)',
    he: 'פרפר הפוך לכתף אחורית במכונה',
    muscle: 'shoulders',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'chest-fly'
  },
  {
    id: 'rear-delt-fly',
    name: 'Bent-Over Rear Delt Fly (Dumbbell)',
    heName: 'הרחקה אופקית לכתף אחורית במשקולות',
    en: 'Bent-Over Rear Delt Fly (Dumbbell)',
    he: 'הרחקה אופקית לכתף אחורית במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'lateral-raise'
  },
  {
    id: 'upright-row',
    name: 'Upright Row (Barbell)',
    heName: 'חתירה אנכית במוט / מוט לסנטר',
    en: 'Upright Row (Barbell)',
    he: 'חתירה אנכית במוט / מוט לסנטר',
    muscle: 'shoulders',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'row'
  },
  {
    id: 'shrug-barbell',
    name: 'Shrug (Barbell)',
    heName: 'שראגס לטרפזים במוט',
    en: 'Shrug (Barbell)',
    he: 'שראגס לטרפזים במוט',
    muscle: 'shoulders',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'deadlift'
  },
  {
    id: 'shrug-dumbbell',
    name: 'Shrug (Dumbbell)',
    heName: 'שראגס לטרפזים במשקולות',
    en: 'Shrug (Dumbbell)',
    he: 'שראגס לטרפזים במשקולות',
    muscle: 'shoulders',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'deadlift'
  },
  {
    id: 'pike-push-up',
    name: 'Pike Push Up',
    heName: 'שכיבות סמיכה בפייק',
    en: 'Pike Push Up',
    he: 'שכיבות סמיכה בפייק',
    muscle: 'shoulders',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'overhead-press'
  },

  /* ==================== יד קדמית (BICEPS) ==================== */
  {
    id: 'barbell-curl',
    name: 'Bicep Curl (Barbell)',
    heName: 'כפיפת מרפקים במוט ישר',
    en: 'Bicep Curl (Barbell)',
    he: 'כפיפת מרפקים במוט ישר',
    muscle: 'biceps',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'bicep-curl'
  },
  {
    id: 'ez-bar-curl',
    name: 'EZ-Bar Curl',
    heName: 'כפיפת מרפקים במוט W',
    en: 'EZ-Bar Curl',
    he: 'כפיפת מרפקים במוט W',
    muscle: 'biceps',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'bicep-curl'
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl (Dumbbell)',
    heName: 'כפיפת מרפקים במשקולות',
    en: 'Bicep Curl (Dumbbell)',
    he: 'כפיפת מרפקים במשקולות',
    muscle: 'biceps',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'bicep-curl'
  },
  {
    id: 'incline-db-curl',
    name: 'Incline Dumbbell Curl',
    heName: 'כפיפת מרפקים במשקולות בשיפוע חיובי',
    en: 'Incline Dumbbell Curl',
    he: 'כפיפת מרפקים במשקולות בשיפוע חיובי',
    muscle: 'biceps',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'bicep-curl'
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl (Dumbbell)',
    heName: 'כפיפת מרפקים פטישים במשקולות',
    en: 'Hammer Curl (Dumbbell)',
    he: 'כפיפת מרפקים פטישים במשקולות',
    muscle: 'biceps',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'hammer-curl'
  },
  {
    id: 'rope-hammer-curl',
    name: 'Rope Hammer Curl (Cable)',
    heName: 'כפיפת מרפקים פטישים בחבל בכבלים',
    en: 'Rope Hammer Curl (Cable)',
    he: 'כפיפת מרפקים פטישים בחבל בכבלים',
    muscle: 'biceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'hammer-curl'
  },
  {
    id: 'preacher-curl-ez',
    name: 'Preacher Curl (EZ-Bar)',
    heName: 'כפיפת מרפקים בכיסא כומר מוט W',
    en: 'Preacher Curl (EZ-Bar)',
    he: 'כפיפת מרפקים בכיסא כומר מוט W',
    muscle: 'biceps',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'preacher-curl'
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl (Machine)',
    heName: 'כפיפת מרפקים במכונה / כומר',
    en: 'Preacher Curl (Machine)',
    he: 'כפיפת מרפקים במכונה / כומר',
    muscle: 'biceps',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'preacher-curl'
  },
  {
    id: 'concentration-curl',
    name: 'Concentration Curl (Dumbbell)',
    heName: 'כפיפת מרפק מרוכזת במשקולת',
    en: 'Concentration Curl (Dumbbell)',
    he: 'כפיפת מרפק מרוכזת במשקולת',
    muscle: 'biceps',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'bicep-curl'
  },
  {
    id: 'cable-curl',
    name: 'Bicep Curl (Cable)',
    heName: 'כפיפת מרפקים בכבל תחתון',
    en: 'Bicep Curl (Cable)',
    he: 'כפיפת מרפקים בכבל תחתון',
    muscle: 'biceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'bicep-curl'
  },
  {
    id: 'bayesian-cable-curl',
    name: 'Bayesian Cable Curl',
    heName: 'כפיפת מרפקים בכבל מאחורי הגוף',
    en: 'Bayesian Cable Curl',
    he: 'כפיפת מרפקים בכבל מאחורי הגוף',
    muscle: 'biceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'bicep-curl'
  },

  /* ==================== יד אחורית (TRICEPS) ==================== */
  {
    id: 'tricep-pushdown',
    name: 'Triceps Rope Pushdown (Cable)',
    heName: 'פשיטת מרפקים בכבל עם חבל',
    en: 'Triceps Rope Pushdown (Cable)',
    he: 'פשיטת מרפקים בכבל עם חבל',
    muscle: 'triceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'tricep-pushdown'
  },
  {
    id: 'tricep-bar-pushdown',
    name: 'Triceps Bar Pushdown (Cable)',
    heName: 'פשיטת מרפקים בכבל עם מוט ישר/V',
    en: 'Triceps Bar Pushdown (Cable)',
    he: 'פשיטת מרפקים בכבל עם מוט ישר/V',
    muscle: 'triceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'tricep-pushdown'
  },
  {
    id: 'skullcrusher',
    name: 'Skullcrusher (EZ-Bar)',
    heName: 'לחיצה צרפתית / סקאלקראשר במוט W',
    en: 'Skullcrusher (EZ-Bar)',
    he: 'לחיצה צרפתית / סקאלקראשר במוט W',
    muscle: 'triceps',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'skullcrusher'
  },
  {
    id: 'overhead-tricep-cable',
    name: 'Overhead Triceps Extension (Cable)',
    heName: 'פשיטת מרפקים מעל הראש בכבל',
    en: 'Overhead Triceps Extension (Cable)',
    he: 'פשיטת מרפקים מעל הראש בכבל',
    muscle: 'triceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'overhead-tricep'
  },
  {
    id: 'overhead-tricep',
    name: 'Overhead Triceps Extension (Dumbbell)',
    heName: 'פשיטת מרפקים מעל הראש במשקולת',
    en: 'Overhead Triceps Extension (Dumbbell)',
    he: 'פשיטת מרפקים מעל הראש במשקולת',
    muscle: 'triceps',
    equipment: 'dumbbell',
    equip: 'משקולות יד',
    pose: 'overhead-tricep'
  },
  {
    id: 'close-grip-bench',
    name: 'Close-Grip Bench Press (Barbell)',
    heName: 'לחיצת חזה באחיזה צרה במוט',
    en: 'Close-Grip Bench Press (Barbell)',
    he: 'לחיצת חזה באחיזה צרה במוט',
    muscle: 'triceps',
    equipment: 'barbell',
    equip: 'מוט',
    pose: 'bench-press'
  },
  {
    id: 'dips',
    name: 'Triceps Dip',
    heName: 'מקבילים ליד אחורית',
    en: 'Triceps Dip',
    he: 'מקבילים ליד אחורית',
    muscle: 'triceps',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'dips'
  },
  {
    id: 'dip-machine',
    name: 'Dip Machine (Seated)',
    heName: 'לחיצת מקבילים בישיבה במכונה',
    en: 'Dip Machine (Seated)',
    he: 'לחיצת מקבילים בישיבה במכונה',
    muscle: 'triceps',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'dips'
  },
  {
    id: 'tricep-kickback-cable',
    name: 'Single-Arm Cable Kickback',
    heName: 'פשיטת מרפק לאחור בכבל יד אחת',
    en: 'Single-Arm Cable Kickback',
    he: 'פשיטת מרפק לאחור בכבל יד אחת',
    muscle: 'triceps',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'tricep-pushdown'
  },

  /* ==================== בטן (CORE / ABS) ==================== */
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    heName: 'הרמת רגליים בתלייה',
    en: 'Hanging Leg Raise',
    he: 'הרמת רגליים בתלייה',
    muscle: 'core',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'core'
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    heName: 'כפיפות בטן בכבל עליון',
    en: 'Cable Crunch',
    he: 'כפיפות בטן בכבל עליון',
    muscle: 'core',
    equipment: 'cable',
    equip: 'כבלים',
    pose: 'core'
  },
  {
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    heName: 'גלגל בטן',
    en: 'Ab Wheel Rollout',
    he: 'גלגל בטן',
    muscle: 'core',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'core'
  },
  {
    id: 'plank',
    name: 'Plank',
    heName: 'פלאנק סטטי',
    en: 'Plank',
    he: 'פלאנק סטטי',
    muscle: 'core',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'core'
  },
  {
    id: 'ab-machine',
    name: 'Crunch (Machine)',
    heName: 'כפיפות בטן במכונה',
    en: 'Crunch (Machine)',
    he: 'כפיפות בטן במכונה',
    muscle: 'core',
    equipment: 'machine',
    equip: 'מכונה',
    pose: 'core'
  },
  {
    id: 'crunch',
    name: 'Floor Crunch',
    heName: 'כפיפות בטן על הרצפה',
    en: 'Floor Crunch',
    he: 'כפיפות בטן על הרצפה',
    muscle: 'core',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'core'
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    heName: 'רוסיאן טוויסט',
    en: 'Russian Twist',
    he: 'רוסיאן טוויסט',
    muscle: 'core',
    equipment: 'bodyweight',
    equip: 'משקל גוף',
    pose: 'core'
  }
];
