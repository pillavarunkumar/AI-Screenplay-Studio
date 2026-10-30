import { EMPTY_DRAFT, type StudioDraft } from "./schemas/draft";
import type { CharacterRole } from "./schemas/characters";
import type { Scene, ScriptElementType, Shot } from "./schemas/scene";
import type { BoardElement, StoryboardPanel } from "./schemas/storyboard";

export interface ExampleStory {
  id: string;
  title: string;
  genre: string;
  blurb: string;
  draft: StudioDraft;
}

type Line = [ScriptElementType, string];

const scene = (id: string, order: number, heading: string, summary: string, lines: Line[]): Scene => ({
  id,
  order,
  heading,
  summary,
  elements: lines.map(([type, text], index) => ({ id: `${id}-${index + 1}`, type, text })),
  shotList: null,
});

const person = (
  id: string,
  role: CharacterRole,
  name: string,
  fields: [string, string, string, string, string, string],
) => ({
  id,
  role,
  profile: {
    name,
    alternateNames: [],
    physicalDescription: fields[0],
    personality: fields[1],
    motivation: fields[2],
    internalConflict: fields[3],
    voice: fields[4],
    arc: fields[5],
  },
});

const lastFerry: StudioDraft = {
  ...EMPTY_DRAFT,
  idea: "a night ferry deckhand counts one passenger too many and has until the next dock to find out who is hiding aboard",
  storylineSourceIdea: "a night ferry deckhand counts one passenger too many and has until the next dock to find out who is hiding aboard",
  storyline: {
    correctedIdea: "A night-ferry deckhand counts one passenger too many and has until the next dock to find out who is hiding aboard.",
    corrections: [],
    synopsis: {
      setup: "Mara, the youngest deckhand on the last ferry of the night, takes pride in counting every passenger twice. Tonight the count is 41, but the ticket machine says 40, and the captain won’t delay the crossing for a rounding error.",
      complication: "Mara searches the deck and finds a stowaway, a teenager who says he is running from a man on board. Then the lights flicker and the man appears, calmly asking Mara to hand the boy over before the next dock.",
      resolution: "Mara hides the boy in the engine room and bluffs the man with a false head count. She gives up her job to keep the ferry from docking until police can board, and learns that protecting people matters more than following the rules.",
    },
    whyThisStructure:
      "The setup promises a puzzle: one extra person. The complication turns it into a threat with a clock, the next dock. The resolution pays it off by making Mara choose between her job and the boy.",
    analysis: {
      centralQuestion: "Will Mara risk her job to protect a stranger before the ferry docks?",
      want: "To finish her shift without a mistake on her record.",
      need: "To trust her own judgment over the rulebook.",
      stakes: "The boy’s safety, and Mara’s job and her pride in being careful.",
      theme: "Doing the right thing sometimes means breaking the rules.",
      strengths: ["The extra passenger is a clear, simple hook.", "The ferry gives a closed space and a ticking clock."],
      toStrengthen: ["Give the man a reason the audience believes, so he is more than a threat.", "Plant the engine-room hiding place early so the ending feels earned."],
    },
  },
  characters: [
    person("lf-c1", "protagonist", "Mara", ["Early twenties, wiry, hair tied under a knit cap, hands chapped from rope.", "Careful, proud of being exact, quietly stubborn.", "To keep the one job she has ever been good at.", "She follows rules because she fears being the person who made the mistake.", "Short, practical sentences. Counts under her breath.", "From rule-follower to someone who trusts her own judgment."]),
    person("lf-c2", "antagonist", "Mr. Voss", ["Fifties, tidy grey coat, polite smile that never reaches his eyes.", "Patient, controlling, always reasonable on the surface.", "To bring the boy back before anyone asks questions.", "He believes he is the boy’s rightful guardian and cannot see himself as the villain.", "Soft, courteous, never raises his voice.", "Stays the same, which is what makes him frightening."]),
    person("lf-c3", "supporting", "Captain Iyer", ["Sixties, broad shoulders, reading glasses on a cord.", "Gruff, tired, protective of his schedule.", "To dock on time and go home.", "He wants to believe nothing bad happens on his ferry.", "Dry and clipped, one-liners.", "Learns to trust Mara."]),
  ],
  storyBible: {
    tone: "Tense, wet, claustrophobic, with small flashes of dry humour",
    characters: [
      { name: "Mara", role: "Hero", summary: "Young deckhand who counts everything twice and hates mistakes." },
      { name: "Mr. Voss", role: "Rival", summary: "Calm, polite man searching for the boy." },
      { name: "Captain Iyer", role: "Supporting", summary: "Gruff captain who wants to stay on schedule." },
    ],
    facts: ["The ferry makes its last crossing at 11 p.m.", "The next dock is twenty minutes away.", "The ticket machine counts 40 passengers; Mara counts 41."],
  },
  scenes: [
    scene("lf-s1", 0, "INT. FERRY PASSENGER DECK - NIGHT", "Mara counts the passengers and finds one too many.", [
      ["action", "Rain streaks the windows. Mara walks the rows with a clicker in her hand, lips moving."],
      ["character", "MARA"],
      ["parenthetical", "(counting)"],
      ["dialogue", "Thirty-nine. Forty. Forty-one."],
      ["action", "She stops. Checks the ticket machine on her wrist. It reads 40."],
      ["character", "MARA"],
      ["dialogue", "That’s not possible."],
      ["action", "Behind her, a sleeping man’s coat shifts. Something under it moves."],
    ]),
    scene("lf-s2", 1, "INT. FERRY ENGINE ROOM - NIGHT", "Mara hides the boy and bluffs Mr. Voss.", [
      ["action", "Heat and noise. Mara crouches behind a pipe with a shivering teenage boy."],
      ["character", "BOY"],
      ["dialogue", "He said he was my uncle. He’s not."],
      ["action", "Footsteps on the stairs. Mr. Voss appears, polite, folding his umbrella."],
      ["character", "MR. VOSS"],
      ["dialogue", "I’m sorry to trouble you. I’m missing a passenger."],
      ["character", "MARA"],
      ["parenthetical", "(steady)"],
      ["dialogue", "I counted forty. Every one of them was in a seat."],
    ]),
  ],
};

