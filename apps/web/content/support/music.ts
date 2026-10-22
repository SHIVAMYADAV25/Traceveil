import type { Track } from "@/lib/support/types";

/**
 * Six tracks, picked by when you might need them rather than by genre.
 * Half are instrumental, because lyrics about love or loss can land hard on a bad day.
 */
export const TRACKS: Track[] = [
  {
    id: "weightless",
    title: "Weightless",
    artist: "Marconi Union",
    year: 2011,
    tone: "calm",
    forWhen: "When your thoughts are racing",
    voice: "Instrumental",
    language: "No lyrics",
    why: "Slow, ambient and without a beat to follow. Made with sound therapists to help people unwind.",
  },
  {
    id: "gymnopedie-1",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    year: 1888,
    tone: "quiet",
    forWhen: "When you can't sleep",
    voice: "Instrumental",
    language: "No lyrics",
    why: "Solo piano at a walking pace, about three minutes. Many recordings exist; any will do.",
  },
  {
    id: "nuvole-bianche",
    title: "Nuvole Bianche",
    artist: "Ludovico Einaudi",
    year: 2004,
    tone: "brand",
    forWhen: "When you need to cry",
    voice: "Instrumental",
    language: "No lyrics",
    why: "Gentle piano that doesn't tell you how to feel. Lets feelings come without pushing them.",
  },
  {
    id: "kun-faya-kun",
    title: "Kun Faya Kun",
    artist: "A. R. Rahman, Javed Ali, Mohit Chauhan",
    year: 2011,
    tone: "warm",
    forWhen: "When you want to feel held",
    voice: "With vocals",
    language: "Hindi / Urdu",
    why: "A Sufi-inspired song from the film Rockstar. Slow build, warm voices, and a sense of being looked after.",
  },
  {
    id: "brave",
    title: "Brave",
    artist: "Sara Bareilles",
    year: 2013,
    tone: "safe",
    forWhen: "When you're ready to speak up",
    voice: "With vocals",
    language: "English",
    why: "About saying the true thing out loud. Upbeat but not loud. Save it for when you feel steadier.",
  },
  {
    id: "here-comes-the-sun",
    title: "Here Comes the Sun",
    artist: "The Beatles",
    year: 1969,
    tone: "care",
    forWhen: "When you want a lighter hour",
    voice: "With vocals",
    language: "English",
    why: "Short, familiar and kind, with nothing in the lyrics to brace for.",
  },
];
