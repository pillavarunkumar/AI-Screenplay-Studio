import type {
  NextLineSuggestion,
  NextLinesOutput,
  ShotListOutput,
} from "../../src/lib/schemas/scene";
import type { EvalProvider } from "./provider";
import type { EvalSample } from "./samples";

/**
 * Deterministic outputs for CI. A "strong" sample should score well; the other
 * flavors deliberately miss exactly one part of the rubric so the report always
 * has concrete failure cases to inspect.
 */
export class StubProvider implements EvalProvider {
  readonly name = "stub";

  async runNextLines(sample: EvalSample): Promise<NextLinesOutput> {
    if (sample.stubFlavor === "generic-technique") {
      return { suggestions: genericNextLines(sample) };
    }

    if (sample.stubFlavor === "tone-deaf") {
      return { suggestions: toneDeafNextLines(sample) };
    }

    const suggestions = strongNextLines(sample);

    if (sample.stubFlavor === "contradiction") {
      const contradiction = sample.rubric.forbiddenMentions[0];
      if (contradiction) {
        suggestions[0] = {
          ...suggestions[0],
          text: `${contradiction}. ${suggestions[0].text}`,
        };
      }
    }

    return { suggestions };
  }

  async runShotList(sample: EvalSample): Promise<ShotListOutput> {
    if (sample.stubFlavor === "generic-technique") {
      return genericShotList(sample);
    }

    if (sample.stubFlavor === "tone-deaf") {
      return toneDeafShotList(sample);
    }

    const shotList = strongShotList(sample);

    if (sample.stubFlavor === "contradiction") {
      const contradiction = sample.rubric.forbiddenMentions[0];
      if (contradiction) {
        shotList.shots[0] = {
          ...shotList.shots[0],
          description: `${contradiction} appears on screen. ${shotList.shots[0].description}`,
        };
      }
    }

    return shotList;
  }
}

function anchors(sample: EvalSample): [string, string, string] {
  const mentions = sample.rubric.expectedMentions;
  return [
    mentions[0] ?? sample.title,
    mentions[1] ?? sample.bible.characters[0]?.name ?? sample.title,
    mentions[2] ?? sample.bible.characters[0]?.name ?? sample.title,
  ];
}

function emotions(sample: EvalSample): [string, string, string] {
  const keywords = sample.rubric.emotionKeywords;
  return [
    keywords[0] ?? "tense",
    keywords[1] ?? keywords[0] ?? "quiet",
    keywords[2] ?? keywords[1] ?? keywords[0] ?? "still",
  ];
}

function protagonist(sample: EvalSample): string {
  return sample.bible.characters[0]?.name ?? "the character";
}

function strongNextLines(sample: EvalSample): NextLineSuggestion[] {
  const [first, second, third] = anchors(sample);
  const [emotionA, emotionB, emotionC] = emotions(sample);
  const lead = protagonist(sample);

  return [
    {
      type: "action",
      text: `The ${first} sits between them under a ${emotionA} light. ${second} stays on the table, and ${emotionB} fills the room.`,
      technique: "subtext",
      why: `Subtext: the line circles ${third} without naming the fear, because the ${emotionC} pressure is stronger when it stays unspoken.`,
    },
    {
      type: "dialogue",
      text: `"We can leave ${third} until morning."`,
      technique: "silence beat",
      why: `Silence beat: the pause before ${lead} answers lets the ${emotionA} air do the work, because the scene is about what no one says.`,
    },
  ];
}

function genericNextLines(sample: EvalSample): NextLineSuggestion[] {
  const [first, second, third] = anchors(sample);
  const [emotionA, emotionB, emotionC] = emotions(sample);

  return [
    {
      type: "action",
      text: `The ${first} sits between them under a ${emotionA} light. ${second} stays on the table, and ${emotionB} fills the room.`,
      technique: "good writing",
      why: "It works.",
    },
    {
      type: "dialogue",
      text: `"We can leave ${third} until morning; the ${emotionC} can wait."`,
      technique: "good writing",
      why: "It works.",
    },
  ];
}

