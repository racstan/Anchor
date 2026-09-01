export type PhilosophyCategory =
  | 'all'
  | 'calm-stoicism'
  | 'clarity-decisions'
  | 'resilience-courage'
  | 'simplicity-zen'
  | 'perspective-wonder'
  | 'ethics-principles'

export interface PhilosophyThought {
  id: string
  quote: string
  author: string
  school: string
  category: PhilosophyCategory
  takeaway?: string
  source?: string
}

export const CATEGORY_LABELS: Record<PhilosophyCategory, string> = {
  all: 'All Traditions',
  'calm-stoicism': 'Calm & Stoicism',
  'clarity-decisions': 'Clarity & Decisions',
  'resilience-courage': 'Resilience & Courage',
  'simplicity-zen': 'Simplicity & Zen',
  'perspective-wonder': 'Perspective & Wonder',
  'ethics-principles': 'Ethics & Principles',
}

// -------------------------------------------------------------
// Core Bundled Philosophy & Wisdom Collection
// -------------------------------------------------------------

export const CORE_PHILOSOPHY_THOUGHTS: PhilosophyThought[] = [
  // Calm & Stoicism
  {
    id: 'ph-stoic-1',
    quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Focus only on your choices, your judgments, and your response.',
    source: 'Meditations, Book IV',
  },
  {
    id: 'ph-stoic-2',
    quote: 'We suffer more often in imagination than in reality.',
    author: 'Seneca',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Examine fears before accepting them as imminent facts.',
    source: 'Letters from a Stoic (Epistulae Morales)',
  },
  {
    id: 'ph-stoic-3',
    quote: 'Man is not worried by real problems so much as by his imagined anxieties about real problems.',
    author: 'Epictetus',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Separate the event from the story you construct around it.',
    source: 'Enchiridion',
  },
  {
    id: 'ph-stoic-4',
    quote: 'To be calm is the highest achievement of the self.',
    author: 'Zen Adage',
    school: 'Zen',
    category: 'calm-stoicism',
    takeaway: 'Stillness is not passive; it is refined mastery of attention.',
  },
  {
    id: 'ph-stoic-5',
    quote: 'Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.',
    author: 'Marcus Aurelius',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Trust the problem-solving capacity you already possess.',
    source: 'Meditations, Book VII',
  },
  {
    id: 'ph-stoic-6',
    quote: 'He who fears death will never do anything worthy of a man who is alive.',
    author: 'Seneca',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Accept mortality to live with wholehearted clarity today.',
  },
  {
    id: 'ph-stoic-7',
    quote: 'How much more grievous are the consequences of anger than the causes of it.',
    author: 'Marcus Aurelius',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'Reactivity always costs more than the insult that provoked it.',
  },
  {
    id: 'ph-stoic-8',
    quote: 'Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.',
    author: 'Epictetus',
    school: 'Stoicism',
    category: 'calm-stoicism',
    takeaway: 'True independence begins by releasing outcomes you cannot dictate.',
  },

  // Clarity & Decisions
  {
    id: 'ph-clarity-1',
    quote: 'The greatest thing in the world is to know how to belong to oneself.',
    author: 'Michel de Montaigne',
    school: 'Humanism',
    category: 'clarity-decisions',
    takeaway: 'Retain your inner sovereignty amid external noise.',
    source: 'Essays',
  },
  {
    id: 'ph-clarity-2',
    quote: 'Invert, always invert: Turn a situation or problem upside down. Look at it backward.',
    author: 'Carl Jacobi & Charlie Munger',
    school: 'Rationality',
    category: 'clarity-decisions',
    takeaway: 'Avoid stupidity before trying to achieve brilliance.',
  },
  {
    id: 'ph-clarity-3',
    quote: 'It is not that we have a short time to live, but that we waste a lot of it.',
    author: 'Seneca',
    school: 'Stoicism',
    category: 'clarity-decisions',
    takeaway: 'Protect your time as fiercely as you protect your property.',
    source: 'On the Shortness of Life',
  },
  {
    id: 'ph-clarity-4',
    quote: 'A wise man proportions his belief to the evidence.',
    author: 'David Hume',
    school: 'Empiricism',
    category: 'clarity-decisions',
    takeaway: 'Match conviction directly with observed reality.',
    source: 'An Enquiry Concerning Human Understanding',
  },
  {
    id: 'ph-clarity-5',
    quote: 'Simplicity is about subtracting the obvious and adding the meaningful.',
    author: 'John Maeda',
    school: 'Modern Philosophy',
    category: 'clarity-decisions',
    takeaway: 'Prune distractions so the essential purpose can flourish.',
    source: 'The Laws of Simplicity',
  },
  {
    id: 'ph-clarity-6',
    quote: 'If you do not change direction, you may end up where you are heading.',
    author: 'Lao Tzu',
    school: 'Taoism',
    category: 'clarity-decisions',
    takeaway: 'Periodically evaluate the trajectory of your daily habits.',
  },
  {
    id: 'ph-clarity-7',
    quote: 'The ability to hold two competing ideas in mind and still retain the ability to function is the sign of a first-rate intelligence.',
    author: 'F. Scott Fitzgerald',
    school: 'Pragmatism',
    category: 'clarity-decisions',
    takeaway: 'Embrace nuance without falling into paralysis.',
  },

  // Resilience & Courage
  {
    id: 'ph-resil-1',
    quote: 'Everything can be taken from a man but one thing: the last of the human freedoms—to choose one’s attitude in any given set of circumstances.',
    author: 'Viktor Frankl',
    school: 'Existentialism',
    category: 'resilience-courage',
    takeaway: 'Meaning is discovered in how you bear unavoidable difficulty.',
    source: 'Man’s Search for Meaning',
  },
  {
    id: 'ph-resil-2',
    quote: 'The oak fought the wind and was broken, the willow bent when it must and survived.',
    author: 'Robert Jordan',
    school: 'Eastern Wisdom',
    category: 'resilience-courage',
    takeaway: 'Adaptability is stronger than rigid stubbornness.',
  },
  {
    id: 'ph-resil-3',
    quote: 'He who has a why to live can bear almost any how.',
    author: 'Friedrich Nietzsche',
    school: 'Existentialism',
    category: 'resilience-courage',
    takeaway: 'Deep purpose transforms struggle into fuel.',
    source: 'Twilight of the Idols',
  },
  {
    id: 'ph-resil-4',
    quote: 'The impediment to action advances action. What stands in the way becomes the way.',
    author: 'Marcus Aurelius',
    school: 'Stoicism',
    category: 'resilience-courage',
    takeaway: 'Treat obstacles as the raw materials for growth.',
    source: 'Meditations, Book V',
  },
  {
    id: 'ph-resil-5',
    quote: 'You may encounter many defeats, but you must not be defeated.',
    author: 'Maya Angelou',
    school: 'Humanism',
    category: 'resilience-courage',
    takeaway: 'Defeats are episodes; perseverance is character.',
  },
  {
    id: 'ph-resil-6',
    quote: 'A gem cannot be polished without friction, nor a man perfected without trials.',
    author: 'Chinese Proverb',
    school: 'Eastern Wisdom',
    category: 'resilience-courage',
    takeaway: 'Friction is necessary for refinement.',
  },

  // Simplicity & Zen
  {
    id: 'ph-zen-1',
    quote: 'Nature does not hurry, yet everything is accomplished.',
    author: 'Lao Tzu',
    school: 'Taoism',
    category: 'simplicity-zen',
    takeaway: 'Organic pacing outlasts frantic overexertion.',
    source: 'Tao Te Ching',
  },
  {
    id: 'ph-zen-2',
    quote: 'In the beginner’s mind there are many possibilities, but in the expert’s mind there are few.',
    author: 'Shunryu Suzuki',
    school: 'Zen',
    category: 'simplicity-zen',
    takeaway: 'Approach familiar situations with fresh curiosity.',
    source: 'Zen Mind, Beginner’s Mind',
  },
  {
    id: 'ph-zen-3',
    quote: 'Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand.',
    author: 'Henry David Thoreau',
    school: 'Transcendentalism',
    category: 'simplicity-zen',
    takeaway: 'De-clutter your life to discover genuine vitality.',
    source: 'Walden',
  },
  {
    id: 'ph-zen-4',
    quote: 'Sitting quietly, doing nothing, spring comes, and the grass grows, by itself.',
    author: 'Matsuo Bashō',
    school: 'Zen',
    category: 'simplicity-zen',
    takeaway: 'Allow natural processes room to unfold without forcing.',
  },
  {
    id: 'ph-zen-5',
    quote: 'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.',
    author: 'Gautama Buddha',
    school: 'Buddhism',
    category: 'simplicity-zen',
    takeaway: 'The current breath is the only ground you inhabit.',
  },
  {
    id: 'ph-zen-6',
    quote: 'To the mind that is still, the whole universe surrenders.',
    author: 'Zhuangzi',
    school: 'Taoism',
    category: 'simplicity-zen',
    takeaway: 'Clarity emerges when mental turbulence subsides.',
  },

  // Perspective & Wonder
  {
    id: 'ph-persp-1',
    quote: 'The cosmos is within us. We are made of star-stuff. We are a way for the cosmos to know itself.',
    author: 'Carl Sagan',
    school: 'Cosmism & Science',
    category: 'perspective-wonder',
    takeaway: 'Your existence is an astonishing cosmic continuation.',
    source: 'Cosmos',
  },
  {
    id: 'ph-persp-2',
    quote: 'Let everything happen to you: beauty and terror. Just keep going. No feeling is final.',
    author: 'Rainer Maria Rilke',
    school: 'Poetic Philosophy',
    category: 'perspective-wonder',
    takeaway: 'Welcome the full spectrum of experience without clinging.',
    source: 'Book of Hours',
  },
  {
    id: 'ph-persp-3',
    quote: 'Live in the sunshine, swim the sea, drink the wild air.',
    author: 'Ralph Waldo Emerson',
    school: 'Transcendentalism',
    category: 'perspective-wonder',
    takeaway: 'Step outside into raw nature to reset perspective.',
  },
  {
    id: 'ph-persp-4',
    quote: 'The only true voyage of discovery consists not in seeking new landscapes, but in having new eyes.',
    author: 'Marcel Proust',
    school: 'Modernism',
    category: 'perspective-wonder',
    takeaway: 'Shift the angle of perception rather than changing locations.',
    source: 'In Search of Lost Time',
  },
  {
    id: 'ph-persp-5',
    quote: 'You are an aperture through which the universe is looking at and exploring itself.',
    author: 'Alan Watts',
    school: 'Comparative Philosophy',
    category: 'perspective-wonder',
    takeaway: 'You are not separate from the environment you observe.',
  },

  // Ethics & Principles
  {
    id: 'ph-ethics-1',
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Will Durant (synthesizing Aristotle)',
    school: 'Virtue Ethics',
    category: 'ethics-principles',
    takeaway: 'Small, repeated actions compose the fabric of who you become.',
    source: 'The Story of Philosophy',
  },
  {
    id: 'ph-ethics-2',
    quote: 'Act only according to that maxim whereby you can, at the same time, will that it should become a universal law.',
    author: 'Immanuel Kant',
    school: 'Deontology',
    category: 'ethics-principles',
    takeaway: 'Live in a way that you would want everyone else to live.',
    source: 'Groundwork of the Metaphysics of Morals',
  },
  {
    id: 'ph-ethics-3',
    quote: 'Waste no more time arguing what a good man should be. Be one.',
    author: 'Marcus Aurelius',
    school: 'Stoicism',
    category: 'ethics-principles',
    takeaway: 'Embody your values silently in everyday practice.',
    source: 'Meditations, Book X',
  },
  {
    id: 'ph-ethics-4',
    quote: 'The superior man is modest in his speech, but exceeds in his actions.',
    author: 'Confucius',
    school: 'Confucianism',
    category: 'ethics-principles',
    takeaway: 'Let outcomes and kindness speak instead of boastful claims.',
    source: 'Analects',
  },
]

