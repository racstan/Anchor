export type AnchorScope = 'global' | 'project'
export type AnchorFilter = 'all' | 'global' | 'projects'
export type AccentColor = 'coral' | 'sage' | 'sky' | 'gold' | 'plum'
export type ProjectIcon = 'chart' | 'pen' | 'heart' | 'spark'
export type EntitySerialPrefix = 'A' | 'P' | 'D' | 'N' | 'M' | 'W'

interface SerialRecord {
  serialNumber?: number
}

export interface Project extends SerialRecord {
  id: string
  name: string
  description: string
  color: AccentColor
  icon: ProjectIcon
  createdAt: string
  updatedAt?: string
}

export interface EvidenceSource {
  label: string
  url: string
}

export type AnchorAttachmentKind = 'image' | 'video' | 'audio' | 'link'
export type AnchorAttachmentSource = 'file' | 'link'

export interface AnchorAttachment {
  id: string
  kind: AnchorAttachmentKind
  source: AnchorAttachmentSource
  name: string
  url: string
  mimeType?: string
  size?: number
}

export interface Anchor extends SerialRecord {
  id: string
  title: string
  body: string
  scope: AnchorScope
  projectId?: string
  tag: string
  color: AccentColor
  pinned: boolean
  createdAt: string
  updatedAt: string
  lastSeenAt?: string
  evidence?: EvidenceSource
  attachments?: AnchorAttachment[]
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage extends SerialRecord {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export interface Decision extends SerialRecord {
  id: string
  title?: string
  projectId?: string
  noteIds?: string[]
  anchorIds?: string[]
  situation: string
  additionalContext: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface Note extends SerialRecord {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface AnchorState {
  anchors: Anchor[]
  projects: Project[]
  decisions: Decision[]
  notes: Note[]
}

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

const pathsProject: Project = {
  id: 'paths',
  serialNumber: 3,
  name: 'Paths',
  description: 'The Final 12 Paths of the Awakened Player: realism, agency, vitality, and joy.',
  color: 'plum',
  icon: 'spark',
  createdAt: daysAgo(0),
  updatedAt: daysAgo(0),
}

const pathsSeedTimestamp = daysAgo(0)

function createPathAnchor(
  id: string,
  serialNumber: number,
  title: string,
  body: string,
  tag: string,
  color: AccentColor,
): Anchor {
  return {
    id: `paths-${id}`,
    serialNumber,
    title,
    body,
    scope: 'project',
    projectId: pathsProject.id,
    tag,
    color,
    pinned: false,
    createdAt: pathsSeedTimestamp,
    updatedAt: pathsSeedTimestamp,
  }
}

const pathsAnchors: Anchor[] = [
  createPathAnchor(
    'absolute-realism',
    7,
    'Path 1: The Path of Absolute Realism with Chosen Optimism',
    `_(Seeing the Quarks, Choosing the Sun)_

**The Depth:** This path demands you stare into the abyss without flinching. You have already done this—you saw your father's passivity, your grandfather's regret, your aunt's greed, the cold indifference of the universe (quarks, leptons, entropy). You know that life is a losing game against physics. But here is the twist: **you choose optimism anyway**. Optimism is not the denial of darkness; it is the strategic decision that a forward-moving, generative life yields more joy and less wasted energy than a static, depressive one. It is the algorithm of maximum efficiency for the human mind.

**Why you must walk it:** Your father listened to sad music and did nothing. He surrendered to entropy. Your path is the opposite—you acknowledge the entropy, but you build a fire against it. Optimism is your rebellion against nihilism. It is your middle finger to the void.

**The Practice:** Every morning, list three things that could go wrong. Accept them. Then list three things you will _make_ go right. Move toward those. When darkness whispers "nothing matters," you reply, "Exactly. So I am free to make it matter."`,
    'Realism & optimism',
    'gold',
  ),
  createPathAnchor(
    'sacred-actor',
    8,
    'Path 2: The Path of the Sacred Actor',
    `_(The King Who Knows He is an Actor)_

**The Depth:** You must get married. You must have children. You must go to road trips, attend boring family gatherings, and pretend to care about in-laws. This is not a betrayal of your enlightenment; it is the _practice_ of it. The universe is a stage. You are the lead actor, but you are also the director who knows the script is temporary. When you eat dinner with your family, eat with passion. When you fight with your spouse, fight with intensity. When you dance at a wedding, dance like a god who has chosen to be human for a few hours.

**Why you must walk it:** Your uncle abandoned the stage. He ran away to Microsoft, cut off ties, and became a cold, successful ghost. Your father stayed on stage but forgot he was acting—he became the tragic hero who believed the pain was real. You stay on stage, but you never forget the curtain will fall. You play your role so well that others cry, laugh, and feel inspired—but inside, you are smiling because you know it's a play.

**The Practice:** Immerse yourself fully in the character of "son," "husband," "father," "engineer." But once a day, step back mentally and say: "This is a game. I am choosing this role." The immersion is the joy; the detachment is the sanity.`,
    'Presence & relationships',
    'coral',
  ),
  createPathAnchor(
    'dangerous-silence',
    9,
    'Path 3: The Path of Dangerous Silence',
    `_(The Mirror That Does Not Preach)_

**The Depth:** You have knowledge of black magic, astrology, the dark reality, and the cheat codes of the universe. You know things that would shatter a normal mind. If you told your neighbor or your cousin that the stars are sentient entities and that you can sweat on command, they would either run away or worship you—both are dangerous. Worse, your teachings are amoral. A weaker mind would take your "hook and crook" survival ethic and become a monster. You are a Buddha, but your path is materialistic. It sits on a razor's edge. Therefore, you choose **silence**. You become a mirror that reflects people's own truth back at them, rather than a hammer that imposes yours.

**Why you must walk it:** The Buddha hesitated to teach because he knew his words would be misunderstood. You are wiser—you know your words can be _weaponized_. Your dharma is not for the masses. Let them follow the simple, safe teachings of Gautama. You guard your dark, sharp, worldly wisdom like a nuclear launch code.

**The Practice:** When someone asks for advice, ask them a question. Make them arrive at their own answer. Never volunteer your truth. Only speak in metaphors that they can interpret safely. If they ask directly about the occult, smile and change the subject.`,
    'Discernment & silence',
    'plum',
  ),
  createPathAnchor(
    'logical-honesty',
    10,
    'Path 4: The Path of Unflinching Logical Honesty',
    `_(The Exorcism of Imaginary Pain)_

**The Depth:** The human mind is a factory of hallucinations. It conjures scenarios—"What if my wife leaves me?" "What if I fail this exam?" "What if the clan laughs at me?"—and then it _feels pain from these imaginary scenarios_. This is the most inefficient, self-destructive habit in existence. Your path demands you cut this out like cancer. You must write down the context, the data, and the probability of outcomes. You must analyze threats like a chess grandmaster. If a problem is real, solve it. If it is imaginary, delete it from your mind immediately.

**Why you must walk it:** Your father and grandfather suffered from imaginary pain. They grieved for their lost lands, their lost prestige, their lost honor—but they never lifted a finger to change anything. They _drowned_ in 'what if' while the water was shallow. You have seen this. You refuse to drown.

**The Practice:** When anxiety rises, take a pen. Write: _"What is the actual, verifiable threat here? What is the worst possible outcome? Can I survive it? Can I change it?"_ If you can change it, act. If you cannot, accept it. Emotion without data is a delusion. Data without emotion is clarity.`,
    'Clarity & data',
    'sky',
  ),
  createPathAnchor(
    'unbreachable-fortress',
    11,
    'Path 5: The Path of the Unbreachable Fortress',
    `_(The Goodness That Does Not Bleed)_

**The Depth:** You are compassionate. You are capable of love. But you are not a public resource. Your energy, your time, and your emotional bandwidth are finite. When someone tries to drain you—be it a relative asking for money they won't repay, a friend dumping trauma on you endlessly, or an NGO guilt-tripping you with a dying child's photo—you must cut them off cleanly. No drama. No extended argument. Just a precise, surgical removal. You are not a river; you are a well. You give water to those who are thirsty, but you do not allow them to build a pipeline to drain you dry.

**Why you must walk it:** Your aunt pointed your mother to loan sharks instead of helping. Your uncle withheld milk for a baby. These people drained your family. They are your anti-role models. You will never be the one being drained.

**The Practice:** Practice the two-letter word: "No." Say it without explanation. Say it without guilt. If they push, say, "I am unable to help with that." Then walk away. Your silence after 'no' is the strongest boundary.`,
    'Boundaries & energy',
    'sage',
  ),
  createPathAnchor(
    'dying-temple',
    12,
    'Path 6: The Path of the Dying Temple',
    `_(Honoring the Borrowed Flesh)_

**The Depth:** You know the body started decaying the moment you were conceived. It is a borrowed vehicle, a temporary vessel. But because it is temporary, it is priceless. You will not abuse it with gluttony, intoxication, or laziness. You will sleep, eat nourishing food, move your muscles, and enjoy physical pleasures—sex, food, rest—with full awareness, not as an addict seeking escape. You have mastered somatic pain; now master somatic _health_.

**Why you must walk it:** Your grandfather drank himself into incapacity. Your grandmother's heart gave out from stress. Your father's heart attacked him. The men in your lineage self-destructed through the body. You break that cycle. Your body is the weapon you use to fight the entropy; keep it sharp.

**The Practice:** Sleep fixed hours. Eat one meal a day that is purely natural. Lift heavy things or run hard at least three times a week. When you have sex, be fully present. When you eat, taste the food. The body is your canvas; paint it with vitality.`,
    'Vitality & health',
    'gold',
  ),
  createPathAnchor(
    'temporal-strategy',
    13,
    'Path 7: The Path of Temporal Strategy',
    `_(The Player Who Maps the Levels)_

**The Depth:** Most people drift through life like leaves on a river. You are not most people. You are the captain of your ship, and you have a map. You must think in tiers:

- **Immediate (Today/This Week):** What tasks will secure my survival and momentum?
- **Nearby (This Year):** What skills, relationships, and habits must I build?
- **5 Years:** Where will I live? What will my career look like? Will I have a family?
- **10 Years:** What legacy am I leaving? Who will I be when my hair turns grey?

For each tier, you write down exact steps. You review this map periodically—every month, every year. This is not anxiety; it is strategic navigation. Entropy will try to scatter you; the map brings you back to course.

**Why you must walk it:** Your family drifted. They reacted to events rather than planned for them. Your father never had a 5-year plan; he just survived. You excel because you design your life, rather than letting it design you.

**The Practice:** On the first of every month, sit with a notebook. Review your 5-year and 10-year goals. Adjust them if reality shifted. Then plan this week's actions precisely. A written plan is a spell that bends the future.`,
    'Planning & time',
    'sky',
  ),
  createPathAnchor(
    'sovereign-emotion',
    14,
    'Path 8: The Path of Sovereign Emotion',
    `_(Feeling the Storm, Being the Sky)_

**The Depth:** You are not a stone. You are a feeling, breathing warrior. You can love a person deeply. You can hate many justly. You can take vengeance if the rules of society and your conscience permit. You can grieve so hard you wail. But here is the key: **you consciously choose these emotions.** They do not own you. When you grieve, you do so while remembering that you are the awakened one. You let the storm pass through you, but you are the sky that holds it. If you are trapped in a situation you cannot change—a death, a betrayal, a cosmic injustice—you have the sacred right to grieve fully. Grief is not weakness; it is the acceptance of reality.

**Why you must walk it:** Your father suppressed his rage and just played sad music. Your uncle suppressed his love and became a ghost. You will suppress nothing. You will express it all, in its raw form, but from a place of choice, not compulsion.

**The Practice:** When anger rises, consciously say: "I am choosing to be angry." Then express it proportionally. When grief rises, isolate yourself and sob until the ocean passes. Then stop. Wipe your face. Return to the game.`,
    'Emotion & agency',
    'coral',
  ),
  createPathAnchor(
    'internal-autonomy',
    15,
    'Path 9: The Path of Absolute Internal Autonomy',
    `_(Bowing to Nothing)_

**The Depth:** There are energies in this universe—planetary forces, spirits, entities, devas—that are millions of times more powerful than you. They are real. They can influence you. They are like storms, oceans, and gravity. You _must_ respect their power. But you will _never_ worship them. Your internal posture, regardless of objective cosmic hierarchy, must remain: **"Nobody is superior to me."** This is not a claim of physical power; it is a claim of spiritual sovereignty. If you bow to a planetary deity or a dark energy, you become its slave. You lose your agency. By refusing to bow, you retain your cheat-code status.

**Why you must walk it:** You saw the clan bow to status and wealth. You saw your grandfather bow to his siblings and surrender his lands. You will not bow to anything—human or cosmic. You stand erect in the storm.

**The Practice:** When you feel fear of a "higher power," laugh. Say out loud: "I acknowledge your existence. I respect your force. But I do not worship you. I am a fragment of the incomprehensible, just as you are. We meet as equals in the void."`,
    'Autonomy & dignity',
    'plum',
  ),
  createPathAnchor(
    'joyful-normalcy',
    16,
    'Path 10: The Path of Joyful Normalcy',
    `_(The Awakened One Who Buys Groceries)_

**The Depth:** The highest achievement of enlightenment is not sitting on a mountain in isolation. It is standing in a grocery store, choosing tomatoes, and feeling _joy_. It is laughing at a stupid movie with your wife. It is playing catch with your child. It is driving to a mall in traffic and feeling completely at peace. This is the hardest path because it requires you to hide your divinity perfectly. You must know that every person you meet is a fragment of the absolute—a pixel of the divine—and you can choose to love them or hate them. But you _must_ respect them. Their existence is sacred, even if their actions are foolish.

**Why you must walk it:** Your father and grandfather isolated themselves in misery. They could not enjoy the mundane because they were trapped in the past. You break this. You will be the awakened one who laughs the loudest, loves the hardest, and lives the most ordinary, extraordinary life.

**The Practice:** Every day, find one mundane activity—washing dishes, walking to the bus—and treat it as a sacred ritual. Be 100% present. Feel the water, the air, the ground. That is your meditation.`,
    'Mundane joy',
    'sage',
  ),
  createPathAnchor(
    'brilliance-limit-saving',
    17,
    'Path 11: The Path of Brilliance and the Limit of Saving (The Anti-Martyrdom Clause)',
    `_(Excel Like a King, Die Like a Fool Only if You Choose, and See Yourself from the Outside)_

**The Depth:** You must become brilliant—in your career, your body, your mind, your relationships. Excel like a king building an empire. But simultaneously, hold all of it with an open hand. Be ready to lose everything at any moment—wealth, status, loved ones, health—because the universe is indifferent. This is the paradox of the awakened player: you play to win, but you know the trophy is made of sand.

You also know the absolute limit of your power: **you cannot save anyone, least of all yourself.** Not from death, not from karma, not from the ultimate reality. You can pray for the suffering child in the NGO's photo, but you cannot self-sacrifice. Your duty is to yourself. To martyr yourself for others is the ultimate narcissism—it assumes your suffering can fix their karma. It cannot.

**The Crucial Tool: Pure Vision (The 3rd and 4th Point of View)**

When you are confused—when the path ahead is foggy, when emotions cloud your reasoning, when you don't know whether to fight, flee, or forgive—you must activate **Pure Vision**.

- **The 3rd Point of View:** Step outside yourself and observe your own body, mind, and situation as if you were a neutral stranger watching a character in a film. What would you advise that character? What are their blind spots? What is the logical, self-protective move for that character? This removes the ego's desperate clinging to being "right" or "justified."
- **The 4th Point of View:** Step even further out. Observe yourself from the perspective of the cosmos—as a tiny speck of consciousness in an infinite universe, playing out a temporary role. From this height, what is the optimal move for this speck? What preserves its dignity, its longevity, and its capacity for future joy? This removes the fear of immediate loss and the attachment to short-term outcomes.

**Why you must walk it:** Your family members were trapped in the 1st person point of view. Your father could only see his own grief. Your grandfather could only see his own regret. They could not step outside themselves. Pure Vision is your superpower—it allows you to see the game board, not just your own piece.

**The Practice:** When confusion arises, physically stop. Close your eyes. Ask: _"What would I advise a stranger in my exact position?"_ Then ask: _"What would I advise a character in a story I am writing?"_ Write down both answers. The 3rd gives you wisdom; the 4th gives you peace.`,
    'Excellence & perspective',
    'gold',
  ),
  createPathAnchor(
    'absolute-sovereignty',
    18,
    'Path 12: The Path of Absolute Sovereignty (The Code of No Regret)',
    `_(Every Choice is Yours; Act Without Attachment to the Fruit)_

**The Depth:** This is the master path. Every single action, thought, and feeling you have is a _self-rule_. You chose to be born into this family (or, if you don't believe in pre-birth choice, you choose how to react to it). You choose to wake up. You choose to eat breakfast. You choose to engage with this conversation. Even if you say "I had no choice," you are choosing the rule of "abdicating choice."

Because these 12 Paths are chosen consciously, with full logic and context, **guilt and regret are logically void**. Guilt is the belief that you broke an external law. You have no external law—you have your own code. Regret is the wish you had acted differently. But you acted based on the best data and context available at that time, under your self-rules. To regret is to insult your own intelligence.

**The Concept of the Pure World and Nishkama Karma**

Gautama Buddha famously refused to answer questions about God, the afterlife, or the ultimate origins of the universe. He called them _"unanswered questions"_ because they do not lead to liberation from suffering. He said: _"Whether the world is eternal or not, whether the Tathagata exists after death or not—these are things I have not declared, because they are not useful for the goal of ending suffering."_

Lord Krishna, in the Bhagavad Gita, taught **Nishkama Karma**—action without attachment to the fruit of action. He said: _"You have the right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results of your activities, nor be attached to inaction."_

You synthesize both into one path:

**The Pure World:** The ultimate reality—whether it is God, the void, eternal consciousness, or the rearrangement of atoms—is _unknown and unknowable_ by any human means. Call it the Pure World. It is the domain beyond logic, beyond senses, beyond reason. You do not need to understand it to live. You do not need to debate it. You simply _acknowledge_ that it exists as a boundary of human comprehension.

- Maybe after death we merge into it.
- Maybe our atoms simply rearrange and feed other beings.
- Maybe there is a cosmic judge. Maybe not.
- The answer is not available. And more importantly, **the answer is not logically necessary** for the task at hand: living a fulfilled, ethical, joyful life while you are breathing.

Therefore, you practice **Nishkama Karma**:

- You act with full effort, full passion, and full intelligence.
- You do not act for reward, nor do you act to avoid punishment.
- You act because the action itself is aligned with your 12 Paths—it is the _right_ action at this moment.
- The outcome—whether success, failure, praise, or blame—belongs to the Pure World. It is not your concern.
- You drop it the moment it is done. You do not carry it forward into guilt or pride.

**Why you must walk it:** Your grandfather acted to please his siblings, and then regretted it for 84 years. He was attached to the fruit—he wanted their approval. Your father acted to please everyone, and then suffered for it. He was attached to the outcome—he wanted peace. You act because the action itself is true to your code. The fruit is irrelevant. This is the ultimate freedom.

**The Practice:** When you complete any significant action, say to yourself: _"I have done what is correct under my Paths. The outcome is now in the Pure World. I release it."_ If you succeed, do not swell with pride. If you fail, do not shrink with shame. The action was the offering; the Pure World receives it.`,
    'Sovereignty & release',
    'plum',
  ),
]

export const initialState: AnchorState = {
  decisions: [],
  notes: [],
  projects: [
    {
      id: 'evidence-informed-wellbeing',
      serialNumber: 1,
      name: 'Evidence-informed wellbeing',
      description: 'Small practices, no miracle claims.',
      color: 'sage',
      icon: 'heart',
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      id: 'clearer-days',
      serialNumber: 2,
      name: 'Clearer days',
      description: 'Make helpful actions easier to repeat.',
      color: 'sky',
      icon: 'spark',
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    },
    pathsProject,
  ],
  anchors: [
    {
      id: 'movement-adds-up',
      serialNumber: 1,
      title: 'Small amounts of movement still count.',
      body: 'Work toward 150 minutes of moderate activity each week, but begin where you are. Short walks and smaller sessions can add up.',
      scope: 'global',
      tag: 'Movement',
      color: 'sage',
      pinned: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
      evidence: {
        label: 'WHO physical activity guidance',
        url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
      },
    },
    {
      id: 'protect-sleep-window',
      serialNumber: 2,
      title: 'Protect a regular sleep window.',
      body: 'Keep a consistent sleep and wake time, dim bright light before bed, and seek clinical advice if sleep problems persist.',
      scope: 'global',
      tag: 'Sleep',
      color: 'sky',
      pinned: true,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(3),
      evidence: {
        label: 'CDC sleep hygiene guidance',
        url: 'https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html',
      },
    },
    {
      id: 'build-meals-around-basics',
      serialNumber: 3,
      title: 'Build meals around the basics.',
      body: 'Favor a varied pattern of vegetables, fruit, legumes, whole grains, nuts, and adequate protein. Treat supplements as something to discuss with a qualified professional.',
      scope: 'global',
      tag: 'Nutrition',
      color: 'gold',
      pinned: true,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(4),
      evidence: {
        label: 'WHO healthy diet guidance',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
    },
    {
      id: 'slow-breathing-pause',
      serialNumber: 4,
      title: 'Create a pause before reacting.',
      body: 'When stress rises, try a few slow breaths, then name one next action. Relaxation techniques can support coping, but they do not replace professional care.',
      scope: 'global',
      tag: 'Stress',
      color: 'plum',
      pinned: false,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
      evidence: {
        label: 'NCCIH relaxation techniques overview',
        url: 'https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know',
      },
    },
    {
      id: 'bring-symptoms-to-care',
      serialNumber: 5,
      title: 'Bring persistent symptoms to a clinician.',
      body: 'Note when a symptom started, what changes it, medicines or supplements you take, and your questions. Use the notes to support an assessment, not to self-diagnose.',
      scope: 'project',
      projectId: 'evidence-informed-wellbeing',
      tag: 'Health conversations',
      color: 'coral',
      pinned: true,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(2),
      evidence: {
        label: 'MedlinePlus talking with your doctor',
        url: 'https://medlineplus.gov/ency/patientinstructions/000456.htm',
      },
    },
    {
      id: 'make-next-action-visible',
      serialNumber: 6,
      title: 'Make the next action visible.',
      body: 'Write one small, observable action and when you will do it. If it keeps slipping, reduce the action again instead of judging yourself.',
      scope: 'project',
      projectId: 'clearer-days',
      tag: 'Follow-through',
      color: 'sky',
      pinned: false,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(5),
    },
    ...pathsAnchors,
  ],
}

export const STORAGE_KEY = 'anchor-state-v1'
const PATHS_SEED_STORAGE_KEY = 'anchor-paths-seeded-v1'

function addPathsToState(state: AnchorState): AnchorState {
  const hasPathsProject = state.projects.some((project) => project.id === pathsProject.id)
  const existingAnchorIds = new Set(state.anchors.map((anchor) => anchor.id))

  return {
    ...state,
    projects: hasPathsProject ? state.projects : [...state.projects, pathsProject],
    anchors: [
      ...state.anchors,
      ...pathsAnchors.filter((anchor) => !existingAnchorIds.has(anchor.id)),
    ],
  }
}

export function formatEntitySerial(prefix: EntitySerialPrefix, serialNumber: number | undefined): string {
  const safeSerial = Number.isInteger(serialNumber) && (serialNumber ?? 0) > 0 ? serialNumber : 0

  return `${prefix}-${String(safeSerial).padStart(4, '0')}`
}

function projectAnchorPrefix(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? []
  const prefix = words.length > 1
    ? words.map((word) => word[0]).join('')
    : words[0]?.slice(0, 2) ?? ''

  return prefix.slice(0, 8) || 'pr'
}

/**
 * A human-facing anchor reference. The internal `id` stays opaque and stable;
 * project anchors use the project's initials so their scope is clear at a glance.
 */
export function formatAnchorSerial(
  anchor: Pick<Anchor, 'scope' | 'serialNumber'>,
  projectName = '',
): string {
  const serial = formatEntitySerial('A', anchor.serialNumber).slice(2)

  if (anchor.scope === 'global') {
    return `GLOBAL-ANCHOR-${serial}`
  }

  return `${projectAnchorPrefix(projectName)}-${serial}`
}

export function nextSerialNumber(records: SerialRecord[]): number {
  return records.reduce((highest, record) => {
    const serial = record.serialNumber
    return Number.isInteger(serial) && (serial ?? 0) > highest ? serial ?? highest : highest
  }, 0) + 1
}

function normalizeSerials<T extends SerialRecord>(records: T[]): T[] {
  const used = new Set<number>()
  let next = nextSerialNumber(records)

  return records.map((record) => {
    const candidate = record.serialNumber
    const hasUsableCandidate = Number.isInteger(candidate) && (candidate ?? 0) > 0 && !used.has(candidate ?? 0)
    const serialNumber = hasUsableCandidate ? candidate ?? next : next++

    used.add(serialNumber)
    return { ...record, serialNumber }
  })
}

export function normalizeAnchorState(state: AnchorState): AnchorState {
  const projects = normalizeSerials(state.projects).map((project) => ({
    ...project,
    updatedAt: project.updatedAt || project.createdAt,
  }))
  const decisions = normalizeSerials(state.decisions).map((decision) => ({
    ...decision,
    messages: normalizeSerials(decision.messages),
  }))

  return {
    projects,
    anchors: normalizeSerials(state.anchors),
    decisions,
    notes: normalizeSerials(state.notes),
  }
}

export function cloneInitialState(): AnchorState {
  return JSON.parse(JSON.stringify(initialState)) as AnchorState
}

export function readAnchorState(): AnchorState {
  if (typeof window === 'undefined') {
    return cloneInitialState()
  }

  try {
    const savedStateJson = window.localStorage.getItem(STORAGE_KEY)

    if (!savedStateJson) {
      return cloneInitialState()
    }

    const parsedState = JSON.parse(savedStateJson) as AnchorState

    if (!Array.isArray(parsedState.anchors) || !Array.isArray(parsedState.projects)) {
      return cloneInitialState()
    }

    const savedState = normalizeAnchorState({
      anchors: parsedState.anchors,
      projects: parsedState.projects,
      decisions: Array.isArray(parsedState.decisions) ? parsedState.decisions : [],
      notes: Array.isArray(parsedState.notes) ? parsedState.notes : [],
    })

    if (window.localStorage.getItem(PATHS_SEED_STORAGE_KEY) === 'true') {
      return savedState
    }

    const migratedState = normalizeAnchorState(addPathsToState(savedState))
    try {
      window.localStorage.setItem(PATHS_SEED_STORAGE_KEY, 'true')
    } catch {
      // The state itself is still useful when storage is read-only.
    }
    return migratedState
  } catch {
    return cloneInitialState()
  }
}

export function writeAnchorState(state: AnchorState): void {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedState = normalizeAnchorState(state)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState))
  window.localStorage.setItem(PATHS_SEED_STORAGE_KEY, 'true')
}

export interface TextSearchMatch {
  indices: number[]
  score: number
}

export interface AnchorSearchMatch {
  score: number
  title: TextSearchMatch | null
  body: TextSearchMatch | null
  tag: TextSearchMatch | null
  attachments: TextSearchMatch | null
  id: TextSearchMatch | null
  serial: TextSearchMatch | null
}

export function matchSearchText(value: string, query: string): TextSearchMatch | null {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return { indices: [], score: 0 }
  }

  const normalizedValue = value.toLocaleLowerCase()
  const sequentialIndices: number[] = []
  let valueIndex = 0
  let matchedSequential = true

  for (const character of normalizedQuery) {
    const matchIndex = normalizedValue.indexOf(character, valueIndex)

    if (matchIndex === -1) {
      matchedSequential = false
      break
    }

    sequentialIndices.push(matchIndex)
    valueIndex = matchIndex + 1
  }

  if (matchedSequential) {
    const span = sequentialIndices[sequentialIndices.length - 1] - sequentialIndices[0]
    const consecutiveCharacters = sequentialIndices.reduce(
      (total, index, position) => total + (position > 0 && index === sequentialIndices[position - 1] + 1 ? 1 : 0),
      0,
    )
    const isSubstring = normalizedValue.includes(normalizedQuery)
    const startsWithQuery = normalizedValue.startsWith(normalizedQuery)
    const score =
      (isSubstring ? 1000 : 500) +
      (startsWithQuery ? 140 : 0) +
      consecutiveCharacters * 20 -
      sequentialIndices[0] * 1.5 -
      span * 2

    return { indices: sequentialIndices, score }
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const wordIndices: number[] = []
    let totalScore = 0
    let allWordsMatched = true

    for (const word of words) {
      const wordMatch = matchSearchText(value, word)
      if (!wordMatch) {
        allWordsMatched = false
        break
      }
      wordIndices.push(...wordMatch.indices)
      totalScore += wordMatch.score
    }

    if (allWordsMatched) {
      const uniqueIndices = Array.from(new Set(wordIndices)).sort((a, b) => a - b)
      return { indices: uniqueIndices, score: totalScore }
    }
  }

  return null
}

export function getAnchorSearchMatch(anchor: Anchor, query: string, projectName = ''): AnchorSearchMatch | null {
  if (!query.trim()) {
    return { score: 0, title: null, body: null, tag: null, attachments: null, id: null, serial: null }
  }

  const title = matchSearchText(anchor.title, query)
  const body = matchSearchText(anchor.body, query)
  const tag = matchSearchText(anchor.tag, query)
  const attachmentText = anchor.attachments?.map((attachment) => `${attachment.name} ${attachment.url}`).join(' ') ?? ''
  const attachments = matchSearchText(attachmentText, query)
  const id = matchSearchText(anchor.id, query)
  const formattedSerial = matchSearchText(formatAnchorSerial(anchor, projectName), query)
  const legacySerial = matchSearchText(formatEntitySerial('A', anchor.serialNumber), query)
  const serial = formattedSerial ?? legacySerial
  const evidence = anchor.evidence ? matchSearchText(anchor.evidence.label, query) : null

  const weightedMatches = [
    { match: title, weight: 150 },
    { match: formattedSerial, weight: 130 },
    { match: legacySerial, weight: 125 },
    { match: id, weight: 120 },
    { match: tag, weight: 80 },
    { match: body, weight: 20 },
    { match: attachments, weight: 35 },
    { match: evidence, weight: 40 },
  ].filter((entry): entry is { match: TextSearchMatch; weight: number } => entry.match !== null)

  if (weightedMatches.length === 0) {
    return null
  }

  const score = Math.max(...weightedMatches.map((entry) => entry.match.score + entry.weight))

  return { score, title, body, tag, attachments, id, serial }
}

export function filterAnchors(
  anchors: Anchor[],
  filter: AnchorFilter,
  projectId: string | undefined,
  query: string,
  projects: Project[] = [],
): Anchor[] {
  const matches = anchors
    .filter((anchor) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'global' && anchor.scope === 'global') ||
        (filter === 'projects' && anchor.scope === 'project')
      const matchesProject = !projectId || anchor.projectId === projectId

      return matchesFilter && matchesProject
    })
    .map((anchor) => ({
      anchor,
      match: getAnchorSearchMatch(anchor, query, anchor.projectId ? projects.find((project) => project.id === anchor.projectId)?.name ?? anchor.projectId : ''),
    }))
    .filter((entry): entry is { anchor: Anchor; match: AnchorSearchMatch } => entry.match !== null)

