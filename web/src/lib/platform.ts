export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export const CMD = isMac ? "⌘" : "Ctrl";