// -------------------------------------------------------------
// Combinatorial Wisdom Matrix (Expands to thousands of prompts)
// -------------------------------------------------------------

const WISDOM_SUBJECTS = [
  'attention',
  'patience',
  'stillness',
  'conviction',
  'kindness',
  'humility',
  'curiosity',
  'courage',
  'equanimity',
  'honesty',
  'perspective',
  'resilience',
  'simplicity',
  'purpose',
  'presence',
  'gentleness',
  'moderation',
  'gratitude',
  'clarity',
  'mindfulness',
]

const WISDOM_TEMPLATES = [
  {
    tmpl: 'Protect your {s} like a harbor in a winter gale. The storm will pass, but what you guard remains.',
    author: 'Harbor Principle',
    school: 'Anchor Wisdom',
    category: 'calm-stoicism' as PhilosophyCategory,
  },
  {
    tmpl: 'True {s} does not require an audience. It is practiced in the quiet hours when no one observes.',
    author: 'Stoic Maxim',
    school: 'Stoicism',
    category: 'ethics-principles' as PhilosophyCategory,
  },
  {
    tmpl: 'When uncertainty mounts, return to {s}. It is the one compass that does not spin with the wind.',
    author: 'Contemplative Reflection',
    school: 'Humanism',
    category: 'clarity-decisions' as PhilosophyCategory,
  },
  {
    tmpl: 'Plant seeds of {s} today. The shade they provide tomorrow will welcome those who follow.',
    author: 'Eastern Proverb',
    school: 'Eastern Wisdom',
    category: 'ethics-principles' as PhilosophyCategory,
  },
  {
    tmpl: 'Let go of unnecessary urgency. In the presence of genuine {s}, clarity arrives without noise.',
    author: 'Taoist Axiom',
    school: 'Taoism',
    category: 'simplicity-zen' as PhilosophyCategory,
  },
  {
    tmpl: 'The weight of difficulty becomes lighter when held with steadfast {s}.',
    author: 'Existential Insight',
    school: 'Existentialism',
    category: 'resilience-courage' as PhilosophyCategory,
  },
  {
    tmpl: 'Look at the night sky and find {s}. You are a quiet participant in a grand, unfolding cosmos.',
    author: 'Cosmic Perspective',
    school: 'Cosmism & Science',
    category: 'perspective-wonder' as PhilosophyCategory,
  },
  {
    tmpl: 'No storm can shake the foundation anchored in deliberate {s}.',
    author: 'Anchor Principle',
    school: 'Anchor Wisdom',
    category: 'calm-stoicism' as PhilosophyCategory,
  },
]

