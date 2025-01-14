import { IconName } from '@/models/icon'

export const artifactTypes = [
  'result',
  'markdown',
  'table',
  'progress',
  'image',
  'unknown',
] as const

export type ArtifactType = typeof artifactTypes[number]

export type RunGraphArtifactTypeAndData = {
  type: Exclude<ArtifactType, 'progress'>,
} | {
  type: 'progress',
  data: number,
}

export type RunGraphArtifact = {
  id: string,
  created: Date,
  key?: string,
} & RunGraphArtifactTypeAndData

export const artifactTypeIconMap = {
  markdown: 'ArtifactMarkdown',
  table: 'ArtifactTable',
  result: 'ArtifactResult',
  image: 'ArtifactImage',
  progress: 'ArtifactProgress',
  unknown: 'Artifact',
} as const satisfies Record<ArtifactType, IconName>
