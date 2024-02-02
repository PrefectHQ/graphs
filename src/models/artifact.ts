export const artifactTypes = [
  'result',
  'markdown',
  'table',
  'unknown',
] as const

export type ArtifactType = typeof artifactTypes[number]

export type Artifact = {
  id: string,
  created: Date,
  key: string,
  type: ArtifactType,
  isLatest: boolean,
}