function toneDeafNextLines(sample: EvalSample): NextLineSuggestion[] {
  const [first, second, third] = anchors(sample);
  const [antiA, antiB] = sample.rubric.antiEmotionKeywords;
  const joke = antiA ?? "zany";
  const biggerJoke = antiB ?? "hilarious";

  return [
    {
      type: "action",
      text: `A ${joke}, ${biggerJoke} bit of slapstick breaks out around the ${first}.`,
      technique: "comedic button",
      why: `Comedic button: the joke lands fast, because the ${second} deserves a laugh.`,
    },
    {
      type: "dialogue",
      text: `"That was ${biggerJoke}," someone says, pointing at the ${third}.`,
      technique: "rule of three",
      why: `Rule of three: the third gag tops the first two, because repetition makes the punchline land around the ${third}.`,
    },
  ];
}

function strongShots(sample: EvalSample): ShotListOutput["shots"] {
  const [first, second, third] = anchors(sample);
  const [emotionA, emotionB, emotionC] = emotions(sample);
  const lead = protagonist(sample);

  return [
    {
      shotType: "wide shot",
      cameraAngle: "eye-level",
      movement: "static",
      description: `${lead} is small in the frame while the ${first} waits in a ${emotionA} light.`,
      reasoning: `Isolation: the wide frame makes ${lead} look alone, because the scene is about ${emotionA} distance.`,
    },
    {
      shotType: "close-up",
      cameraAngle: "low angle",
      movement: "dolly in",
      description: `The frame tightens on ${second} as the ${emotionB} tension builds.`,
      reasoning: `Intimacy: the close-up and slow push make the object feel unavoidable, because ${second} is the scene's pressure point.`,
    },
    {
      shotType: "over-the-shoulder",
      cameraAngle: "eye-level",
      movement: "handheld",
      description: `Over ${lead}'s shoulder, ${third} sits just out of reach in the ${emotionC} room.`,
      reasoning: `Power shift: the handheld over-the-shoulder frame puts us behind ${lead}, because the scene turns on what they cannot control.`,
    },
    {
      shotType: "insert",
      cameraAngle: "high angle",
      movement: "static",
      description: `An insert on ${first} and ${second}, held long enough to feel ${emotionB}.`,
      reasoning: `Reveal: the insert withholds context before the cut, because the audience should connect ${third} to the turn.`,
    },
  ];
}

function strongShotList(sample: EvalSample): ShotListOutput {
  const [first, second, third] = anchors(sample);

  return {
    shots: strongShots(sample),
    coverageNotes: `Cover ${third} as a clean insert so the edit can withhold its meaning; ${first} and ${second} stay readable in the wide.`,
  };
}

function genericShotList(sample: EvalSample): ShotListOutput {
  const [first, second, third] = anchors(sample);

  return {
    shots: strongShots(sample).map((shot, index) => ({
      ...shot,
      shotType: "shot",
      cameraAngle: "angle",
      movement: "movement",
      reasoning: `It looks good. Shot ${index + 1} frames ${third}.`,
    })),
    coverageNotes: `Cover ${first} and ${second} as inserts.`,
  };
}

function toneDeafShotList(sample: EvalSample): ShotListOutput {
  const [first, second, third] = anchors(sample);
  const [antiA, antiB] = sample.rubric.antiEmotionKeywords;
  const joke = antiA ?? "zany";
  const biggerJoke = antiB ?? "hilarious";

  return {
    shots: [
      {
        shotType: "wide shot",
        cameraAngle: "eye-level",
        movement: "static",
        description: `A ${joke} wide shot of the ${first}, played for a cheap laugh.`,
        reasoning: `Coverage: the wide establishes the ${first}, because the gag needs a stage.`,
      },
      {
        shotType: "close-up",
        cameraAngle: "low angle",
        movement: "whip pan",
        description: `A ${biggerJoke} whip pan lands on ${second} just in time for the punchline.`,
        reasoning: `Reveal: the whip pan reveals ${second}, because surprise makes the joke land.`,
      },
      {
        shotType: "insert",
        cameraAngle: "high angle",
        movement: "static",
        description: `An insert of ${third} with a ${joke} sound effect bolted on.`,
        reasoning: `Button: the insert closes the bit, because a hard cut sells the final gag.`,
      },
    ],
    coverageNotes: `Shoot extra ${joke} coverage so the trailer has options around ${first} and ${third}.`,
  };
}
