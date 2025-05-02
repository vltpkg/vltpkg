import { describe, it, expect } from 'vitest'
import {
  getRepositoryUrl,
  normalizeUrl,
  getRepoOrigin,
  getRepositoryApiUrl,
} from '@/utils/get-repo-url.js'
import type { Repository } from '@vltpkg/types'

describe('normalizeUrl', () => {
  it('should remove git+ prefix', () => {
    expect(normalizeUrl('git+https://github.com/owner/repo')).toBe(
      'https://github.com/owner/repo',
    )
  })

  it('should remove .git suffix', () => {
    expect(normalizeUrl('https://github.com/owner/repo.git')).toBe(
      'https://github.com/owner/repo',
    )
  })

  it('should convert git:// protocol to https://', () => {
    expect(normalizeUrl('git://github.com/owner/repo')).toBe(
      'https://github.com/owner/repo',
    )
  })

  it('should add https:// if no protocol is present', () => {
    expect(normalizeUrl('github.com/owner/repo')).toBe(
      'https://github.com/owner/repo',
    )
  })

  it('should handle URL with both git+ prefix and .git suffix', () => {
    expect(
      normalizeUrl('git+https://github.com/owner/repo.git'),
    ).toBe('https://github.com/owner/repo')
  })

  it('should not modify URLs that already have http/https protocol', () => {
    expect(normalizeUrl('https://github.com/owner/repo')).toBe(
      'https://github.com/owner/repo',
    )
    expect(normalizeUrl('http://github.com/owner/repo')).toBe(
      'http://github.com/owner/repo',
    )
  })

  it('should remove trailing slash', () => {
    expect(normalizeUrl('https://github.com/owner/repo/')).toBe(
      'https://github.com/owner/repo',
    )
  })

  it('should handle repo names with dots', () => {
    expect(normalizeUrl('https://github.com/owner/repo.js')).toBe(
      'https://github.com/owner/repo.js',
    )
  })

  it('should handle repo names with hyphens', () => {
    expect(normalizeUrl('https://github.com/owner/repo-name')).toBe(
      'https://github.com/owner/repo-name',
    )
  })

  it('should handle repo names with underscores', () => {
    expect(normalizeUrl('https://github.com/owner/repo_name')).toBe(
      'https://github.com/owner/repo_name',
    )
  })

  it('should handle org names with special characters', () => {
    expect(normalizeUrl('https://github.com/org-name/repo')).toBe(
      'https://github.com/org-name/repo',
    )
    expect(normalizeUrl('https://github.com/org_name/repo')).toBe(
      'https://github.com/org_name/repo',
    )
  })

  it('should handle complex combinations of special characters', () => {
    expect(
      normalizeUrl(
        'https://github.com/org-name/repo_name-with.special-chars',
      ),
    ).toBe('https://github.com/org-name/repo_name-with.special-chars')
  })
})

