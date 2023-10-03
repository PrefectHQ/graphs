
export type RunGraphData = {
  root_node_ids: string[],
  start_time: Date,
  end_time: Date | null,
  nodes: Map<string, RunGraphNode>,
}

export type RunGraphNode = {
  kind: RunGraphNodeKind,
  id: string,
  label: string,
  state_name: string,
  start_time: Date,
  end_time: Date | null,
  parent_ids: RunGraphEdge[],
  child_ids: RunGraphEdge[],
}

export type RunGraphEdge = {
  id: string,
}

export const runGraphNodeKinds = ['flow-run', 'task-run'] as const
export type RunGraphNodeKind = typeof runGraphNodeKinds[number]

export function isRunGraphNodeType(value: unknown): value is RunGraphNodeKind {
  return runGraphNodeKinds.includes(value as RunGraphNodeKind)
}

export type RunGraphFetch = (flowRunId: string) => RunGraphData | Promise<RunGraphData>

export type RunGraphConfig = {
  runId: string,
  fetch: RunGraphFetch,
}