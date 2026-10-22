import type { CalmAudio } from "@/lib/support/types";

/**
 * Direct links only, no search pages. We link out. We do not embed or host any audio.
 * None of these is a treatment. They are something to put on.
 * verifiedBy "workbook": link taken from the team workbook (tested 21 Oct 2026), not yet re-opened by us.
 */
export const CALM_AUDIO: CalmAudio[] = [
  {
    id: "calm-piano-playlist",
    title: "Peaceful Piano",
    by: "Spotify playlist",
    sound: "Instrumental",
    forWhen: "When you want something gentle in the background",
    tone: "calm",
    spotify: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
  {
    id: "calm-ambient-playlist",
    title: "Ambient Relaxation",
    by: "Spotify playlist",
    sound: "Instrumental",
    forWhen: "When you can't stand silence but can't stand a tune either",
    tone: "quiet",
    spotify: "https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
  {
    id: "calm-20-min",
    title: "20 minutes of calm instrumental music",
    by: "InnerStillness, on YouTube",
    sound: "Instrumental",
    forWhen: "When you need twenty minutes to sit",
    length: "20 min",
    tone: "safe",
    youtube: "https://youtu.be/pl_n6QSyNVM",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
  {
    id: "calm-sleep-piano",
    title: "Flying (piano for sleep)",
    by: "Peder B. Helland. Playlist: Rain & Piano Sounds",
    sound: "Instrumental",
    forWhen: "When you are trying to sleep",
    tone: "quiet",
    youtube: "https://www.youtube.com/watch?v=1ZYbU82GVz4",
    spotify: "https://open.spotify.com/playlist/3w6uBx7sCbRoKE3iImlxgd",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
  {
    id: "calm-guided-10",
    title: "Guided mindfulness, 10 minutes",
    by: "The Honest Guys, on YouTube",
    sound: "Guided voice",
    forWhen: "When you want a voice to follow",
    length: "10 min",
    tone: "brand",
    youtube: "https://www.youtube.com/watch?v=6p_yaNFSYao",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
  {
    id: "calm-nature",
    title: "Sounds of nature",
    by: "Spotify playlist",
    sound: "Nature sounds",
    forWhen: "When music is too much",
    tone: "safe",
    spotify: "https://open.spotify.com/playlist/37i9dQZF1DX1tuUiirhaT3",
    checkedOn: "2026-10-21",
    verifiedBy: "workbook",
  },
];
