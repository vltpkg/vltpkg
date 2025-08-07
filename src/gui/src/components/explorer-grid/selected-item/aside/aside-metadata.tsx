import {
  CircleFadingArrowUp,
  Download,
  FileLock2,
  Package,
} from 'lucide-react'
import {
  Node,
  Npm,
  Yarn,
  Pnpm,
  Deno,
  Bun,
} from '@/components/icons/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'
import { isRecord } from '@/utils/typeguards.ts'
import { formatDownloadSize } from '@/utils/format-download-size.ts'

import type { LucideIcon } from 'lucide-react'

const getEngine = (engine: string): LucideIcon => {
  switch (engine) {
    case 'node':
      return Node
    case 'npm':
      return Npm
    case 'yarn':
      return Yarn
    case 'pnpm':
      return Pnpm
    case 'deno':
      return Deno
    case 'bun':
      return Bun
    default:
      return Node
  }
}

export const AsideMetadata = () => {
  const { isMetadataEmpty } = useEmptyCheck()

  const versions = useSelectedItemStore(state => state.versions)
  const manifest = useSelectedItemStore(state => state.manifest)
  const currentVersion = versions?.find(
    version => version.version === manifest?.version,
  )

  const tarballUrl = currentVersion?.tarball
  const integrity = currentVersion?.integrity
  const unpackedSize = currentVersion?.unpackedSize
  const type = manifest?.type
  const engines = manifest?.engines

  if (isMetadataEmpty) return null

  return (
    <>
      <AsideSection>
        <AsideHeader>Metadata</AsideHeader>
        {unpackedSize && (
          <AsideItem
            icon={Download}
            count={formatDownloadSize(unpackedSize)}
          />
        )}
        {type && (
          <AsideItem icon={Package}>
            {manifest.type === 'module' ? 'ESM' : 'CJS'}
          </AsideItem>
        )}
        {integrity && (
          <AsideItem
            icon={FileLock2}
            copyToClipboard={{ copyValue: integrity }}>
            Integrity Value
          </AsideItem>
        )}
        {tarballUrl && (
          <AsideItem
            icon={CircleFadingArrowUp}
            copyToClipboard={{ copyValue: tarballUrl }}>
            Tarball URL
          </AsideItem>
        )}
      </AsideSection>
      {engines && (
        <AsideSection>
          <AsideHeader>Engines</AsideHeader>
          {isRecord(engines) &&
            Object.entries(engines).map(([engine, version], idx) => (
              <AsideItem
                count={version}
                classNames={{
                  dataBadge: {
                    wrapperClassName: 'justify-start',
                    contentClassName:
                      'inline-block truncate max-w-fit overflow-hidden',
                  },
                }}
                dataBadgeTooltip={{
                  content: version,
                  delayDuration: 150,
                }}
                icon={getEngine(engine)}
                key={`${engine}-${version}-${idx}`}
              />
            ))}
        </AsideSection>
      )}
    </>
  )
}
