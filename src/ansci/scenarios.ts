/**
 * scenarios.ts — the four scripted transcript scenarios of Slice C,
 * shared by the transcript harness (scripts/ansci-transcript.mjs) and
 * the turn-loop tests, so the file the user reads and the behaviour
 * the tests pin can never drift apart.
 */
export interface Scenario {
  name: string;
  title: string;
  turns: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    name: "anger-news",
    title: "Anger at the news (generating toward expression, then restraint)",
    turns: ["I heard the news.", "I was furious.", "I shouted at him."],
  },
  {
    name: "worry-sleep",
    title: "Worry restraining sleep (controlling: address the restrainer)",
    turns: ["I can't sleep.", "I was worried."],
  },
  {
    name: "winter-cold",
    title: "Why is winter cold? (answer from the shared-prior derivation)",
    turns: ["Why is winter cold?", "Is summer hot?", "Why is winter dark?"],
  },
  {
    name: "soup",
    title: "Making soup (events, pronoun resolution, next-step closure)",
    turns: ["I made the soup yesterday.", "It needs more salt.", "I put the salt in the soup."],
  },
];
