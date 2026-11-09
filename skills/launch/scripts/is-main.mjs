// True when this module is the script node was asked to run, also when it was reached through a symlink.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isMainModule(moduleUrl, scriptPath = process.argv[1]) {
  if (!scriptPath) return false;
  try {
    return realpathSync(scriptPath) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false; // A script path that does not exist on disk is not this module.
  }
}