const recipeBook: StudioDraft = {
  ...EMPTY_DRAFT,
  idea: "two sisters who barely speak have one weekend to sell their late mother's bakery and find her secret recipe book",
  storylineSourceIdea: "two sisters who barely speak have one weekend to sell their late mother's bakery and find her secret recipe book",
  storyline: {
    correctedIdea: "Two sisters who barely speak have one weekend to sell their late mother’s bakery, and they find her secret recipe book.",
    corrections: [],
    synopsis: {
      setup: "Leela, the practical older sister, flies in to sell their mother’s bakery before Monday. Her younger sister Anu, who stayed and ran the ovens, wants to keep it. They haven’t had a real conversation in three years.",
      complication: "Cleaning out the shop, they find their mother’s recipe book. Every page hides a note about each sister, and one recipe is missing. A buyer arrives early and offers more money if they sign tonight.",
      resolution: "Baking the missing recipe from memory forces the sisters to say what they’ve held back. They turn down the offer, and agree to run the bakery together, with Leela staying one more month to try.",
    },
    whyThisStructure:
      "The setup gives a deadline and a split: sell or keep. The complication adds a secret and a rival offer. The resolution shows the sisters choosing each other, which is the real answer to the question.",
    analysis: {
      centralQuestion: "Will the sisters sell the bakery, or find a reason to keep both it and each other?",
      want: "Leela wants a quick sale. Anu wants to keep the bakery exactly as it is.",
      need: "To forgive each other and say what they never said.",
      stakes: "The bakery, their mother’s memory, and their relationship.",
      theme: "Grief is easier to carry together.",
      strengths: ["A single weekend gives the story a firm deadline.", "The recipe book gives each sister a reason to open up."],
      toStrengthen: ["Show one concrete argument from the past so the distance feels earned.", "Make the buyer’s offer tempting enough that saying no costs something."],
    },
  },
  characters: [
    person("rb-c1", "protagonist", "Leela", ["Late thirties, sharp bob, neat blazer that looks wrong in a flour-dusted shop.", "Efficient, guarded, uses humour to avoid feelings.", "To close the sale and get back to her life.", "She left to escape grief and now feels guilty for leaving Anu with it.", "Fast, practical, quietly sarcastic.", "From fixing things to feeling them."]),
    person("rb-c2", "antagonist", "Mr. Kapoor", ["Fifties, sleek jacket, keeps his car keys in his hand.", "Smooth, polite, always in a hurry.", "To buy the building cheap before the market changes.", "He sees every sentimental object as a negotiating tool.", "Warm and fast, like a salesman.", "Stays the same."]),
    person("rb-c3", "supporting", "Anu", ["Early thirties, sleeves rolled, flour on her cheek.", "Warm, stubborn, quick to take offence.", "To protect her mother’s bakery and her only home.", "She is angry at Leela for leaving but afraid of being alone.", "Teasing, loud, softer when she means it.", "From holding on to letting Leela in."]),
  ],
  storyBible: {
    tone: "Warm, funny, aching, with the smell of bread in every scene",
    characters: [
      { name: "Leela", role: "Hero", summary: "Older sister who left and now has to sell the bakery." },
      { name: "Anu", role: "Supporting", summary: "Younger sister who stayed and ran the ovens." },
      { name: "Mr. Kapoor", role: "Rival", summary: "Buyer pushing for a fast, cheap sale." },
    ],
    facts: ["Their mother died six weeks ago.", "The sale must be signed by Monday morning.", "The recipe book has one page torn out."],
  },
  scenes: [
    scene("rb-s1", 0, "INT. MOTHER'S BAKERY - EARLY MORNING", "The sisters meet in the shop and argue about the sale.", [
      ["action", "Chairs on tables. Anu kneads dough with more force than it needs. The door chimes. Leela stands there with a rolling suitcase."],
      ["character", "ANU"],
      ["dialogue", "You came."],
      ["character", "LEELA"],
      ["dialogue", "I came to sign papers. There’s a difference."],
      ["action", "Anu slams the dough on the counter. Flour puffs up between them."],
      ["character", "ANU"],
      ["parenthetical", "(smiling without humour)"],
      ["dialogue", "Good to see you too."],
    ]),
    scene("rb-s2", 1, "INT. BAKERY STOREROOM - NIGHT", "They find the recipe book and the missing page.", [
      ["action", "A dusty shelf. Leela lifts a tin box. Inside is a worn notebook with a ribbon."],
      ["character", "LEELA"],
      ["dialogue", "She kept a diary of every recipe."],
      ["character", "ANU"],
      ["dialogue", "Look at the margins. That’s us."],
      ["action", "Small drawings of two girls in aprons. Beneath one, a note: “Leela, too clever to stay.” Beneath the other: “Anu, too loyal to leave.”"],
      ["action", "Leela turns to the last page. It has been torn out."],
    ]),
  ],
};

