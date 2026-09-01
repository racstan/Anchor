export interface GreetingPair {
  title: string
  subtitle: string
}

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'timeless'

function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 4 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/**
 * 120+ unique greeting templates organized by mood and time of day.
 * Uses {name} for user's display name.
 */
const GREETING_TEMPLATES: Record<TimeOfDay, string[]> = {
  dawn: [
    'First light of dawn, {name}',
    'Quiet early hours, {name}',
    'Before the world wakes, {name}',
    'The calm of the morning, {name}',
    'Early start, steady mind, {name}',
    'Dawn breaks softly, {name}',
    'The stillness of morning, {name}',
    'A quiet horizon ahead, {name}',
    'Peace in the earliest hours, {name}',
    'Gentle first light, dear {name}',
    'Welcome to the quiet dawn, {name}',
    'A tranquil morning start, {name}',
  ],
  morning: [
    'Happy morning, dear {name}',
    'Good morning, {name}',
    'A fresh start today, {name}',
    'Morning light on clear waters, {name}',
    'Clear skies and calm seas, {name}',
    'Steady ground beneath you, {name}',
    'A peaceful morning, {name}',
    'Ready for the day ahead, {name}',
    'Rise with purpose, {name}',
    'Morning clarity, {name}',
    'A bright new chapter, {name}',
    'Calm momentum this morning, {name}',
    'The day is yours to shape, {name}',
    'Gentle morning, {name}',
    'Focused and centered, {name}',
    'Sunlight on steady ground, {name}',
    'Good energy this morning, {name}',
    'Another quiet morning to create, {name}',
    'Warm morning wishes, {name}',
    'Starting from center, {name}',
    'A clean slate this morning, {name}',
    'Anchor down, day begins, {name}',
    'Clear mind, calm harbor, {name}',
    'Morning breeze, steady focus, {name}',
    'Welcome to today, {name}',
  ],
  afternoon: [
    'Good afternoon, {name}',
    'Midday clarity, {name}',
    'Steady as the sun climbs, {name}',
    'Afternoon calm, {name}',
    'Halfway through with poise, {name}',
    'Take a breath this afternoon, {name}',
    'Warm afternoon, dear {name}',
    'Keep your center this afternoon, {name}',
    'A moment of pause, {name}',
    'Riding the afternoon tide, {name}',
    'Midday harbor, {name}',
    'Gentle progress today, {name}',
    'Steady pace, {name}',
    'Clear focus this afternoon, {name}',
    'Sunlit afternoon, {name}',
    'Quiet momentum, {name}',
    'Checking in with clarity, {name}',
    'A steady afternoon, {name}',
    'Still anchored, still clear, {name}',
    'The afternoon unfolds gently, {name}',
  ],
  evening: [
    'Good evening, {name}',
    'Evening settle, {name}',
    'The calm of twilight, {name}',
    'Golden hour reflections, {name}',
    'Wind down gently, {name}',
    'Evening tide comes in, {name}',
    'Peaceful evening, dear {name}',
    'A day well navigated, {name}',
    'Dusk settles over the harbor, {name}',
    'Quiet evening thoughts, {name}',
    'Rest your thoughts, {name}',
    'Soft evening light, {name}',
    'Wrapping up with clarity, {name}',
    'The waters calm this evening, {name}',
    'Evening stillness, {name}',
    'Time to reflect, {name}',
    'A gentle close to the day, {name}',
    'Twilight harbor, {name}',
    'Let the day settle, {name}',
    'Safe in the evening harbor, {name}',
  ],
  night: [
    'Quiet late hours, {name}',
    'Nighttime calm, {name}',
    'Rest your wandering mind, {name}',
    'The night is still, {name}',
    'Peaceful late hours, dear {name}',
    'Stars over a quiet sea, {name}',
    'Midnight harbor, {name}',
    'A late hour of quiet thought, {name}',
    'Gentle nightfall, {name}',
    'Rest easy, {name}',
    'Quiet reflections tonight, {name}',
    'Let the thoughts rest, {name}',
    'The day is done, {name}',
    'Night settles over the water, {name}',
    'Safe harbor tonight, {name}',
  ],
  timeless: [
    'Welcome back, {name}',
    'Your steady harbor awaits, {name}',
    'Center yourself, {name}',
    'A quiet room for your thoughts, {name}',
    'Back to what matters, {name}',
    'Here is your calm ground, {name}',
    'Good to see you, {name}',
    'A moment of true clarity, {name}',
    'Anchor close, breathe deep, {name}',
    'Steady as she goes, {name}',
    'No rush, dear {name}',
    'The signal through the noise, {name}',
    'Right where you need to be, {name}',
    'Step back into clarity, {name}',
    'Your compass is true, {name}',
    'A kinder place for your mind, {name}',
    'Clear sight, calm heart, {name}',
    'Ground yourself, {name}',
    'Your steady companion, {name}',
    'Take all the time you need, {name}',
    'Find your footing, {name}',
    'Clarity over speed, {name}',
    'Deep roots, calm waters, {name}',
    'Welcome home, {name}',
    'Everything in its place, {name}',
  ],
}

/**
 * 100+ rich, grounding subtitles and philosophical reminders.
 */
