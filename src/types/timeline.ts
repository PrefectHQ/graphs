export type TimelineItem = {
  id: string,
  label: string,
  state: string,
  start: Date | null,
  end: Date | null,
  subflowRunId: string | null,
  upstream: string[],
  downstream: string[],
}

export type TimelineData = Map<string, TimelineItem>