describe('getRepoOrigin', () => {
  describe('string input', () => {
    it('should handle GitHub shorthand', () => {
      expect(getRepoOrigin('owner/repo')).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should handle full URL', () => {
      expect(getRepoOrigin('https://github.com/owner/repo')).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should handle URL with git+ prefix and .git suffix', () => {
      expect(
        getRepoOrigin('git+https://github.com/owner/repo.git'),
      ).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should return undefined for non-GitHub URLs', () => {
      expect(
        getRepoOrigin('https://gitlab.com/owner/repo'),
      ).toBeUndefined()
    })

    it('should return undefined for invalid URLs', () => {
      expect(getRepoOrigin('not-a-url')).toBeUndefined()
    })

    it('should handle URL with trailing slash', () => {
      expect(getRepoOrigin('https://github.com/owner/repo/')).toEqual(
        {
          org: 'owner',
          repo: 'repo',
        },
      )
    })

    it('should handle repo names with dots', () => {
      expect(
        getRepoOrigin('https://github.com/owner/repo.js'),
      ).toEqual({
        org: 'owner',
        repo: 'repo.js',
      })
    })

    it('should return undefined for more invalid inputs', () => {
      expect(getRepoOrigin('github.com')).toBeUndefined()
      expect(getRepoOrigin('github.com/owner')).toBeUndefined()
      expect(
        getRepoOrigin('https://github.com/owner'),
      ).toBeUndefined()
      expect(getRepoOrigin('/////')).toBeUndefined()
    })

    it('should handle repo names with hyphens', () => {
      expect(getRepoOrigin('owner/repo-name')).toEqual({
        org: 'owner',
        repo: 'repo-name',
      })
      expect(
        getRepoOrigin('https://github.com/owner/repo-name'),
      ).toEqual({
        org: 'owner',
        repo: 'repo-name',
      })
    })

    it('should handle repo names with underscores', () => {
      expect(getRepoOrigin('owner/repo_name')).toEqual({
        org: 'owner',
        repo: 'repo_name',
      })
      expect(
        getRepoOrigin('https://github.com/owner/repo_name'),
      ).toEqual({
        org: 'owner',
        repo: 'repo_name',
      })
    })

    it('should handle org names with special characters', () => {
      expect(getRepoOrigin('org-name/repo')).toEqual({
        org: 'org-name',
        repo: 'repo',
      })
      expect(getRepoOrigin('org_name/repo')).toEqual({
        org: 'org_name',
        repo: 'repo',
      })
    })

    it('should handle complex combinations of special characters', () => {
      expect(
        getRepoOrigin('org-name/repo_name-with.special-chars'),
      ).toEqual({
        org: 'org-name',
        repo: 'repo_name-with.special-chars',
      })
    })
  })

  describe('object input', () => {
    it('should handle repository object with URL', () => {
      const repo = {
        type: 'git',
        url: 'https://github.com/owner/repo',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should handle repository object with git:// protocol', () => {
      const repo = {
        type: 'git',
        url: 'git://github.com/owner/repo',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should return undefined for object without url', () => {
      expect(getRepoOrigin({} as Repository)).toBeUndefined()
    })

    it('should handle URL with trailing slash', () => {
      const repo = {
        type: 'git',
        url: 'https://github.com/owner/repo/',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'owner',
        repo: 'repo',
      })
    })

    it('should handle repo names with dots', () => {
      const repo = {
        type: 'git',
        url: 'https://github.com/owner/repo.js',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'owner',
        repo: 'repo.js',
      })
    })

    it('should handle repo names with special characters', () => {
      const repo = {
        type: 'git',
        url: 'https://github.com/owner/repo-name',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'owner',
        repo: 'repo-name',
      })

      const repo2 = {
        type: 'git',
        url: 'https://github.com/org-name/repo_name',
      } as Repository
      expect(getRepoOrigin(repo2)).toEqual({
        org: 'org-name',
        repo: 'repo_name',
      })
    })

    it('should handle complex combinations of special characters', () => {
      const repo = {
        type: 'git',
        url: 'https://github.com/org-name/repo_name-with.special-chars',
      } as Repository
      expect(getRepoOrigin(repo)).toEqual({
        org: 'org-name',
        repo: 'repo_name-with.special-chars',
      })
    })
  })
})

describe('getRepositoryApiUrl', () => {
  it('should return API URL for GitHub shorthand', () => {
    expect(getRepositoryApiUrl('owner/repo')).toBe(
      'https://api.github.com/repos/owner/repo',
    )
  })

  it('should return API URL for full GitHub URL', () => {
    expect(getRepositoryApiUrl('https://github.com/owner/repo')).toBe(
      'https://api.github.com/repos/owner/repo',
    )
  })

  it('should handle repository object', () => {
    const repo = {
      type: 'git',
      url: 'https://github.com/owner/repo',
    } as Repository
    expect(getRepositoryApiUrl(repo)).toBe(
      'https://api.github.com/repos/owner/repo',
    )
  })

  it('should return undefined for non-GitHub URLs', () => {
    expect(
      getRepositoryApiUrl('https://gitlab.com/owner/repo'),
    ).toBeUndefined()
  })

  it('should return undefined for invalid input', () => {
    expect(getRepositoryApiUrl('' as any)).toBeUndefined()
    expect(getRepositoryApiUrl({} as Repository)).toBeUndefined()
  })

  it('should handle URL with trailing slash', () => {
    expect(
      getRepositoryApiUrl('https://github.com/owner/repo/'),
    ).toBe('https://api.github.com/repos/owner/repo')
  })

  it('should handle repo names with dots', () => {
    expect(
      getRepositoryApiUrl('https://github.com/owner/repo.js'),
    ).toBe('https://api.github.com/repos/owner/repo.js')
  })

  it('should return undefined for more invalid inputs', () => {
    expect(getRepositoryApiUrl('github.com')).toBeUndefined()
    expect(getRepositoryApiUrl('github.com/owner')).toBeUndefined()
    expect(
      getRepositoryApiUrl('https://github.com/owner'),
    ).toBeUndefined()
    expect(getRepositoryApiUrl('/////')).toBeUndefined()
  })

  it('should handle repo names with special characters', () => {
    expect(getRepositoryApiUrl('owner/repo-name')).toBe(
      'https://api.github.com/repos/owner/repo-name',
    )
    expect(getRepositoryApiUrl('org-name/repo_name')).toBe(
      'https://api.github.com/repos/org-name/repo_name',
    )
  })

  it('should handle complex combinations of special characters', () => {
    expect(
      getRepositoryApiUrl('org-name/repo_name-with.special-chars'),
    ).toBe(
      'https://api.github.com/repos/org-name/repo_name-with.special-chars',
    )
  })
})

