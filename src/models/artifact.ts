import { IconName } from '@/models/icon'

export const artifactTypes = [
  'result',
  'markdown',
  'table',
  'unknown',
] as const

export type ArtifactType = typeof artifactTypes[number]

export type RunGraphArtifact = {
  id: string,
  created: Date,
  key?: string,
  type: ArtifactType,
}

export const artifactTypeIconMap = {
  markdown: 'ArtifactMarkdown',
  table: 'ArtifactTable',
  result: 'ArtifactResult',
  unknown: 'Artifact',
} as const satisfies Record<ArtifactType, IconName>