const wrongFloor: StudioDraft = {
  ...EMPTY_DRAFT,
  idea: "a shy intern presses the wrong elevator button on her first day and walks into the CEO's surprise birthday party",
  storylineSourceIdea: "a shy intern presses the wrong elevator button on her first day and walks into the CEO's surprise birthday party",
  storyline: {
    correctedIdea: "A shy intern presses the wrong elevator button on her first day and walks into the CEO’s surprise birthday party.",
    corrections: [],
    synopsis: {
      setup: "Priya, a very shy intern, is terrified of being noticed on her first day at a huge company. She rehearses a perfect “hello” in the elevator and, in her panic, presses the wrong floor.",
      complication: "The doors open on the 40th floor, where everyone is hiding for the CEO’s surprise party. Mistaken for the cake delivery, Priya is handed a giant cake and told to jump out when the CEO walks in. When the lights come on, the CEO is not who anyone expected.",
      resolution: "Priya, still holding the cake, gives an accidentally brilliant speech. The CEO loves it, and Priya learns she doesn’t have to be invisible to belong.",
    },
    whyThisStructure:
      "The setup shows Priya’s fear of being seen. The complication forces her into the one situation she dreads most. The resolution lets her be seen and survive, which pays off the setup.",
    analysis: {
      centralQuestion: "Will Priya hide from attention, or discover she can handle being seen?",
      want: "To get through her first day without anyone noticing her.",
      need: "To believe she is worth noticing.",
      stakes: "Her new job and her self-belief.",
      theme: "Belonging starts when you let yourself be seen.",
      strengths: ["The wrong button is a funny, relatable trigger.", "A party gives lots of physical comedy."],
      toStrengthen: ["Make the CEO surprise the audience, not just the characters.", "Show one earlier moment where Priya stays quiet so her speech lands harder."],
    },
  },
  characters: [
    person("wf-c1", "protagonist", "Priya", ["Twenty-two, oversized blazer, lanyard clutched like a lifeline.", "Shy, observant, funnier in her head than out loud.", "To keep her job without being noticed.", "She believes if people really see her they’ll find her lacking.", "Quiet, apologises a lot, then surprisingly sharp.", "From apologising for existing to owning the room."]),
    person("wf-c2", "antagonist", "Greg", ["Forties, shiny shoes, headset he never takes off.", "Overconfident, bossy, secretly insecure.", "To make the party perfect so the CEO notices him.", "He cares more about looking important than being kind.", "Loud, jargon-heavy, says “circle back” a lot.", "Gets humbled."]),
    person("wf-c3", "supporting", "Dolly", ["Sixties, bright scarf, sits behind the reception desk.", "Warm, nosy, knows every secret in the building.", "To help the new intern and enjoy the chaos.", "She is lonely and loves being needed.", "Chatty, affectionate, calls everyone “darling”.", "Stays supportive."]),
  ],
  storyBible: {
    tone: "Light, quick, awkward comedy with a warm centre",
    characters: [
      { name: "Priya", role: "Hero", summary: "Shy intern on her first day." },
      { name: "Greg", role: "Rival", summary: "Party organiser who wants to impress the CEO." },
      { name: "Dolly", role: "Supporting", summary: "Receptionist who knows everything." },
    ],
    facts: ["The party is on the 40th floor.", "Priya meant to press 4.", "The cake is shaped like a giant stapler."],
  },
  scenes: [
    scene("wf-s1", 0, "INT. OFFICE ELEVATOR - MORNING", "Priya rehearses and presses the wrong button.", [
      ["action", "Priya alone in a mirrored elevator, whispering to her reflection."],
      ["character", "PRIYA"],
      ["parenthetical", "(practising)"],
      ["dialogue", "Hi. I’m Priya. I’m… very excited. Too much. Hi. I’m Priya."],
      ["action", "Her phone buzzes. She fumbles it, drops it, and elbows the panel. Every light on the 40s lights up."],
      ["character", "PRIYA"],
      ["dialogue", "No, no, no."],
    ]),
    scene("wf-s2", 1, "INT. 40TH FLOOR PARTY ROOM - MORNING", "Priya is mistaken for the cake delivery.", [
      ["action", "The doors open. Thirty people crouch behind desks. Greg whips round, headset blinking."],
      ["character", "GREG"],
      ["dialogue", "You’re the cake! Finally. Get in position, he’s two minutes out."],
      ["action", "He shoves a huge stapler-shaped cake into Priya’s arms. She opens her mouth to explain. Nothing comes out."],
      ["character", "DOLLY"],
      ["parenthetical", "(whispering)"],
      ["dialogue", "Just smile, darling. They’ll never know."],
    ]),
  ],
};