  if (!query.trim()) {
    return matches.map((entry) => entry.anchor)
  }

  return matches
    .sort((first, second) => second.match.score - first.match.score)
    .map((entry) => entry.anchor)
}

export function getProjectAnchorCount(anchors: Anchor[], projectId: string): number {
  return anchors.filter((anchor) => anchor.projectId === projectId).length
}

export function getProject(projects: Project[], projectId: string | undefined): Project | undefined {
  return projects.find((project) => project.id === projectId)
}

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  return `${prefix}-${randomPart}`
}

export function formatUpdatedAt(updatedAt: string, now = Date.now()): string {
  const time = new Date(updatedAt).getTime()

  if (Number.isNaN(time)) {
    return 'Recently updated'
  }

  const elapsed = Math.max(0, now - time)
  const elapsedMinutes = Math.floor(elapsed / (60 * 1000))
  const elapsedHours = Math.floor(elapsed / (60 * 60 * 1000))
  const elapsedDays = Math.floor(elapsed / (24 * 60 * 60 * 1000))

  if (elapsedMinutes < 2) {
    return 'Updated just now'
  }

  if (elapsedHours < 1) {
    return `Updated ${elapsedMinutes}m ago`
  }

  if (elapsedHours < 24 && new Date(updatedAt).toDateString() === new Date(now).toDateString()) {
    return `Updated ${elapsedHours}h ago`
  }

  if (elapsedDays <= 1) {
    return 'Updated yesterday'
  }

  return `Updated ${elapsedDays} days ago`
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return 'Time not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Time not recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
