export const artifactTypes = [
  'result',
  'markdown',
  'table',
  'unknown',
] as const

export type ArtifactType = typeof artifactTypes[number]

export type Artifact = {
  id: string,
  key: string | null,
  flowRunId: string | null,
  taskRunId: string | null,
  created: Date,
  type: ArtifactType,
}