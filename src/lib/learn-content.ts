/*
 * Learn is for understanding: how a script works, how a story is built, and how
 * to use the studio. (Examples, by contrast, shows finished stories.)
 */

export type ScriptPartKind = "heading" | "action" | "character" | "parenthetical" | "dialogue" | "transition";

export interface AnatomyLine {
  kind: ScriptPartKind;
  text: string;
  /** What this part is and why it exists. */
  note: string;
}

export const ANATOMY: AnatomyLine[] = [
  { kind: "heading", text: "INT. LIGHTHOUSE KITCHEN - NIGHT", note: "Scene heading: inside or outside, the place, and the time of day. Every scene starts with one." },
  { kind: "action", text: "Rain hammers the window. Nora drops a box of letters on the table.", note: "Action: what we can see and hear, in the present tense. No thoughts, only things a camera could catch." },
  { kind: "character", text: "NORA", note: "Character: the speaker's name in capitals, just above what they say." },
  { kind: "parenthetical", text: "(quietly)", note: "Parenthetical: a tiny acting hint. Use it only when the line could be read two ways." },
  { kind: "dialogue", text: "Who writes this many letters to someone they never mention?", note: "Dialogue: the words they speak, kept short and natural." },
  { kind: "transition", text: "CUT TO:", note: "Transition: how the scene ends. You almost never need one." },
];

export interface StoryPart {
  name: string;
  question: string;
  tips: string[];
  color: string;
}

export const STORY_PARTS: StoryPart[] = [
  {
    name: "Beginning",
    question: "Who is the hero, and what do they want?",
    tips: ["Show their ordinary life in one or two vivid details.", "Give them a want you can say in one sentence.", "Hint at what stands in their way."],
    color: "border-sky-300 bg-sky-50",
  },
  {
    name: "Middle",
    question: "What goes wrong, and what is now at risk?",
    tips: ["Something happens that makes the want harder.", "Raise the stakes: something precious could be lost.", "Each scene should change the situation."],
    color: "border-amber-300 bg-amber-50",
  },
  {
    name: "End",
    question: "What does the hero choose, and what does it cost?",
    tips: ["The choice must come from the hero, not from luck.", "It should cost them something real.", "Show who they have become."],
    color: "border-emerald-300 bg-emerald-50",
  },
];

export interface DialogueFix {
  weak: string;
  better: string;
  why: string;
}

export const DIALOGUE_FIXES: DialogueFix[] = [
  {
    weak: "I am very angry that you forgot my birthday.",
    better: "Nice of you to come. The cake went off an hour ago.",
    why: "Subtext: she shows the anger without naming it.",
  },
  {
    weak: "As you know, Dad, the farm has had no rain for two years.",
    better: "Look at the well, Dad. Then tell me to stay.",
    why: "No explaining facts both people already know.",
  },
  {
    weak: "Hello! How are you? I am fine too. Anyway…",
    better: "You're late.",
    why: "Start in the middle. Cut greetings and small talk.",
  },
];

export interface CameraRow {
  term: string;
  meaning: string;
  use: string;
}

export const CAMERA_SIZES: CameraRow[] = [
  { term: "Wide shot", meaning: "The whole place, people look small.", use: "Show where we are, or how alone someone is." },
  { term: "Medium shot", meaning: "A person from the waist up.", use: "Normal conversation and action." },
  { term: "Close-up", meaning: "A face or a small object fills the frame.", use: "Show a feeling or an important detail." },
  { term: "Over the shoulder", meaning: "Behind one person, facing another.", use: "Make a two-person conversation feel connected." },
];

export const CAMERA_ANGLES: CameraRow[] = [
  { term: "Eye level", meaning: "Camera at the person's height.", use: "Neutral and honest." },
  { term: "Low angle", meaning: "Camera looks up at someone.", use: "Makes them look strong or threatening." },
  { term: "High angle", meaning: "Camera looks down.", use: "Makes them look small or trapped." },
];

export const CAMERA_MOVES: CameraRow[] = [
  { term: "Push in", meaning: "The camera slowly moves closer.", use: "Builds tension or focuses attention." },
  { term: "Pan", meaning: "The camera turns left or right.", use: "Follow a look or reveal something." },
  { term: "Handheld", meaning: "The camera shakes a little.", use: "Feels nervous and real." },
];

export interface StudioStep {
  title: string;
  doThis: string;
  youGet: string;
}

export const STUDIO_STEPS: StudioStep[] = [
  { title: "Name your story", doThis: "Press “Start writing” and pick a title and the language you want to write in.", youGet: "A saved story that autosaves as you go." },
  { title: "Say or type your idea", doThis: "In “Your story”, tap the mic or type. Then press “Build my story”.", youGet: "A tidy idea, a beginning, middle and end, and notes on what works." },
  { title: "Create your characters", doThis: "Press “Create characters”. The AI finds every character in your idea, keeping any names you gave. Edit anything you don't like.", youGet: "A profile for each one (usually three to six), with a voice and a goal." },
  { title: "Plan, then write the scenes", doThis: "Press “Plan my scenes”. In each scene, write yourself, ask for “ideas for the next line”, or press “✨ Write this scene for me”.", youGet: "A correctly formatted script, scene by scene." },
  { title: "Storyboard and download", doThis: "Draw the storyboard, check the “Final draft check”, translate if you like, then download.", youGet: "A PDF or text script, plus storyboard frames." },
  { title: "Or let the AI do it all", doThis: "Press “Write my whole story”. It only fills in what is missing.", youGet: "Everything above, in a few minutes. You can edit afterwards." },
];

export interface GlossaryTerm {
  term: string;
  meaning: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "Beat", meaning: "A small moment where something changes in a scene." },
  { term: "CONT'D", meaning: "“Continued”. Added when the same person keeps speaking after an action line." },
  { term: "Coverage", meaning: "All the shots you plan so a scene can be edited together." },
  { term: "INT. / EXT.", meaning: "Inside or outside. They start every scene heading." },
  { term: "Logline", meaning: "One sentence that sells your story: who, what they want, what's in the way." },
  { term: "O.S. / V.O.", meaning: "Off-screen (we hear them but can't see them) or voice-over (a narrator)." },
  { term: "Stakes", meaning: "What the hero could lose if they fail." },
  { term: "Subtext", meaning: "What a character really means underneath what they say." },
  { term: "Storyboard", meaning: "Drawn frames showing how each shot will look." },
  { term: "Story notebook", meaning: "The studio's memory of your tone, characters and facts, so the AI stays consistent." },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  { q: "Do I need to know screenwriting first?", a: "No. The studio sets out the format for you and the “Final draft check” points out mistakes. The guides above explain the few ideas that matter." },
  { q: "Which languages can I use?", a: "You can write, speak and convert a story in many languages, including Telugu, Hindi, Tamil, Telugish (Telugu in English letters), Spanish and French. Change it any time from “Story language”." },
  { q: "Does voice typing work in every browser?", a: "It works in Chrome, Edge and Safari. In other browsers you can still type your story." },
  { q: "Will the AI overwrite what I wrote?", a: "No. “Write my whole story” only fills in what's missing. Writing a single scene asks you first if the scene already has script." },
  { q: "Where is my story saved?", a: "In your account, automatically. Open it from any device under “My stories”." },
  { q: "How do I get my script out?", a: "Go to the Download step. You can get a PDF or a plain text file, in your story's language or a translation." },
];
