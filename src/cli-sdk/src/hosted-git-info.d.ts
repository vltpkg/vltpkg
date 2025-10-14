declare module 'hosted-git-info' {
  export interface HostedGitInfo {
    docs(): string
  }

  export function fromUrl(url: string): HostedGitInfo | null
}
