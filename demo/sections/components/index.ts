import { Section } from '@/demo/router/routeRecords'


export const components: Section = {
  // Sections can be lazy loaded by using a function that returns an import statement
  FlowRunTimeline: () => import('./FlowRunTimelineDemo.vue'),
}
