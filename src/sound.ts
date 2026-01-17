import { spawn } from "bun";

export type SoundName = "Glass" | "Submarine" | "Ping" | "Basso" | "Frog" | "Hero" | "Morse" | "Pop" | "Purr" | "Sosumi" | "Tink";

export async function notify(message: string, title: string = "Pomolocal", sound: SoundName = "Glass") {
  try {
    const script = `display notification "${message}" with title "${title}" sound name "${sound}"`;
    await spawn(["osascript", "-e", script]);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
