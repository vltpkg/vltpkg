import type { PackageAlert } from '@vltpkg/security-archive'

export interface SocketSecurityDetails {
  selector: string
  description: string
  category:
    | 'Unknown'
    | 'Supply Chain'
    | 'Quality'
    | 'Maintenance'
    | 'License'
    | 'Vulnerability'
  severity: SocketSeverity
}
type SocketSeverity = PackageAlert['severity']

export const SOCKET_SECURITY_DETAILS: Record<
  string,
  SocketSecurityDetails
> = {
  abandoned: {
    selector: ':abandoned',
    description:
      'Packages that were published by an npm account that no longer exists',
    category: 'Supply Chain',
    severity: 'middle',
  },
  missingAuthor: {
    selector: ':abandoned',
    description: 'Packages that are missing an author field',
    category: 'Supply Chain',
    severity: 'middle',
  },
  confused: {
    selector: ':confused',
    description:
      'Packages affected by manifest confusion. This could be malicious or caused by an error when publishing the package',
    category: 'Supply Chain',
    severity: 'middle',
  },
  manifestConfusion: {
    selector: ':confused',
    description:
      'Packages affected by manifest confusion. This could be malicious or caused by an error when publishing the package',
    category: 'Supply Chain',
    severity: 'middle',
  },
  debug: {
    selector: ':debug',
    description:
      'Packages that use debug, reflection and dynamic code execution features',
    category: 'Supply Chain',
    severity: 'low',
  },
  debugAccess: {
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
    severity: 'middle',
  },
  dynamic: {
    selector: ':dynamic',
    description: 'Packages that uses dynamic imports',
    category: 'Supply Chain',
    severity: 'low',
  },
  dynamicRequire: {
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
  highEntropyStrings: {
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
  envVars: {
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
    severity: 'middle',
  },
  usesEval: {
    selector: ':eval',
    description:
      'Packages that use dynamic code execution (e.g., eval()), which is a dangerous practice. This can prevent the code from running in certain environments and increases the risk that the code may contain exploits or malicious behavior',
    category: 'Supply Chain',
    severity: 'middle',
  },
  fs: {
    selector: ':fs',
    description:
      'Packages that accesses the file system, and could potentially read sensitive data',
    category: 'Supply Chain',
    severity: 'low',
  },
  filesystemAccess: {
    selector: ':fs',
    description:
      'Packages that accesses the file system, and could potentially read sensitive data',
    category: 'Supply Chain',
    severity: 'low',
  },
  explicitlyUnlicensedItem: {
    selector: ':license(unlicensed)',
    description: 'Packages that are explicitly unlicensed',
    category: 'License',
    severity: 'high',
  },
  miscLicenseIssues: {
    selector: ':license(misc)',
    description: 'Packages with fine-grained problems',
    category: 'License',
    severity: 'middle',
  },
  nonpermissiveLicense: {
    selector: ':license(restricted)',
    description: 'Packages with non-permissive licenses',
    category: 'License',
    severity: 'low',
  },
  ambiguousClassifier: {
    selector: ':license(ambiguous)',
    description: 'Packages with ambiguous classifiers',
    category: 'License',
    severity: 'low',
  },
  copyleftLicense: {
    selector: ':license(copyleft)',
    description: 'Packages with copyleft licenses',
    category: 'License',
    severity: 'low',
  },
  unidentifiedLicense: {
    selector: ':license(unknown)',
    description: 'Packages with unidentified licenses',
    category: 'License',
    severity: 'low',
  },
  noLicenseFound: {
    selector: ':license(none)',
    description: 'Packages with no license found',
    category: 'License',
    severity: 'low',
  },
  licenseException: {
    selector: ':license(exception)',
    description: 'Packages with license exceptions',
    category: 'License',
    severity: 'low',
  },
  malware: {
    selector: ':malware',
    description: 'Packages that is and contains known malware',
    category: 'Supply Chain',
    severity: 'critical',
  },
  gptMalware: {
    selector: ':malware',
    description:
      'AI has identified this package as containing malware',
    category: 'Supply Chain',
    severity: 'high',
  },
  gptSecurity: {
    selector: ':security',
    description:
      'AI has determined that this package may contain potential security issues or vulnerabilities',
    category: 'Supply Chain',
    severity: 'high',
  },
  gptAnomaly: {
    selector: ':anomaly',
    description:
      'AI has identified unusual behaviors that may pose a security risk',
    category: 'Supply Chain',
    severity: 'low',
  },
  minified: {
    selector: ':minified',
    description:
      'Packages that contain minified code. This may be harmless in some cases where minified code is included in packaged libraries',
    category: 'Quality',
    severity: 'low',
  },
  minifiedFile: {
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
    severity: 'middle',
  },
  hasNativeCode: {
    selector: ':native',
    description:
      'Packages that contain native code (e.g., compiled binaries or shared libraries). Including native code can obscure malicious behavior',
    category: 'Supply Chain',
    severity: 'middle',
  },
  network: {
    selector: ':network',
    description: 'Packages that access the network',
    category: 'Supply Chain',
    severity: 'middle',
  },
  networkAccess: {
    selector: ':network',
    description: 'Packages that access the network',
    category: 'Supply Chain',
    severity: 'middle',
  },
  obfuscated: {
    selector: ':obfuscated',
    description:
      'Packages that use obfuscated files, intentionally packed to hide their behavior. This could be a sign of malware',
    category: 'Supply Chain',
    severity: 'high',
  },
  obfuscatedFile: {
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
    severity: 'middle',
  },
  installScripts: {
    selector: ':scripts',
    description:
      'Packages that have scripts that are run when the package is installed. The majority of malware in npm is hidden in install scripts',
    category: 'Supply Chain',
    severity: 'middle',
  },
  shell: {
    selector: ':shell',
    description:
      'Packages that accesses the system shell. Accessing the system shell increases the risk of executing arbitrary code',
    category: 'Supply Chain',
    severity: 'middle',
  },
  shellAccess: {
    selector: ':shell',
    description:
      'Packages that accesses the system shell. Accessing the system shell increases the risk of executing arbitrary code',
    category: 'Supply Chain',
    severity: 'middle',
  },
  shrinkwrap: {
    selector: ':shrinkwrap',
    description:
      'Packages that contains a shrinkwrap file. This may allow the package to bypass normal install procedures',
    category: 'Supply Chain',
    severity: 'high',
  },
  squat: {
    selector: ':squat',
    description:
      'Packages with names similar to other popular packages and may not be the package you want',
    category: 'Supply Chain',
    severity: 'critical',
  },
  didYouMean: {
    selector: ':squat',
    description:
      'Packages with names similar to other popular packages and may not be the package you want',
    category: 'Supply Chain',
    severity: 'critical',
  },
  gptDidYouMean: {
    selector: ':squat',
    description:
      'AI has identified this package as a potential typosquat of a more popular package. This suggests that the package may be intentionally mimicking another packages name, description, or other metadata',
    category: 'Supply Chain',
    severity: 'middle',
  },
  suspicious: {
    selector: ':suspicious',
    description:
      'Packages that may have its GitHub repository artificially inflated with stars (from bots, crowdsourcing, etc.)',
    category: 'Supply Chain',
    severity: 'high',
  },
  suspiciousStarActivity: {
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
  telemetry: {
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
    severity: 'middle',
  },
  trivialPackage: {
    selector: ':trivial',
    description:
      'Packages that have less than 10 lines of code. These packages are easily copied into your own project and may not warrant the additional supply chain risk of an external dependency',
    category: 'Supply Chain',
    severity: 'middle',
  },
  undesirable: {
    selector: ':undesirable',
    description:
      'Packages that are a joke, parody, or includes undocumented or hidden behavior unrelated to its primary function',
    category: 'Supply Chain',
    severity: 'high',
  },
  troll: {
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
  newAuthor: {
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
    severity: 'middle',
  },
  unpopularPackage: {
    selector: ':unpopular',
    description: 'Packages that are not very popular',
    category: 'Quality',
    severity: 'middle',
  },
  unstable: {
    selector: ':unstable',
    description:
      'Packages with unstable ownership. This indicates a new collaborator has begun publishing package versions. Package stability and security risk may be elevated',
    category: 'Supply Chain',
    severity: 'high',
  },
  unstableOwnership: {
    selector: ':unstable',
    description:
      'Packages with unstable ownership. This indicates a new collaborator has begun publishing package versions. Package stability and security risk may be elevated',
    category: 'Supply Chain',
    severity: 'high',
  },
}
