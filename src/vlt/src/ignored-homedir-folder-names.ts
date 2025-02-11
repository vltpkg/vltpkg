/**
 * A list of folder names that are ignored when reading the user's home dir.
 */
export const ignoredHomedirFolderNames = [
  'Downloads',
  'Movies',
  'Music',
  'Pictures',
].concat(
  process.platform === 'darwin' ? ['Library', 'Public']
  : process.platform === 'win32' ?
    [
      'AppData',
      'Application Data',
      'Favorites',
      'Links',
      'Videos',
      'Contacts',
      'Searches',
    ]
  : ['Videos', 'Public'],
)
