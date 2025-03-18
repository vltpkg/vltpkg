/**
 * A list of folder names that are ignored when reading the user's home dir.
 *
 * Note: these are lower-case, must be compared case-insensitively.
 */
export const ignoredHomedirFolderNames = [
  'downloads',
  'movies',
  'music',
  'pictures',
  'private',
  'library',
  'dropbox',
].concat(
  process.platform === 'darwin' ?
    [
      'public',
      'private',
      'applications',
      'applications (parallels)',
      'sites',
      'sync',
    ]
  : process.platform === 'win32' ?
    [
      'appdata',
      'application data',
      'favorites',
      'links',
      'videos',
      'contacts',
      'searches',
    ]
  : ['videos', 'public'],
)