describe('getRepositoryUrl', () => {
  describe('string input', () => {
    it('should handle GitHub shorthand', () => {
      expect(getRepositoryUrl('owner/repo')).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle full URL', () => {
      expect(getRepositoryUrl('https://github.com/owner/repo')).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle URL with git+ prefix', () => {
      expect(
        getRepositoryUrl('git+https://github.com/owner/repo'),
      ).toBe('https://github.com/owner/repo')
    })

    it('should handle URL with .git suffix', () => {
      expect(
        getRepositoryUrl('https://github.com/owner/repo.git'),
      ).toBe('https://github.com/owner/repo')
    })

    it('should handle URL with both git+ prefix and .git suffix', () => {
      expect(
        getRepositoryUrl('git+https://github.com/owner/repo.git'),
      ).toBe('https://github.com/owner/repo')
    })

    it('should handle URL with trailing slash', () => {
      expect(getRepositoryUrl('https://github.com/owner/repo/')).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle repo names with dots', () => {
      expect(
        getRepositoryUrl('https://github.com/owner/repo.js'),
      ).toBe('https://github.com/owner/repo.js')
    })

    it('should return undefined for more invalid inputs', () => {
      expect(getRepositoryUrl('github.com')).toBeUndefined()
      expect(getRepositoryUrl('github.com/owner')).toBeUndefined()
      expect(
        getRepositoryUrl('https://github.com/owner'),
      ).toBeUndefined()
      expect(getRepositoryUrl('/////')).toBeUndefined()
    })

    it('should handle repo names with special characters', () => {
      expect(getRepositoryUrl('owner/repo-name')).toBe(
        'https://github.com/owner/repo-name',
      )
      expect(getRepositoryUrl('org-name/repo_name')).toBe(
        'https://github.com/org-name/repo_name',
      )
    })

    it('should handle complex combinations of special characters', () => {
      expect(
        getRepositoryUrl('org-name/repo_name-with.special-chars'),
      ).toBe(
        'https://github.com/org-name/repo_name-with.special-chars',
      )
    })
  })

  describe('object input', () => {
    it('should handle URL with git:// protocol', () => {
      const repo: Repository = {
        type: 'git',
        url: 'git://github.com/owner/repo',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle URL without protocol', () => {
      const repo: Repository = {
        type: 'git',
        url: 'github.com/owner/repo',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle URL with directory', () => {
      const repo: Repository & { directory?: string } = {
        type: 'git',
        url: 'https://github.com/owner/repo',
        directory: 'src',
      }
      expect(getRepositoryUrl(repo, true)).toBe(
        'https://github.com/owner/repo/tree/main/src',
      )
    })

    it('should handle URL with git+ prefix and .git suffix', () => {
      const repo: Repository = {
        type: 'git',
        url: 'git+https://github.com/owner/repo.git',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle URL with directory and git+ prefix', () => {
      const repo: Repository & { directory?: string } = {
        type: 'git',
        url: 'git+https://github.com/owner/repo',
        directory: 'src',
      }
      expect(getRepositoryUrl(repo, true)).toBe(
        'https://github.com/owner/repo/tree/main/src',
      )
    })

    it('should handle URL with trailing slash', () => {
      const repo: Repository = {
        type: 'git',
        url: 'https://github.com/owner/repo/',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo',
      )
    })

    it('should handle repo names with dots', () => {
      const repo: Repository = {
        type: 'git',
        url: 'https://github.com/owner/repo.js',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo.js',
      )
    })

    it('should handle repo names with special characters', () => {
      const repo: Repository = {
        type: 'git',
        url: 'https://github.com/owner/repo-name',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/owner/repo-name',
      )

      const repo2: Repository = {
        type: 'git',
        url: 'https://github.com/org-name/repo_name',
      }
      expect(getRepositoryUrl(repo2)).toBe(
        'https://github.com/org-name/repo_name',
      )
    })

    it('should handle complex combinations of special characters', () => {
      const repo: Repository = {
        type: 'git',
        url: 'https://github.com/org-name/repo_name-with.special-chars',
      }
      expect(getRepositoryUrl(repo)).toBe(
        'https://github.com/org-name/repo_name-with.special-chars',
      )
    })

    it('should handle URL with directory containing special characters', () => {
      const repo: Repository & { directory?: string } = {
        type: 'git',
        url: 'https://github.com/org-name/repo_name',
        directory: 'src/components-ui',
      }
      expect(getRepositoryUrl(repo, true)).toBe(
        'https://github.com/org-name/repo_name/tree/main/src/components-ui',
      )
    })
  })

  describe('invalid input', () => {
    it('should return undefined for invalid string input', () => {
      expect(getRepositoryUrl('')).toBeUndefined()
    })

    it('should return undefined for invalid object input', () => {
      expect(
        getRepositoryUrl({} as unknown as Repository),
      ).toBeUndefined()
    })

    it('should return undefined for object without url', () => {
      expect(
        getRepositoryUrl({
          directory: 'src',
        } as unknown as Repository),
      ).toBeUndefined()
    })
  })
})