type El = [BoardElement["kind"], string, number, number, number, BoardElement["facing"]];

const shot = (id: string, order: number, shotType: string, cameraAngle: string, movement: string, description: string, reasoning: string): Shot => ({
  id, order, shotType, cameraAngle, movement, description, reasoning,
});

const frame = (
  shotType: string,
  cameraAngle: string,
  movement: StoryboardPanel["movement"],
  setting: StoryboardPanel["setting"],
  time: StoryboardPanel["time"],
  horizon: number,
  elements: El[],
  caption: string,
  dialogue = "",
): StoryboardPanel => ({
  shotType, cameraAngle, movement, setting, time, horizon,
  elements: elements.map(([kind, label, x, y, scale, facing]) => ({ kind, label, x, y, scale, facing })),
  caption, dialogue,
});

interface SceneBoard {
  coverageNotes: string;
  shots: Shot[];
  panels: StoryboardPanel[];
}

/** Hand-made camera plans and storyboards, so the examples show the whole journey, not just the script. */
const BOARDS: Record<string, SceneBoard> = {
  "lf-s1": {
    coverageNotes: "Keep the camera low and close to Mara so the crowded deck feels tight. Save the wide shot for the moment she realises she is not alone.",
    shots: [
      shot("lf-s1-1", 0, "Wide", "Eye level", "Static", "The long passenger deck, rows of sleepy people, Mara walking the aisle with her clicker.", "Shows the closed space she has to search."),
      shot("lf-s1-2", 1, "Close-up", "Low angle", "Push in", "Mara's lips move as she counts. Her face tightens on forty-one.", "A slow push in makes a simple number feel like a threat."),
      shot("lf-s1-3", 2, "Insert", "High angle", "Static", "The ticket machine on her wrist reads 40.", "The detail proves the count is impossible."),
    ],
    panels: [
      frame("Wide", "Eye level", "static", "interior", "night", 58, [["window", "", 82, 36, 2, "camera"], ["object", "seat", 30, 70, 2, "camera"], ["object", "seat", 62, 70, 2, "camera"], ["person", "Mara", 46, 92, 3, "right"]], "Mara walks the rows of the last ferry, counting under her breath.", "Thirty-nine. Forty."),
      frame("Close-up", "Low angle", "push-in", "interior", "night", 70, [["person", "Mara", 50, 96, 6, "camera"]], "Her lips stop. The count has gone wrong.", "Forty-one."),
      frame("Insert", "High angle", "static", "interior", "night", 40, [["object", "40", 50, 78, 5, "camera"]], "The ticket machine says forty. She counted forty-one."),
    ],
  },
  "lf-s2": {
    coverageNotes: "Mix tight shots on Mara with Mr. Voss framed small in the doorway, so he feels like a patient threat. Keep the engine noise in mind: every pause should feel loud.",
    shots: [
      shot("lf-s2-1", 0, "Wide", "Low angle", "Static", "Pipes and steam. Mara and the boy crouched behind machinery.", "Shows how small and hidden they are."),
      shot("lf-s2-2", 1, "Over the shoulder", "Eye level", "Pan right", "Over Mara's shoulder, Mr. Voss folds his umbrella at the foot of the stairs.", "Puts us in her position, watching him come closer."),
      shot("lf-s2-3", 2, "Close-up", "Eye level", "Push in", "Mara's face as she lies about the count.", "All the tension lands on one steady face."),
    ],
    panels: [
      frame("Wide", "Low angle", "static", "interior", "night", 40, [["object", "pipes", 28, 58, 3, "camera"], ["person", "Mara", 42, 90, 3, "right"], ["person", "Boy", 56, 92, 2, "left"], ["person", "Mr. Voss", 84, 70, 1, "left"]], "Mara and the boy hide behind the pipes while Mr. Voss reaches the stairs.", "He said he was my uncle. He's not."),
      frame("Over the shoulder", "Eye level", "pan-right", "interior", "night", 55, [["person", "Mara", 18, 100, 6, "away"], ["person", "Mr. Voss", 66, 78, 3, "left"]], "Over Mara's shoulder, Mr. Voss smiles politely.", "I'm missing a passenger."),
      frame("Close-up", "Eye level", "push-in", "interior", "night", 60, [["person", "Mara", 50, 96, 6, "camera"]], "Mara keeps her face still.", "I counted forty."),
    ],
  },
  "rb-s1": {
    coverageNotes: "Shoot the two sisters from opposite sides of the counter so the space between them is part of the story. Warm light, flour in the air.",
    shots: [
      shot("rb-s1-1", 0, "Wide", "Eye level", "Static", "The bakery before opening: chairs on tables, Anu kneading, Leela in the doorway.", "Sets up the place and the distance between them."),
      shot("rb-s1-2", 1, "Medium", "Eye level", "Pan left", "Anu slams the dough down and flour puffs up between them.", "The cloud of flour is the argument made visible."),
      shot("rb-s1-3", 2, "Close-up", "Eye level", "Static", "Anu's smile that isn't a smile.", "A small face does the final emotional work."),
    ],
    panels: [
      frame("Wide", "Eye level", "static", "interior", "day", 58, [["table", "", 30, 80, 3, "camera"], ["person", "Anu", 28, 90, 3, "right"], ["door", "", 82, 74, 3, "camera"], ["person", "Leela", 82, 92, 3, "left"]], "Anu kneads dough. Leela stands in the doorway with her suitcase.", "You came."),
      frame("Medium", "Eye level", "pan-left", "interior", "day", 55, [["table", "", 50, 85, 4, "camera"], ["person", "Anu", 70, 92, 4, "left"], ["person", "Leela", 22, 92, 4, "right"]], "Anu slams the dough down. Flour hangs in the air between them.", "I came to sign papers."),
      frame("Close-up", "Eye level", "static", "interior", "day", 62, [["person", "Anu", 50, 96, 6, "camera"]], "Anu smiles without any warmth.", "Good to see you too."),
    ],
  },
  "rb-s2": {
    coverageNotes: "Slow and tender. Let the notebook be the star: close shots on the margins, then pull back to the sisters reading together.",
    shots: [
      shot("rb-s2-1", 0, "Medium", "High angle", "Static", "Leela lifts a tin box from a dusty shelf.", "The high angle makes the box feel like a discovery."),
      shot("rb-s2-2", 1, "Insert", "Overhead", "Pan right", "The margins: two small drawings of girls in aprons and the notes beneath.", "The audience reads what the sisters read."),
      shot("rb-s2-3", 2, "Close-up", "Eye level", "Push in", "Leela turns to the last page. It has been torn out.", "A quiet push in turns a small detail into a mystery."),
    ],
    panels: [
      frame("Medium", "High angle", "static", "interior", "night", 48, [["object", "shelf", 30, 60, 3, "camera"], ["person", "Leela", 62, 92, 4, "left"], ["object", "tin", 56, 70, 2, "camera"]], "Leela lifts a tin box from a dusty storeroom shelf."),
      frame("Insert", "Overhead", "pan-right", "interior", "night", 30, [["object", "notebook", 50, 76, 6, "camera"]], "The margins hold two little drawings of girls in aprons.", "Look at the margins. That's us."),
      frame("Close-up", "Eye level", "push-in", "interior", "night", 60, [["person", "Leela", 50, 96, 6, "camera"], ["object", "page", 80, 70, 2, "camera"]], "She reaches the last page. It has been torn out."),
    ],
  },
  "wf-s1": {
    coverageNotes: "Everything happens in a mirrored box, so use the reflections: Priya talking to herself is the joke, and the panic is the punchline.",
    shots: [
      shot("wf-s1-1", 0, "Medium", "Eye level", "Static", "Priya in the elevator, whispering to her reflection.", "Gets us inside her nerves in one image."),
      shot("wf-s1-2", 1, "Insert", "High angle", "Handheld", "Her phone buzzes, slips, and her elbow hits the panel.", "Handheld shakiness matches her fumbling."),
      shot("wf-s1-3", 2, "Insert", "Eye level", "Push in", "Every floor in the 40s lights up.", "The consequence arrives as a clear picture."),
    ],
    panels: [
      frame("Medium", "Eye level", "static", "interior", "day", 55, [["door", "", 22, 74, 3, "camera"], ["person", "Priya", 62, 92, 4, "left"]], "Priya rehearses her hello in the elevator mirror.", "Hi. I'm Priya."),
      frame("Insert", "High angle", "handheld", "interior", "day", 40, [["object", "phone", 30, 72, 3, "camera"], ["object", "panel", 70, 76, 3, "camera"]], "The phone buzzes, she drops it, and her elbow hits the panel."),
      frame("Insert", "Eye level", "push-in", "interior", "day", 50, [["light", "", 50, 70, 4, "camera"]], "Every light in the forties glows at once.", "No, no, no."),
    ],
  },
  "wf-s2": {
    coverageNotes: "Play it like a farce: wide shots to show how many people are hiding, then tight on Priya's blank face as the cake lands in her arms.",
    shots: [
      shot("wf-s2-1", 0, "Wide", "Eye level", "Static", "The doors open on thirty people crouched behind desks.", "The size of the surprise party is the joke."),
      shot("wf-s2-2", 1, "Medium", "Low angle", "Push in", "Greg shoves a stapler-shaped cake into Priya's arms.", "A low angle makes Greg loom and the cake look ridiculous."),
      shot("wf-s2-3", 2, "Close-up", "Eye level", "Static", "Priya opens her mouth to explain. Nothing comes out.", "Silence is funnier than any line."),
    ],
    panels: [
      frame("Wide", "Eye level", "static", "interior", "day", 52, [["table", "", 24, 74, 3, "camera"], ["table", "", 62, 74, 3, "camera"], ["person", "Greg", 40, 88, 2, "right"], ["door", "", 86, 72, 3, "camera"], ["person", "Priya", 86, 94, 3, "left"]], "Thirty people crouch behind desks as the elevator doors open.", "You're the cake!"),
      frame("Medium", "Low angle", "push-in", "interior", "day", 38, [["person", "Greg", 28, 96, 5, "right"], ["person", "Priya", 70, 96, 4, "left"], ["object", "cake", 62, 70, 3, "camera"]], "Greg shoves a huge stapler-shaped cake into Priya's arms.", "Get in position."),
      frame("Close-up", "Eye level", "static", "interior", "day", 62, [["person", "Priya", 50, 96, 6, "camera"]], "Priya opens her mouth to explain. Nothing comes out."),
    ],
  },
};

/** Attaches the hand-made boards to the scenes they belong to. */
function withBoards(draft: StudioDraft): StudioDraft {
  return {
    ...draft,
    scenes: draft.scenes.map((sc) => {
      const board = BOARDS[sc.id];
      return board
        ? { ...sc, shotList: { coverageNotes: board.coverageNotes, shots: board.shots }, storyboard: { panels: board.panels } }
        : sc;
    }),
  };
}

export const EXAMPLES: ExampleStory[] = [
  {
    id: "the-last-ferry",
    title: "The Last Ferry",
    genre: "Thriller",
    blurb: "A deckhand counts one passenger too many, and has twenty minutes to find out why.",
    draft: withBoards(lastFerry),
  },
  {
    id: "mothers-recipe-book",
    title: "Mother’s Recipe Book",
    genre: "Drama",
    blurb: "Two sisters, one weekend, and a bakery neither of them can bear to sell.",
    draft: withBoards(recipeBook),
  },
  {
    id: "wrong-floor",
    title: "Wrong Floor",
    genre: "Comedy",
    blurb: "A shy intern presses the wrong button and ends up holding the CEO’s birthday cake.",
    draft: withBoards(wrongFloor),
  },
];