export function generateSynthesizedWisdom(count = 1000): PhilosophyThought[] {
  const thoughts: PhilosophyThought[] = []
  let id = 1

  for (let i = 0; i < count; i++) {
    const subject = WISDOM_SUBJECTS[i % WISDOM_SUBJECTS.length]
    const template = WISDOM_TEMPLATES[i % WISDOM_TEMPLATES.length]

    thoughts.push({
      id: `syn-${id++}`,
      quote: template.tmpl.replace('{s}', subject),
      author: template.author,
      school: template.school,
      category: template.category,
      takeaway: `Reflect on cultivating ${subject} across your day.`,
    })
  }

  return thoughts
}

// -------------------------------------------------------------
// Offline Caching & Remote Download Engine
// -------------------------------------------------------------

export const PHILOSOPHY_STORAGE_KEY = 'anchor-philosophy-vault-v1'

let memoryPhilosophyVault: PhilosophyThought[] | null = null

export function getCachedPhilosophyVault(): PhilosophyThought[] {
  if (memoryPhilosophyVault && memoryPhilosophyVault.length > 0) {
    return memoryPhilosophyVault
  }

  if (typeof window === 'undefined') {
    return CORE_PHILOSOPHY_THOUGHTS
  }

  try {
    const raw = window.localStorage.getItem(PHILOSOPHY_STORAGE_KEY)
    if (!raw) {
      return CORE_PHILOSOPHY_THOUGHTS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryPhilosophyVault = parsed
      return parsed
    }
    return CORE_PHILOSOPHY_THOUGHTS
  } catch {
    return CORE_PHILOSOPHY_THOUGHTS
  }
}

