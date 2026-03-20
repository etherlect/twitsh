import { getMode, setMode } from "../config.js"
import type { Mode } from "../config.js"

export async function modeCommand(newMode?: string): Promise<void> {
  if (newMode !== undefined) {
    if (newMode !== "x402" && newMode !== "mpp") {
      console.error(
        JSON.stringify(
          { error: `Invalid mode: "${newMode}". Valid options: x402, mpp`, code: "INVALID_MODE" },
          null,
          2,
        ),
      )
      process.exit(1)
    }
    setMode(newMode as Mode)
    const message =
      newMode === "mpp"
        ? "Switched to MPP mode (Tempo chain, mpp.twit.sh)"
        : "Switched to x402 mode (Base chain, x402.twit.sh)"
    console.log(JSON.stringify({ mode: newMode, changed: true, message }, null, 2))
  } else {
    const mode = getMode()
    console.log(JSON.stringify({ mode, options: ["x402", "mpp"] }, null, 2))
  }
}
