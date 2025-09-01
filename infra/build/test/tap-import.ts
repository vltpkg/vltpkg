/**
 * Windows-specific workaround for tap import issues
 *
 * On Windows CI, Node.js has trouble resolving the 'tap' module import,
 * causing ERR_MODULE_NOT_FOUND errors. This helper module provides a
 * consistent way to import tap across all platforms by centralizing
 * the import in one location.
 *
 * This workaround addresses the issue where Windows Node.js suggests
 * using 'tap/dist/commonjs/index.js' but that path is not exported
 * by the tap package.
 */

import tap from 'tap'
export default tap
export type { Test } from 'tap'
