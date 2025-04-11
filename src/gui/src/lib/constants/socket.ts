import type { PackageAlert } from '@vltpkg/security-archive'

type SocketSeverity = PackageAlert['severity']
type SocketCategory =
  | 'Unknown'
  | 'Supply Chain'
  | 'Quality'
  | 'Maintenance'
  | 'License'
  | 'Vulnerability'

export interface SocketSecurityDetails {
  selector: string
  description: string
  category: SocketCategory
  severity: SocketSeverity
}

export type SocketSecurityRecord = {
  [key: string]: SocketSecurityDetails | SocketSecurityRecord
}

export const SOCKET_SECURITY_DETAILS: SocketSecurityRecord = {
  abandoned: {
    selector: ':abandoned',
    description: 'Packages that are missing an author field',
    category: 'Supply Chain',
    severity: 'medium',
  },
  confused: {
    selector: ':confused',
    description:
      'Packages affected by manifest confusion. This could be malicious or caused by an error when publishing the package',
    category: 'Supply Chain',
    severity: 'medium',
  },
  debug: {
    selector: ':debug',
    description:
      'Packages that use debug, reflection and dynamic code execution features',
    category: 'Supply Chain',
    severity: 'low',
  },
  deprecated: {
    selector: ':deprecated',
    description:
      'Packages marked as deprecated. This could indicate that a single version should not be used, or that the package is no longer maintained and any new vulnerabilities will not be fixed',
    category: 'Maintenance',
    severity: 'medium',
  },
  dynamic: {
    selector: ':dynamic',
    description: 'Packages that uses dynamic imports',
    category: 'Supply Chain',
    severity: 'low',
  },
  entropic: {
    selector: ':entropic',
    description:
      'Packages that contains high entropic strings. This could be a sign of encrypted data, leaked secrets or obfuscated code',
    category: 'Supply Chain',
    severity: 'low',
  },
  env: {
    selector: ':env',
    description:
      'Packages that accesses environment variables, which may be a sign of credential stuffing or data theft',
    category: 'Supply Chain',
    severity: 'low',
  },
  eval: {
    selector: ':eval',
    description:
      'Packages that use dynamic code execution (e.g., eval()), which is a dangerous practice. This can prevent the code from running in certain environments and increases the risk that the code may contain exploits or malicious behavior',
    category: 'Supply Chain',
    severity: 'medium',
  },
  fs: {
    selector: ':fs',
    description:
      'Packages that accesses the file system, and could potentially read sensitive data',
    category: 'Supply Chain',
    severity: 'low',
  },
  license: {
    ambiguous: {
      selector: ':license(ambiguous)',
      description: 'Packages with ambiguous classifiers',
      category: 'License',
      severity: 'low',
    },
    copyleft: {
      selector: ':license(copyleft)',
      description: 'Packages with copyleft licenses',
      category: 'License',
      severity: 'low',
    },
    exception: {
      selector: ':license(exception)',
      description: 'Packages with license exceptions',
      category: 'License',
      severity: 'low',
    },
    misc: {
      selector: ':license(misc)',
      description: 'Packages with fine-grained problems',
      category: 'License',
      severity: 'medium',
    },
    none: {
      selector: ':license(none)',
      description: 'Packages with no license found',
      category: 'License',
      severity: 'low',
    },
    restricted: {
      selector: ':license(restricted)',
      description: 'Packages with non-permissive licenses',
      category: 'License',
      severity: 'low',
    },
    unknown: {
      selector: ':license(unknown)',
      description: 'Packages with unidentified licenses',
      category: 'License',
      severity: 'low',
    },
    unlicensed: {
      selector: ':license(unlicensed)',
      description: 'Packages that are explicitly unlicensed',
      category: 'License',
      severity: 'high',
    },
  },
  malware: {
    low: {
      selector: ':malware(low)',
      description:
        'AI has identified unusual behaviors that may pose a security risk',
      category: 'Supply Chain',
      severity: 'low',
    },
    medium: {
      selector: ':malware(medium)',
      description:
        'AI has determined that this package may contain potential security issues or vulnerabilities',
      category: 'Supply Chain',
      severity: 'high',
    },
    high: {
      selector: ':malware(high)',
      description:
        'AI has identified this package as containing malware',
      category: 'Supply Chain',
      severity: 'high',
    },
    critical: {
      selector: ':malware(critical)',
      description: 'Packages that is and contains known malware',
      category: 'Supply Chain',
      severity: 'critical',
    },
  },
  minified: {
    selector: ':minified',
    description:
      'Packages that contain minified code. This may be harmless in some cases where minified code is included in packaged libraries',
    category: 'Quality',
    severity: 'low',
  },
  native: {
    selector: ':native',
    description:
      'Packages that contain native code (e.g., compiled binaries or shared libraries). Including native code can obscure malicious behavior',
    category: 'Supply Chain',
    severity: 'medium',
  },
  network: {
    selector: ':network',
    description: 'Packages that access the network',
    category: 'Supply Chain',
    severity: 'medium',
  },
  obfuscated: {
    selector: ':obfuscated',
    description:
      'Packages that use obfuscated files, intentionally packed to hide their behavior. This could be a sign of malware',
    category: 'Supply Chain',
    severity: 'high',
  },
  scripts: {
    selector: ':scripts',
    description:
      'Packages that have scripts that are run when the package is installed. The majority of malware in npm is hidden in install scripts',
    category: 'Supply Chain',
    severity: 'medium',
  },
  shell: {
    selector: ':shell',
    description:
      'Packages that accesses the system shell. Accessing the system shell increases the risk of executing arbitrary code',
    category: 'Supply Chain',
    severity: 'medium',
  },
  shrinkwrap: {
    selector: ':shrinkwrap',
    description:
      'Packages that contains a shrinkwrap file. This may allow the package to bypass normal install procedures',
    category: 'Supply Chain',
    severity: 'high',
  },
  squat: {
    medium: {
      selector: ':squat(medium)',
      description:
        'AI has identified this package as a potential typosquat of a more popular package. This suggests that the package may be intentionally mimicking another packages name, description, or other metadata',
      category: 'Supply Chain',
      severity: 'medium',
    },
    critical: {
      selector: ':squat(critical)',
      description:
        'Packages with names similar to other popular packages and may not be the package you want',
      category: 'Supply Chain',
      severity: 'critical',
    },
  },
  suspicious: {
    selector: ':suspicious',
    description:
      'Packages that may have its GitHub repository artificially inflated with stars (from bots, crowdsourcing, etc.)',
    category: 'Supply Chain',
    severity: 'high',
  },
  tracker: {
    selector: ':tracker',
    description:
      'Packages that contains telemetry which tracks how it is used',
    category: 'Supply Chain',
    severity: 'high',
  },
  trivial: {
    selector: ':trivial',
    description:
      'Packages that have less than 10 lines of code. These packages are easily copied into your own project and may not warrant the additional supply chain risk of an external dependency',
    category: 'Supply Chain',
    severity: 'medium',
  },
  undesirable: {
    selector: ':undesirable',
    description:
      'Packages that are a joke, parody, or includes undocumented or hidden behavior unrelated to its primary function',
    category: 'Supply Chain',
    severity: 'high',
  },
  unknown: {
    selector: ':unknown',
    description:
      'Packages that have a new npm collaborator publishing a version of the package for the first time. New collaborators are usually benign additions to a project, but do indicate a change to the security surface area of a package',
    category: 'Supply Chain',
    severity: 'low',
  },
  unmaintained: {
    selector: ':unmaintained',
    description:
      'Packages that have not been updated in more than 5 years and may be unmaintained',
    category: 'Maintenance',
    severity: 'low',
  },
  unpopular: {
    selector: ':unpopular',
    description: 'Packages that are not very popular',
    category: 'Quality',
    severity: 'medium',
  },
  unstable: {
    selector: ':unstable',
    description:
      'Packages with unstable ownership. This indicates a new collaborator has begun publishing package versions. Package stability and security risk may be elevated',
    category: 'Supply Chain',
    severity: 'high',
  },
}
