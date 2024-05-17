import { IconName } from '@/models/icon'

export const artifactTypes = [
  'result',
  'markdown',
  'table',
  'progress',
  'unknown',
] as const

export type ArtifactType = typeof artifactTypes[number]

export type RunGraphArtifact = {
  id: string,
  created: Date,
  key?: string,
  type: ArtifactType,
  data?: Record<string, unknown>,
}

export const artifactTypeIconMap = {
  markdown: 'ArtifactMarkdown',
  table: 'ArtifactTable',
  result: 'ArtifactResult',
  progress: 'ArtifactProgress',
  unknown: 'Artifact',
} as const satisfies Record<ArtifactType, IconName>