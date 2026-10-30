export const STORY_STARTERS = [
  { genre: "Thriller", idea: "a night-shift paramedic realises every patient she picks up is connected to the same unsolved disappearance" },
  { genre: "Drama", idea: "two estranged sisters have one weekend to sell their late mother's bakery, and find her secret recipe book" },
  { genre: "Sci-fi", idea: "the last human on a generation ship discovers the AI that raised her has been lying about where they are going" },
  { genre: "Comedy", idea: "a retired magician accidentally becomes the bodyguard of a shy pop star on a chaotic tour" },
  { genre: "Mystery", idea: "a lighthouse keeper finds a message in a bottle written in her own handwriting, dated ten years from now" },
  { genre: "Romance", idea: "a train announcer and a night-bus driver fall in love through the late-night radio messages they leave each other" },
  { genre: "Horror", idea: "a family moves into a house where every mirror shows the room as it was the night someone vanished" },
  { genre: "Adventure", idea: "a teenage cartographer finds a map that redraws itself and leads to a city that does not exist yet" },
] as const;

export function randomStarter(exclude?: string) {
  const options = STORY_STARTERS.filter((s) => s.idea !== exclude);
  return options[Math.floor(Math.random() * options.length)];
}
