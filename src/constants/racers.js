export const MAX_RACERS = 10

// Expanded palette to support up to 10 distinct racers
export const RACER_HUES = [0, 30, 60, 120, 180, 210, 240, 270, 300, 330]

// Maps keyboard keys to racer indices (1-9,0 -> 0-9)
export const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export const getHueForIndex = (index = 0) => RACER_HUES[index % RACER_HUES.length]