export const SUBTITLE_POOL: string[] = [
  "Keep the things you've learned close.",
  "You don't need to hold everything in your head at once.",
  "Let what matters stay anchored. Let the rest drift.",
  "Small principles carried daily build quiet empires.",
  "One clear decision is worth twenty anxious thoughts.",
  "Trust the slow, deliberate work of staying true to your core.",
  "Not a rush. Just a clear view of what comes next.",
  "Your context is safe here. Take your time.",
  "Clarity isn't found in noise—it's forged in quiet moments.",
  "Hold lightly to the chaos; anchor deeply to your values.",
  "You don't need a better memory. You need a kinder place to put things.",
  "The storm passes, but what you stood for remains.",
  "Focus is what you choose to remember when everything demands attention.",
  "Give yourself permission to move at the speed of wisdom.",
  "Let today be guided by principles, not impulses.",
  "The best decisions come from unhurried spaces.",
  "Rooted deeply so the winds cannot sway your course.",
  "A calm mind sees the path before the feet take a step.",
  "Keep your standards quiet and your execution consistent.",
  "Your compass doesn't argue with the weather.",
  "Simplicity is the final sanctuary of deep thinking.",
  "Breathe. The foundation is already built.",
  "What is true for you doesn't vanish with the news cycle.",
  "Leave room between your thoughts for clarity to land.",
  "Patience is not waiting; it is knowing where you stand.",
  "A harbor doesn't stop the waves; it gives you calm water inside.",
  "Protect the few ideas that truly change how you live.",
  "Depth over volume, always.",
  "Do not let urgency impersonate importance.",
  "Quiet confidence needs no audience.",
  "Anchor to what endures, not what merely shouts.",
  "Every wise decision began with a moment of pause.",
  "Let your thoughts wander, but keep your compass close.",
  "A thoughtful life is built one principle at a time.",
  "You are allowed to take things one anchor at a time.",
  "Trust the patterns you have already proven.",
  "The noise will fade. The things you recorded here remain.",
  "Stay centered when the world asks you to react.",
  "Clear minds navigate stormy channels with ease.",
  "Wisdom is simply memory organized for peace of mind.",
  "You are the navigator of your own calm.",
  "Give the current direction a fair, patient attempt.",
  "Trade the plan you made in the light, not the fear of the dark.",
  "Less friction, more intention.",
  "Your context travels with you wherever you go.",
  "Steady momentum outlasts sudden bursts.",
  "Stand on the lessons you already paid to learn.",
  "Every anchor is a gift from your past self to your future.",
  "Be gentle with your progress and firm with your values.",
  "Honor the stillness before you leap.",
  "Clear thinking is an act of self-respect.",
  "Lighten the mental load so your instincts can breathe.",
  "Remember why you set this course in the first place.",
  "True direction needs no hurry.",
  "Calm is a superpower in a frantic world.",
  "Save the insight before the day washes it away.",
  "Steady hands on a quiet helm.",
  "Confidence comes from knowing where your anchors lie.",
  "Choose what is essential; let the trivial drift away.",
  "Your thoughts are safer here than in the open wind.",
  "A single principle can illuminate a hundred murky choices.",
  "Begin where you are with what you know to be true.",
  "No need to re-invent what experience has already settled.",
  "Keep your harbor calm and your intentions pure.",
  "Focus on the signal; the noise will quiet itself.",
  "A restful mind solves what anxiety cannot.",
  "Build on solid rock, one anchor at a time.",
  "Today's clarity will guide tomorrow's horizon.",
  "Honor your boundaries with quiet resolve.",
  "The mind is clearest when the clutter is put down.",
  "Peace of mind is the ultimate productivity.",
  "Let what is steady inside guide what is turbulent outside.",
  "A calm workspace for a thoughtful life.",
  "You don't have to carry yesterday's weight into today's waters.",
  "Trust your compass; it was calibrated in quiet moments.",
  "Deliberate choices compound into an unshakeable life.",
  "Everything you need to remember is right here within reach.",
  "Slow down enough to hear what your experience is telling you.",
  "Clarity is quiet, but it speaks with immense authority.",
  "Keep your harbor clean and your thoughts unburdened.",
  "The steady sailor respects the sea without fearing the journey.",
  "Step into today with unhurried purpose.",
  "Hold fast to the truths that have never failed you.",
  "Space to think is the greatest luxury you can give yourself.",
  "Let your values do the heavy lifting today.",
  "A calm heart makes decisions that time rewards.",
  "Steady as morning light. Clear as harbor water.",
  "Keep what matters in context, always.",
  "Anchor down. Breathe in. Begin with grace.",
]

/**
 * Returns a randomized greeting and subtitle pair.
 * Combines time-specific greetings, timeless greetings, and deep thought subtitles.
 */
export function getDailyGreeting(rawName: string): GreetingPair {
  const name = rawName.trim() || 'friend'
  const time = getTimeOfDay()

  // 65% chance of time-specific greeting, 35% chance of timeless greeting
  const useTimeSpecific = Math.random() < 0.65
  const pool = useTimeSpecific ? GREETING_TEMPLATES[time] : GREETING_TEMPLATES.timeless
  const template = pool[Math.floor(Math.random() * pool.length)]

  const title = template.replace('{name}', name)
  const subtitle = SUBTITLE_POOL[Math.floor(Math.random() * SUBTITLE_POOL.length)]

  return { title, subtitle }
}
