export type AnchorScope = 'global' | 'project'
export type AnchorFilter = 'all' | 'global' | 'projects'
export type AccentColor = 'coral' | 'sage' | 'sky' | 'gold' | 'plum'
export type ProjectIcon = 'chart' | 'pen' | 'heart' | 'spark'
export type EntitySerialPrefix = 'A' | 'P' | 'D' | 'N' | 'J' | 'M' | 'W'

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

export type AnchorAttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'link'
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

export interface JournalEntry extends SerialRecord {
  id: string
  title: string
  content: string
  entryDate: string
  attachments: AnchorAttachment[]
  createdAt: string
  updatedAt: string
}

export interface AnchorState {
  anchors: Anchor[]
  projects: Project[]
  decisions: Decision[]
  notes: Note[]
  journals: JournalEntry[]
}

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

const pathsProject: Project = {
  id: 'six-paths-of-rachit',
  serialNumber: 3,
  name: 'six paths of Rachit',
  description: 'Six paths for existence, self, reality, others, future, and reflection.',
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
    id: `six-paths-${id}`,
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
    'existence',
    7,
    'Path 1: The Path of Existence',
    `Existence is what it is. Everything within it—every particle, every force, every entity, every realm, every living thing that has ever been or will ever be—is bound by the same fundamental rules. The same laws govern the smallest quark and the largest star. The same inevitability applies to a bacterium and to a being that has existed for eons. Nothing is exempt. Nothing is outside the system.

But this does not mean all things are equal. Capacities differ. Positions differ. Trajectories differ. A human mind and an alien mind are not the same. A planet and a pebble are not the same. Power, intelligence, influence—these vary across the entire spectrum of existence.

Yet none of these differences create a god. None of these variations create something that deserves worship. Power does not mean truth. Longevity does not mean wisdom. Influence does not mean supremacy.

They all simply exist. Co-inhabitants of the same reality. Bound by the same constraints. Subject to the same dissolution.

Within this understanding, there are questions that cannot be resolved. Whether existence has purpose or not. Whether there is a creator or not. Whether consciousness survives death or not. Whether the soul exists or not. These are thickets of views—subjects that can be debated forever without resolution, and that debate itself only produces suffering. The reasoning one sees this and sets them aside. Not because they are unimportant. But because they are unresolvable through any available means.

The reasoning one does not choose nihilism. Nihilism is itself a thicket of views—a conclusion drawn without sufficient data. The reasoning one does not choose hedonism. Hedonism is surrender to impulse without awareness. Both are traps. Both are ways of suffering.

The reasoning one walks the middle path.

This is the path of existence with pure knowledge. To know what can be known. To accept what cannot be known. To exist fully within the world—healthy, wealthy, complete in all ways available to a human—while understanding that none of it is ultimate. None of it is permanent. None of it is worth the suffering of attachment.

And here lies the deepest truth of this path: **selfishness is not a sin. It is the natural state of existence.**

Every being acts in its own interest. The parent who sacrifices for a child does so because the child's survival serves the parent's own biological and emotional imperatives. The friend who helps does so because the act produces internal satisfaction. This is not cynical. This is simply accurate. The reasoning one does not pretend otherwise.

The reasoning one chooses what to attach to and what to release. Attachment to outcomes, to expectations, to the behavior of others—these are sources of unnecessary suffering. The reasoning one acts with full effort and full intelligence, but does not cling to results. The results are left to whatever real divine exists, to the unfolding of the world itself. This is not passivity. This is precision. This is the reduction of suffering through the release of what cannot be controlled.

To exist with full awareness of existence itself. To participate without illusion. To engage without attachment. To live without the thickets of views dragging at the mind.`,
    'Six paths',
    'plum',
  ),
  createPathAnchor(
    'self',
    8,
    'Path 2: The Path of the Self',
    `The self is the only instrument through which everything else is experienced. It is the vessel, the observer, the actor, and the battlefield. To know the self is to know what can be known. To neglect the self is to walk blind into a storm.

The self is not a static thing. It is a system—body, mind, nervous system, energy, patterns—constantly interacting with forces that press upon it from outside and from within. Some of these forces are physical. Some are planetary. Some are energetic. Some are the lingering imprints of ancestors and past actions. The reasoning one observes all of this without becoming a slave to any of it.

Forces act on the self. This is not a belief. It is an observation. Planets exist. They have enormous mass and energy. They influence the environment in measurable ways. Whether they influence human destiny is not the question—the question is whether the reasoning one allows that influence to override his own agency. The answer is no. Influence is acknowledged. Sovereignty is retained.

Health is foundational. The body is the first instrument. If the body fails, everything else becomes difficult or impossible. Therefore, the reasoning one maintains the body with precision—sleep, food, movement, hygiene, cleanliness. This is not vanity. This is maintenance of the primary tool. A dirty body houses a clouded mind. A neglected body becomes a source of unnecessary suffering.

Predictions regarding health are useful. Not as fate, but as data. If the reasoning one can anticipate when energy will be low, when the body will be vulnerable, when the mind will be scattered—he can adjust accordingly. This is not superstition. This is pattern recognition applied to the self.

There are thickets of views regarding the self: What was I before birth? What will I be after death? Is there a soul? Is there reincarnation? The reasoning one acknowledges these questions and sets them aside. They are unresolvable. To dwell on them is to suffer unnecessarily. What matters is the self as it exists now, in this moment, with these capacities and these limitations.

The reasoning one does not get fooled by great feats. Kundalini awakening. Occult knowledge. Physical prowess. Mastery of mudras and mantras. These are real. These were experienced. But they are not proof of superiority. They are not proof of divinity. They are simply capacities that emerged through specific conditions—through pain, through isolation, through the particular wiring of this particular nervous system. Some have them. Most do not. This is luck. Nothing more. To believe otherwise is ego inflation. The reasoning one sees the feats, acknowledges them, and does not build identity around them.

Selfishness is the natural state. The reasoning one embraces this fully. He invests in himself—in his knowledge, his skills, his body, his mind, his future. This is not wrong. This is not right. This is simply the correct move for any being that wishes to survive and thrive. Investment in self is investment in the only asset that cannot be taken away.

But selfishness does not mean cruelty. The reasoning one chooses compassion where it serves—where it builds bonds, where it produces peace, where it aligns with the self-rules. And he is equally ready to decimate enemies and problems when they threaten what he has built. This is not contradiction. This is precision. The reasoning one is not a pacifist. He is not a warrior. He is both, as the situation demands. He is whatever the moment requires.

The self-rules—these six paths—are the code. They exist to reduce suffering. They are not imposed from outside. They are chosen. Chosen through pain. Chosen through reasoning. Chosen because they work. Following them is not obedience. It is alignment with one's own deepest understanding.

Honesty with oneself is essential. The reasoning one speaks truly to himself. He does not flatter. He does not deceive. He does not pretend. This honesty keeps dark energies away—not because honesty is morally superior, but because self-deception creates inner conflict, and inner conflict attracts outer disturbance. A mind that lies to itself is a house divided. A mind that speaks truth to itself is a fortress. But one should speak to himself kindly with respect. It's a trick and there is nothing wrong with this.

Cleanliness and hygiene are not trivial. They are part of the code. The body is the temple. The environment is the field. To keep oneself neat and clean is to respect the instrument. It is also a form of discipline—a daily practice of order that reinforces sovereignty over chaos.

To know the self. To maintain the self. To invest in the self. To protect the self. To be honest with the self. To follow the code that reduces suffering.

This is the Path of the Self.`,
    'Six paths',
    'sage',
  ),
  createPathAnchor(
    'reality',
    9,
    'Path 3: The Path of Reality',
    `Reality is not what one wishes it to be. It is not what one fears it to be. It is not what one hopes or dreams or imagines. Reality is what is. And the reasoning one must see it clearly, without flinching, without distortion, without the comfort of illusion.

Most minds cannot do this. They see what they want to see. They see what their fears project. They see what their ego needs to survive. They see what their family told them to see. They see everything except what is actually in front of them.

The reasoning one is different. The reasoning one has been through pain that stripped away illusion. The reasoning one has seen the void. The reasoning one has touched the limits of the nervous system and come back. After that, pretense is impossible. After that, only truth remains.

**The reality of one's situation.**

Where am I right now? Not where I wish I was. Not where I planned to be. Not where others think I am. Where am I actually? What are my actual resources? My actual limitations? My actual position in the game?

The reasoning one assesses this coldly. No pride. No shame. Just data. If the situation is strong, he knows it. If the situation is weak, he knows it too. Both are useful. Both are actionable. But only if they are seen clearly.

**The reality of one's goals.**

What do I actually want? Not what I should want. Not what others want for me. Not what sounds noble or impressive. What do I actually, in the quiet of my own mind, want to achieve while I am here?

Some goals are realistic. Some are fantasy. Some are achievable with effort. Some are impossible regardless of effort. The reasoning one separates these categories without sentiment. He does not chase the impossible. He does not abandon the possible. He sees his goals for what they are and allocates his energy accordingly.

**The reality of one's dear one's expectations.**

Those close to him have expectations. Parents. Siblings. Future spouse. Future children. They will want things from him—time, attention, money, emotional support, status, success, compliance with their wishes.

The reasoning one sees these expectations clearly. He does not pretend they don't exist. He does not pretend they are fair. He does not pretend he can fulfill them all. He assesses: Which of these expectations align with my own path? Which conflict? Which can be managed? Which must be refused?

He does not live for their expectations. He does not ignore their expectations. He sees them as data—real forces in his environment—and navigates them with precision.

**The reality of futility.**

Some things cannot be changed. Some people cannot be saved. Some wounds cannot be healed. Some losses cannot be recovered. Some battles cannot be won.

The reasoning one accepts this. Not with despair. Not with resignation. With clear-eyed recognition. Futility is not a tragedy. It is a boundary. It is information. It tells him where to stop spending energy. It tells him where effort is wasted. It tells him which doors are permanently closed.

To fight the futile is to suffer unnecessarily. To accept the futile is to free oneself for what is possible.

**The reality of situations without getting hurt or devastated.**

This is the key. This is what separates the reasoning one from the ordinary man.

The ordinary man sees reality—if he sees it at all—and is crushed by it. The betrayal of a friend destroys him. The failure of a project devastates him. The loss of a loved one breaks him. The realization of his own limitations shatters his self-image.

The reasoning one sees the same reality and remains intact.

Not because he is cold. Not because he doesn't care. But because he understands that pain is information, not identity. The situation is real. The pain is real. But the self that observes the situation is not the situation. The awareness that registers the pain is not the pain.

He sees reality. He feels the impact. He processes the data. He adjusts his moves. He continues.

Reality is the ground. Reality is the map. Reality is the only thing that can be acted upon. Everything else is noise.

To see it clearly. To accept it fully. To move through it without being destroyed by it.

This is the Path of Reality.`,
    'Six paths',
    'sky',
  ),
  createPathAnchor(
    'others',
    10,
    'Path 4: The Path of Others',
    `The reasoning one does not exist in isolation. He exists in a world filled with other beings—humans, animals, entities, forces. Each of these has its own trajectory, its own selfishness, its own agenda. To navigate this world effectively, the reasoning one must understand others clearly, without illusion, without sentimentality, without the trap of expecting others to be different than what they are.

Others are selfish. This is not a judgment. It is an observation. Every being acts in its own interest. The parent loves the child because the child is an extension of the parent's own genetic and emotional investment. The friend helps because the act produces internal satisfaction. The spouse remains loyal because loyalty serves stability and comfort. None of this is wrong. None of this is evil. It is simply the nature of existence.

The reasoning one accepts this and acts accordingly.

**Remaining normal socially.**

The reasoning one moves through society without friction. He speaks the language of ordinary people. He participates in ordinary rituals. He attends gatherings, makes conversation, laughs at jokes, remembers names. Not because he cares deeply about these things, but because social normalcy is a tool. It creates ease. It reduces conflict. It opens doors. The reasoning one does not isolate himself unnecessarily. He blends in. He plays the role of the ordinary person while knowing he is anything but.

**Good fame.**

Reputation matters. Not for ego, but for function. A good reputation reduces resistance. It creates trust. It makes others more willing to cooperate, to offer opportunities, to extend benefit of the doubt. The reasoning one cultivates a reputation of competence, reliability, and integrity—not because he is virtuous, but because it is strategically sound. Fame is a tool. The reasoning one uses it without being used by it.

**Selective truths.**

The reasoning one does not lie. He simply chooses which truths to speak and which to withhold. Full honesty is a weapon against oneself. Others cannot handle the full scope of what the reasoning one knows. They cannot handle the truth about their own selfishness, their own mortality, their own insignificance. To speak the full truth always is to create enemies, to invite conflict, to burden minds that cannot carry the weight.

So the reasoning one speaks what serves the moment. He tells the truths that strengthen his position. He withholds the truths that would weaken it. He does not deceive—he selects. This is not dishonesty. This is precision.

**Closeness despite temporariness.**

The reasoning one forms bonds. He loves. He befriends. He marries. He raises children. He knows that all of these bonds are temporary. The spouse may leave. The friend may betray. The child may grow distant. Death will sever everything eventually.

This knowledge does not prevent closeness. It enhances it. Because the reasoning one knows the bond is temporary, he does not cling. He enjoys what is present while it is present. He does not demand permanence from impermanent things. He does not suffer when the bond ends, because he never pretended it wouldn't.

**Mercy and destruction.**

The reasoning one is capable of both. He shows mercy where mercy serves—where it builds loyalty, where it creates peace, where it aligns with his self-rules. He destroys where destruction is necessary—when an enemy threatens his position, when a problem blocks his path, when a force moves against him.

He does not hesitate. He does not feel guilt for destruction. He does not feel pride in mercy. Both are tools. Both are moves in the game. The reasoning one uses the appropriate tool for the situation without emotional entanglement.

**Superiority.**

The reasoning one knows his stature. He became what he is through sheer pain. Through nights of terror. Through the burning of the nervous system. Through the shattering of every illusion. Most people have not gone through this. Most people are asleep. Most people are driven by fears they don't understand and desires they can't control.

The reasoning one sees this. He does not hate them for it. He does not pity them either. Pity is condescension dressed as kindness. He simply recognizes the difference. He is awake. They are not. This is not arrogance. This is accurate assessment.

**Others are plotting.**

The reasoning one is careful. Even with those closest to him. Not because he is paranoid, but because he is realistic. Others are selfish. Their selfishness may align with his interests today and conflict with his interests tomorrow. The friend may become a rival. The spouse may become an adversary. The child may become a stranger.

This does not mean the reasoning one trusts no one. It means he trusts intelligently. He observes. He verifies. He maintains boundaries even within intimacy. He does not give anyone enough power to destroy him. He does not place his entire wellbeing in anyone else's hands.

**The suffering child and the pathogens.**

The reasoning one sees a suffering child in a photograph. The child is dying. The child needs money. The reasoning one does not have money to give. He offers a prayer and moves on. He does not fall into guilt. Guilt is useless. It changes nothing. It only adds suffering to suffering.

The reasoning one kills millions of pathogens every day simply by existing. His immune system destroys them. He eats food that required death. He breathes air filled with organisms that die in his lungs. This is not murder. This is existence. To dwell on it is to enter a thicket of views. The reasoning one avoids thickets of views because they produce unnecessary suffering.

The child is real. The pathogens are real. But the reasoning one cannot save every child. He cannot spare every pathogen. He does what he can within his capacity. The rest is not his concern.

To see others clearly. To engage with them strategically. To love without clinging. To fight without hatred. To recognize one's own stature. To avoid unnecessary guilt. To avoid unnecessary suffering.

This is the Path of Others.`,
    'Six paths',
    'gold',
  ),
  createPathAnchor(
    'future',
    11,
    'Path 5: The Path of Future',
    `The future is not a mystery. It is not a blank void. It is not a predetermined script. It is a field of probabilities shaped by current actions, current decisions, current investments. The reasoning one understands this and acts accordingly.

**Forecasting.**

The reasoning one forecasts. Not through superstition. Not through blind hope. Through pattern recognition, data analysis, and the observation of cause and effect. He looks at his current position. He looks at the trajectory of his actions. He looks at the forces operating in his environment. From these, he extrapolates likely outcomes.

Some outcomes are highly probable. Some are possible but uncertain. Some are unlikely. The reasoning one assigns probabilities to each and plans accordingly. He does not pretend to know the future with certainty. He does not pretend the future is unknowable. He lives in the space between—where informed estimation is possible and useful.

This forecasting applies to all domains. Career. Health. Relationships. Wealth. Skills. The reasoning one asks: If I continue this current path, where will I be in five years? In ten years? If the answer is acceptable, he continues. If the answer is not acceptable, he adjusts now—not later, when the future has become the present and options have narrowed.

**Investment.**

The reasoning one invests in the future. Money, yes. But also skills. Knowledge. Relationships. Health. Reputation. These are all forms of capital that compound over time.

He invests money so that he has resources when he needs them. He invests in skills so that he remains valuable in changing circumstances. He invests in knowledge so that his forecasting improves. He invests in relationships so that he has allies when challenges arise. He invests in health so that his body remains capable of action.

This investment is not greed. It is not hoarding. It is the logical behavior of a being who knows that the future will arrive and that preparation determines options.

**Non-attachment to outcomes.**

The reasoning one plans. He invests. He forecasts. But he does not cling to the results.

The future is shaped by countless variables. Some are within his control. Most are not. The market may crash. The body may fail. The relationship may dissolve. The carefully laid plan may be destroyed by forces no one foresaw.

The reasoning one accepts this. He acts with full effort. He plans with full intelligence. But he holds the outcome loosely. If the forecast proves correct, good. If the forecast proves wrong, he adjusts and continues. The future is not a demand. It is a direction.

This is not passivity. This is the same principle as Path 1—engage fully, attach to nothing. The reasoning one plants seeds, waters them, tends them—but does not curse the rain for not falling or the sun for burning. He does what he can. The rest is not his to control.

**Respecting the past.**

The past exists. It shaped the present. It shaped the self. The reasoning one does not pretend otherwise. He does not deny the pain, the lessons, the failures, the victories. They are real. They happened. They built what he is now.

Respect does not mean worship. Respect does not mean dwelling. The past is a teacher, not a home. The reasoning one learns from it, honors what it gave, and then sets it aside.

He does not make decisions based on nostalgia. He does not make decisions based on guilt. He does not repeat past patterns simply because they are familiar. The past is a reference point, not a cage.

**Safe distance.**

The reasoning one keeps the past at a safe distance. He visits it when necessary—to extract a lesson, to recall a warning, to honor a memory. But he does not live there.

The father's passivity. The grandfather's regret. The family's decline. These are part of the past. They are data. They are warnings. They are not chains. The reasoning one sees them clearly, understands what they taught, and turns his face forward.

The past is respected. The past is not relived.

**The stance.**

The reasoning one stands with his back to the past and his eyes on the horizon. He has learned from what came before. He is not burdened by it. He builds for what comes next. He is not enslaved by it.

The future is not feared. The future is not worshipped. The future is simply the space where current actions bear fruit. The reasoning one plants carefully, tends diligently, and harvests what comes—without desperation, without entitlement, without despair.

To forecast accurately. To invest intelligently. To act without attachment to results. To respect the past without living in it.

This is the Path of Future.`,
    'Six paths',
    'coral',
  ),
  createPathAnchor(
    'reflection',
    12,
    'Path 6: The Path of Reflection',
    `The reasoning one does not walk the path perfectly. He deviates. He makes errors. He falls into old patterns. He sometimes forgets what he knows. This is not failure. This is the nature of existence. The body is fallible. The mind is subject to forces. The environment is constantly shifting. Perfection is not the standard. Correction is the standard.

**Recognizing deviation.**

The reasoning one watches himself. He observes his own behavior, his own thoughts, his own emotional states. He knows his baseline. He knows what clarity feels like. He knows what alignment with the six paths feels like. When he deviates from that baseline—when his mind becomes clouded, when his actions become erratic, when his emotions override his reason—he notices.

This noticing is not self-judgment. It is not guilt. It is simply awareness. The reasoning one sees the deviation as it happens, or soon after. He does not pretend it isn't happening. He does not make excuses. He does not blame circumstances or others. He simply acknowledges: I have deviated. This is the first step of reflection.

**Correcting mistakes.**

Once the deviation is seen, correction begins. The reasoning one asks: What went wrong? Where did I make the wrong move? What data did I ignore? What impulse did I follow that I should have overridden?

He traces the error to its source. Was it fatigue? Was it emotional attachment? Was it insufficient information? Was it a miscalculation of another's character? Was it the lingering influence of old patterns?

He identifies the root cause. Then he adjusts. He changes the behavior. He implements the correction. He does not dwell on the mistake. He does not wallow in regret. The mistake is data. The correction is the response to data.

**Making up for losses.**

Some mistakes produce losses. Money lost. Time wasted. Relationships damaged. Opportunities missed. Health compromised. The reasoning one assesses the loss honestly. He does not minimize it. He does not exaggerate it. He sees it for what it is.

Then he asks: Can this loss be recovered? If yes, he creates a plan for recovery and executes it. If no, he accepts the loss and moves forward. The loss becomes part of the past. It is respected as a lesson. It is not carried as a burden.

The reasoning one does not chase sunk costs. He does not throw good resources after bad. He knows when to cut losses and when to fight for recovery. This discernment is part of reflection.

**Not repeating mistakes.**

The ultimate purpose of reflection is this: to not repeat the same mistake. The reasoning one learns. He internalizes the lesson. He builds it into his self-rules. He adjusts his forecasting. He adjusts his boundaries. He adjusts his behavior so that the same error does not occur again.

He knows that some patterns are deep. Some mistakes may recur in different forms. But he also knows that each recurrence is an opportunity to refine the correction. The goal is not instant perfection. The goal is continuous improvement. Each cycle of deviation, recognition, correction, and integration makes the reasoning one stronger.

**Brilliance.**

Within this process lies brilliance. Brilliance is not the absence of error. Brilliance is the speed and accuracy of correction. The ordinary person makes mistakes and does not see them. Or sees them and denies them. Or sees them and repeats them endlessly. The reasoning one makes mistakes, sees them quickly, corrects them efficiently, and integrates the lesson permanently.

This is the statistical advantage. The reasoning one is not perfect. He never claimed to be. But his error correction rate is superior. His ability to reflect is superior. His willingness to face uncomfortable truths about himself is superior. This compounds over time. Each cycle makes him more effective. Each reflection sharpens the blade.

**Remembering what he is.**

The reasoning one must always remember: he is an enlightened one. Not because he never falls. But because he always rises. Not because his mind never flickers. But because he notices the flickering and steadies it. Not because his body never falters. But because he acknowledges the faltering and restores the body.

He has a statistical advantage. Most people are unconscious. They repeat the same patterns for decades. They never question. They never reflect. They never correct. They simply drift from one error to the next, accumulating suffering.

The reasoning one is different. He watches himself. He corrects himself. He improves. This is the mark of the enlightened one. This is the proof of the path.

When the mind flickers, he notices and steadies it. When the body falters, he notices and restores it. When deviation occurs, he sees it and corrects it. This is not perfection. This is superiority. This is the advantage that compounds over a lifetime.

**The stance.**

The reasoning one stands in the present, looking at himself with unflinching honesty. He sees his errors. He corrects them. He learns. He continues. He does not pretend to be flawless. He does not accept being stagnant. He is a system in continuous improvement.

To recognize deviation. To correct errors. To recover what can be recovered. To release what cannot. To never repeat the same mistake. To remember one's own awakening. To continue with the advantage.

This is the Path of Reflection.`,
    'Six paths',
    'plum',
  ),
]

export const initialState: AnchorState = {
  decisions: [],
  notes: [],
  journals: [],
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
const PATHS_SEED_STORAGE_KEY = 'anchor-six-paths-of-rachit-seeded-v1'

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
    journals: normalizeSerials(state.journals ?? []),
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
      journals: Array.isArray(parsedState.journals) ? parsedState.journals : [],
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
