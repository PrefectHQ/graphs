export type FlowRunGraphData = {
  root_node_ids: string[],
  start_date: Date,
  end_date: Date | null,
  nodes: Map<string, FlowRunGraphNode>,
}

export type FlowRunGraphNode = {
  kind: FlowRunGraphNodeType,
  id: string,
  label: string,
  state_name: string,
  start_time: Date,
  end_time: Date | null,
  parent_ids: FlowRunGraphEdge[],
  child_ids: FlowRunGraphEdge[],
}

export type FlowRunGraphEdge = {
  id: string,
}

export const flowRunGraphNodeTypes = ['flow-run', 'task-run'] as const
export type FlowRunGraphNodeType = typeof flowRunGraphNodeTypes[number]

export function isFlowRunGraphNodeType(value: unknown): value is FlowRunGraphNodeType {
  return flowRunGraphNodeTypes.includes(value as FlowRunGraphNodeType)
}

export type FlowRunGraphConfig = {
  flowRunId: string,
  fetch: (flowRunId: string) => Promise<FlowRunGraphData>,
}