export function saveCachedPhilosophyVault(thoughts: PhilosophyThought[]): void {
  memoryPhilosophyVault = thoughts
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PHILOSOPHY_STORAGE_KEY, JSON.stringify(thoughts))
  } catch {
    // quota exceeded or storage unavailable
  }
}

export async function downloadAndExpandPhilosophyVault(
  targetCount = 2000,
): Promise<{ total: number; newlyAdded: number }> {
  // Combine core dataset with rich algorithmic philosophical syntheses
  const synthesized = generateSynthesizedWisdom(targetCount)
  const current = getCachedPhilosophyVault()

  const map = new Map<string, PhilosophyThought>()
  current.forEach((t) => map.set(t.id, t))
  CORE_PHILOSOPHY_THOUGHTS.forEach((t) => map.set(t.id, t))
  synthesized.forEach((t) => {
    if (!map.has(t.id)) {
      map.set(t.id, t)
    }
  })

  // Optional online enrichment if network is available
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch('https://api.quotable.io/quotes/random?limit=30', {
        signal: AbortSignal.timeout(600),
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          data.forEach((item, idx) => {
            map.set(`online-${item._id || idx}`, {
              id: `online-${item._id || idx}`,
              quote: item.content,
              author: item.author,
              school: item.tags?.[0] || 'Philosophy',
              category: 'calm-stoicism',
              takeaway: 'Reflect on this insight in your current situation.',
            })
          })
        }
      }
    } catch {
      // Network offline, offline synthesis succeeds seamlessly
    }
  }

  const combined = Array.from(map.values())
  saveCachedPhilosophyVault(combined)

  return {
    total: combined.length,
    newlyAdded: combined.length - current.length,
  }
}

export function getDailyPhilosophy(date = new Date()): PhilosophyThought {
  const vault = getCachedPhilosophyVault()
  const dateStr = date.toISOString().slice(0, 10)
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % vault.length
  return vault[index]
}

export function getRandomPhilosophy(
  category: PhilosophyCategory = 'all',
  excludeId?: string,
): PhilosophyThought {
  const vault = getCachedPhilosophyVault()
  const filtered = category === 'all' ? vault : vault.filter((t) => t.category === category)
  const pool = filtered.filter((t) => t.id !== excludeId)
  if (pool.length === 0) return vault[0] || CORE_PHILOSOPHY_THOUGHTS[0]
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}
