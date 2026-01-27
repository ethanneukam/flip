const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateNextPermutation(lastTicker: string): string {
  let chars = lastTicker.split("");
  let i = chars.length - 1;

  while (i >= 0) {
    let charIndex = CHARS.indexOf(chars[i]);
    
    if (charIndex < CHARS.length - 1) {
      // Increment this character and stop
      chars[i] = CHARS[charIndex + 1];
      return chars.join("");
    } else {
      // This character is '9', reset to 'A' and move left
      chars[i] = CHARS[0];
      i--;
    }
  }

  // If we get here, we reached '999...', so add a new digit
  return CHARS[0] + chars.map(() => CHARS[0]).join("");
}
