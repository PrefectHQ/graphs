<template>
  <main>
    <div ref="brainViewNode" class="brain-view" />
  </main>
</template>

<script setup>
  import ForceGraph3D from '3d-force-graph'
  import { onMounted, ref } from 'vue'

  const brainViewNode = ref()

  onMounted(() => {
    if (brainViewNode.value) {
      const width = brainViewNode.value.clientWidth
      const height = brainViewNode.value.clientHeight

      const nodes = getNodes(eventData)
      const links = []

      const Graph = ForceGraph3D()(brainViewNode.value)
        .width(width)
        .height(height)
        .graphData({
          nodes,
          links,
        });
    }
  })

  const getNodes = (data) => {
    const nodesMap = new Map()

    data.forEach((event) => {
      const { resource, related } = event
      const { 'prefect.resource.id': resourceId, 'prefect.resource.name': resourceName } = resource
      const { 'prefect.resource.id': relatedId, 'prefect.resource.name': relatedName } = related

      if (!nodesMap.has(resourceId)) {
        nodesMap.set(resourceId, {
          id: resourceId,
          name: resourceName,
        })
      }

      if (!nodesMap.has(relatedId)) {
        // loop related resources
        nodesMap.set(relatedId, {
          id: relatedId,
          name: relatedName,
        })
      }
    })

    return Array.from(nodesMap.values())
  }

  const getLinks = (data) => {
    const linksMap = new Map()

    data.forEach((event) => {
      const { resource, related } = event
      const { 'prefect.resource.id': id } = resource

      related.forEach((relatedResource) => {
        const { 'prefect.resource.id': relatedId } = relatedResource

        const linkId = `${id}-${relatedId}`

        if (!linksMap.has(linkId)) {
          linksMap.set(linkId, {
            source: id,
            target: relatedId,
          })
        }
      })
    })

    return Array.from(linksMap.values())
  }

  const eventData = [
    {
      'occurred': '2023-05-23T16:49:51.076818+00:00',
      'event': 'prefect.worker.started',
      'resource': {
        'prefect.version': '2.10.6',
        'prefect.resource.id': 'prefect.worker.azure-container-instance.azurecontainerworker-e4d3ea68-6bcc-430a-a17c-2ba21e41bc56',
        'prefect.worker-type': 'azure-container-instance',
        'prefect.resource.name': 'AzureContainerWorker e4d3ea68-6bcc-430a-a17c-2ba21e41bc56',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.1bbafd91-b15c-42c7-aaf7-44251341e155',
          'prefect.resource.name': 'azure-worker-b',
          'prefect.resource.role': 'work-pool',
        },
      ],
      'payload': {},
      'id': '1903d040-6224-4de7-b8be-8ae4dbc7b397',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T16:49:51.244445+00:00',
    },
    {
      'occurred': '2023-05-23T17:54:21.815714+00:00',
      'event': 'prefect.worker.started',
      'resource': {
        'prefect.version': '2.10.6',
        'prefect.resource.id': 'prefect.worker.azure-container-instance.azurecontainerworker-3a3c5869-7fe3-4e79-88ec-4ff0a47606d5',
        'prefect.worker-type': 'azure-container-instance',
        'prefect.resource.name': 'AzureContainerWorker 3a3c5869-7fe3-4e79-88ec-4ff0a47606d5',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.1bbafd91-b15c-42c7-aaf7-44251341e155',
          'prefect.resource.name': 'azure-worker-b',
          'prefect.resource.role': 'work-pool',
        },
      ],
      'payload': {},
      'id': '42853f53-2605-4b0d-bd06-66b782d52c23',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T17:54:21.977971+00:00',
    },
    {
      'occurred': '2023-05-23T18:58:45.231252+00:00',
      'event': 'prefect.worker.started',
      'resource': {
        'prefect.version': '2.10.6',
        'prefect.resource.id': 'prefect.worker.azure-container-instance.azurecontainerworker-fe46edbd-b1b0-4f2c-814b-f3c5e07a6c0c',
        'prefect.worker-type': 'azure-container-instance',
        'prefect.resource.name': 'AzureContainerWorker fe46edbd-b1b0-4f2c-814b-f3c5e07a6c0c',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.1bbafd91-b15c-42c7-aaf7-44251341e155',
          'prefect.resource.name': 'azure-worker-b',
          'prefect.resource.role': 'work-pool',
        },
      ],
      'payload': {},
      'id': 'b120b24e-37a6-4e7b-b2cf-8347dd2bbaa0',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T18:58:45.383061+00:00',
    },
    {
      'occurred': '2023-05-23T19:55:07.106885+00:00',
      'event': 'prefect.work-queue.unhealthy',
      'resource': {
        'prefect.resource.id': 'prefect.work-queue.cace996d-09b8-4282-8bc2-6f5ceac87dd6',
        'prefect.resource.name': 'azure-contain-a',
        'prefect.work-queue.priority': '6',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.0c2acca5-4a69-4aa9-b212-3e2426383b6f',
          'prefect.resource.name': 'default-agent-pool',
          'prefect.resource.role': 'work-pool',
          'prefect.work-pool.type': 'prefect-agent',
        },
      ],
      'payload': {
        'healthy': false,
        'last_polled': '2023-05-23T19:54:00.991544+00:00',
        'late_runs_count': 0,
        'health_check_policy': {
          'maximum_late_runs': 0,
          'maximum_seconds_since_last_polled': 60,
        },
      },
      'id': '9a5d37d3-2d18-4936-be19-3067e7d300a3',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T19:55:07.107384+00:00',
    },
    {
      'occurred': '2023-05-23T20:03:05.548168+00:00',
      'event': 'prefect.worker.started',
      'resource': {
        'prefect.version': '2.10.6',
        'prefect.resource.id': 'prefect.worker.azure-container-instance.azurecontainerworker-c2def0ae-b6a1-4061-b996-7c56fdca9918',
        'prefect.worker-type': 'azure-container-instance',
        'prefect.resource.name': 'AzureContainerWorker c2def0ae-b6a1-4061-b996-7c56fdca9918',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.1bbafd91-b15c-42c7-aaf7-44251341e155',
          'prefect.resource.name': 'azure-worker-b',
          'prefect.resource.role': 'work-pool',
        },
      ],
      'payload': {},
      'id': '73e98eda-e642-455c-acc2-6225c9952376',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:03:05.750846+00:00',
    },
    {
      'occurred': '2023-05-23T20:04:07.567583+00:00',
      'event': 'prefect.work-queue.healthy',
      'resource': {
        'prefect.resource.id': 'prefect.work-queue.cace996d-09b8-4282-8bc2-6f5ceac87dd6',
        'prefect.resource.name': 'azure-contain-a',
        'prefect.work-queue.priority': '6',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.work-pool.0c2acca5-4a69-4aa9-b212-3e2426383b6f',
          'prefect.resource.name': 'default-agent-pool',
          'prefect.resource.role': 'work-pool',
          'prefect.work-pool.type': 'prefect-agent',
        },
      ],
      'payload': {
        'healthy': true,
        'last_polled': '2023-05-23T20:04:01.709479+00:00',
        'late_runs_count': 0,
        'health_check_policy': {
          'maximum_late_runs': 0,
          'maximum_seconds_since_last_polled': 60,
        },
      },
      'id': '5119c81e-014b-4232-a264-7b9ad1318aec',
      'follows': '9a5d37d3-2d18-4936-be19-3067e7d300a3',
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:04:07.568120+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.108053+00:00',
      'event': 'prefect.flow-run.Scheduled',
      'resource': {
        'prefect.state-name': 'Scheduled',
        'prefect.state-type': 'SCHEDULED',
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
        'prefect.resource.name': 'idealistic-shrew',
        'prefect.state-message': 'Run from the Prefect UI with defaults',
        'prefect.state-timestamp': '2023-05-23T20:49:52.108053+00:00',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.flow.3a29cec3-090a-494b-89ef-bd4bcb606701',
          'prefect.resource.name': 'date-world',
          'prefect.resource.role': 'flow',
        },
        {
          'prefect.resource.id': 'prefect.deployment.9302e52c-2c4c-4944-85e0-61d48e9cbfcc',
          'prefect.resource.name': 'date-time-test-azure',
          'prefect.resource.role': 'deployment',
        },
        {
          'prefect.resource.id': 'prefect.work-queue.cace996d-09b8-4282-8bc2-6f5ceac87dd6',
          'prefect.resource.name': 'azure-contain-a',
          'prefect.resource.role': 'work-queue',
        },
        {
          'prefect.resource.id': 'prefect.work-pool.0c2acca5-4a69-4aa9-b212-3e2426383b6f',
          'prefect.resource.name': 'default-agent-pool',
          'prefect.resource.role': 'work-pool',
        },
        {
          'prefect.resource.id': 'prefect.tag.azure',
          'prefect.resource.role': 'tag',
        },
        {
          'prefect.resource.id': 'prefect-cloud.user.4a62e1ac-e491-4938-b4f9-728e5bd0a091',
          'prefect.resource.name': 'craig-prefect-io',
          'prefect.resource.role': 'creator',
        },
      ],
      'payload': {
        'intended': {
          'to': 'SCHEDULED',
          'from': null,
        },
        'initial_state': null,
        'validated_state': {
          'name': 'Scheduled',
          'type': 'SCHEDULED',
          'message': 'Run from the Prefect UI with defaults',
        },
      },
      'id': '4b83f6d8-8425-4256-a1a1-733e8cc9f33f',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:52.340756+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.465159+00:00',
      'event': 'prefect.flow-run.Pending',
      'resource': {
        'prefect.state-name': 'Pending',
        'prefect.state-type': 'PENDING',
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
        'prefect.resource.name': 'idealistic-shrew',
        'prefect.state-message': '',
        'prefect.state-timestamp': '2023-05-23T20:49:52.465159+00:00',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.flow.3a29cec3-090a-494b-89ef-bd4bcb606701',
          'prefect.resource.name': 'date-world',
          'prefect.resource.role': 'flow',
        },
        {
          'prefect.resource.id': 'prefect.deployment.9302e52c-2c4c-4944-85e0-61d48e9cbfcc',
          'prefect.resource.name': 'date-time-test-azure',
          'prefect.resource.role': 'deployment',
        },
        {
          'prefect.resource.id': 'prefect.work-queue.cace996d-09b8-4282-8bc2-6f5ceac87dd6',
          'prefect.resource.name': 'azure-contain-a',
          'prefect.resource.role': 'work-queue',
        },
        {
          'prefect.resource.id': 'prefect.work-pool.0c2acca5-4a69-4aa9-b212-3e2426383b6f',
          'prefect.resource.name': 'default-agent-pool',
          'prefect.resource.role': 'work-pool',
        },
        {
          'prefect.resource.id': 'prefect.tag.azure',
          'prefect.resource.role': 'tag',
        },
        {
          'prefect.resource.id': 'prefect-cloud.user.4a62e1ac-e491-4938-b4f9-728e5bd0a091',
          'prefect.resource.name': 'craig-prefect-io',
          'prefect.resource.role': 'creator',
        },
      ],
      'payload': {
        'intended': {
          'to': 'PENDING',
          'from': 'SCHEDULED',
        },
        'initial_state': {
          'name': 'Scheduled',
          'type': 'SCHEDULED',
          'message': 'Run from the Prefect UI with defaults',
        },
        'validated_state': {
          'name': 'Pending',
          'type': 'PENDING',
        },
      },
      'id': 'e91f37fe-6458-41f1-98e7-4917d459f5ca',
      'follows': '4b83f6d8-8425-4256-a1a1-733e8cc9f33f',
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:52.721365+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.892842+00:00',
      'event': 'prefect.block.azure-container-instance-job.load.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.20915e95-fccf-434e-9f52-c26e75c700d6',
        'prefect.resource.name': 'eng-ui-container-job',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure-container-instance-job',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': '59512bc3-9a48-47ba-8eb3-aea127d081d2',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:53.119614+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.893913+00:00',
      'event': 'prefect.block.azure-container-instance-job.copy.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.20915e95-fccf-434e-9f52-c26e75c700d6',
        'prefect.resource.name': 'eng-ui-container-job',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure-container-instance-job',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': 'a65fd4df-0683-471b-b104-5f0010a364c3',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:53.120041+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.895238+00:00',
      'event': 'prefect.block.azure-container-instance-job.prepare_for_flow_run.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.20915e95-fccf-434e-9f52-c26e75c700d6',
        'prefect.resource.name': 'eng-ui-container-job',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure-container-instance-job',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': '846c62c6-9cef-4e40-83c2-19641797281c',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:53.120718+00:00',
    },
    {
      'occurred': '2023-05-23T20:49:52.895706+00:00',
      'event': 'prefect.block.azure-container-instance-job.run.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.20915e95-fccf-434e-9f52-c26e75c700d6',
        'prefect.resource.name': 'eng-ui-container-job',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure-container-instance-job',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': '46ff564e-ee7a-4112-baa9-2c2590ccf1db',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:49:53.121198+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:57.137010+00:00',
      'event': 'prefect.block.azure.load.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.92e5a49c-99bb-4424-8417-06a2756efcd6',
        'prefect.resource.name': 'ui-azure',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': '2e8573f8-9a26-403e-818a-8806aa068060',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:50:58.186216+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:57.137638+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
      },
      'related': [],
      'payload': {
        'name': 'prefect.flow_runs',
        'level': 20,
        'message': 'Downloading flow code from storage at None',
        'level_name': 'INFO',
      },
      'id': 'ba4cd70b-1317-4ba1-874f-718ef0620d80',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:00.151753+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:57.141779+00:00',
      'event': 'prefect.block.azure.get_directory.called',
      'resource': {
        'prefect.resource.id': 'prefect.block-document.92e5a49c-99bb-4424-8417-06a2756efcd6',
        'prefect.resource.name': 'ui-azure',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.block-type.azure',
          'prefect.resource.role': 'block-type',
        },
      ],
      'payload': {},
      'id': 'b9c74117-2f56-4406-83ef-e37eaee1758c',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:50:58.187016+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:58.403242+00:00',
      'event': 'prefect.flow-run.Running',
      'resource': {
        'prefect.state-name': 'Running',
        'prefect.state-type': 'RUNNING',
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
        'prefect.resource.name': 'idealistic-shrew',
        'prefect.state-message': '',
        'prefect.state-timestamp': '2023-05-23T20:50:58.403242+00:00',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.flow.3a29cec3-090a-494b-89ef-bd4bcb606701',
          'prefect.resource.name': 'date-world',
          'prefect.resource.role': 'flow',
        },
        {
          'prefect.resource.id': 'prefect.deployment.9302e52c-2c4c-4944-85e0-61d48e9cbfcc',
          'prefect.resource.name': 'date-time-test-azure',
          'prefect.resource.role': 'deployment',
        },
        {
          'prefect.resource.id': 'prefect.work-queue.cace996d-09b8-4282-8bc2-6f5ceac87dd6',
          'prefect.resource.name': 'azure-contain-a',
          'prefect.resource.role': 'work-queue',
        },
        {
          'prefect.resource.id': 'prefect.work-pool.0c2acca5-4a69-4aa9-b212-3e2426383b6f',
          'prefect.resource.name': 'default-agent-pool',
          'prefect.resource.role': 'work-pool',
        },
        {
          'prefect.resource.id': 'prefect.tag.azure',
          'prefect.resource.role': 'tag',
        },
        {
          'prefect.resource.id': 'prefect-cloud.user.4a62e1ac-e491-4938-b4f9-728e5bd0a091',
          'prefect.resource.name': 'craig-prefect-io',
          'prefect.resource.role': 'creator',
        },
      ],
      'payload': {
        'intended': {
          'to': 'RUNNING',
          'from': 'PENDING',
        },
        'initial_state': {
          'name': 'Pending',
          'type': 'PENDING',
        },
        'validated_state': {
          'name': 'Running',
          'type': 'RUNNING',
        },
      },
      'id': '518a5825-3438-4a89-be9a-1ab8081e2608',
      'follows': 'e91f37fe-6458-41f1-98e7-4917d459f5ca',
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:50:58.508478+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:58.773175+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
      },
      'related': [],
      'payload': {
        'name': 'prefect.flow_runs',
        'level': 20,
        'message': "Created task run 'sleep_task-0' for task 'sleep_task'",
        'level_name': 'INFO',
      },
      'id': 'fbdf6578-157a-4ee7-974c-364795943a4c',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:00.152165+00:00',
    },
    {
      'occurred': '2023-05-23T20:50:58.775132+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
      },
      'related': [],
      'payload': {
        'name': 'prefect.flow_runs',
        'level': 20,
        'message': "Executing 'sleep_task-0' immediately...",
        'level_name': 'INFO',
      },
      'id': '875188b8-fe91-4075-b20f-cd69f4c3d75e',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:00.152477+00:00',
    },
    {
      'occurred': '2023-05-23T20:51:09.458077+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.task-run.522cb793-ffdb-4e29-875a-71596ea5ecbe',
      },
      'related': [
        {
          'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
          'prefect.resource.role': 'flow-run',
        },
      ],
      'payload': {
        'name': 'prefect.task_runs',
        'level': 20,
        'message': 'Finished in state Completed()',
        'level_name': 'INFO',
      },
      'id': '11f72c77-3654-4c72-bd96-abe4dcbd344e',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:10.152467+00:00',
    },
    {
      'occurred': '2023-05-23T20:51:09.558581+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
      },
      'related': [],
      'payload': {
        'name': 'prefect.flow_runs',
        'level': 20,
        'message': "Created task run 'signal_task-0' for task 'signal_task'",
        'level_name': 'INFO',
      },
      'id': '2ff417df-226a-49c5-8e68-bea61efb7675',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:10.152823+00:00',
    },
    {
      'occurred': '2023-05-23T20:51:09.559958+00:00',
      'event': 'prefect.log.write',
      'resource': {
        'prefect.resource.id': 'prefect.flow-run.d7e37225-a465-4d18-bdd6-73da324228bb',
      },
      'related': [],
      'payload': {
        'name': 'prefect.flow_runs',
        'level': 20,
        'message': "Executing 'signal_task-0' immediately...",
        'level_name': 'INFO',
      },
      'id': 'd76d23ce-31e5-4cbe-abb4-061829f8749b',
      'follows': null,
      'account': '9a67b081-4f14-4035-b000-1f715f46231b',
      'workspace': 'a63a76bd-e6b4-42a5-8cb2-d2fcf233a57b',
      'received': '2023-05-23T20:51:10.153101+00:00',
    },
  ]
</script>

<style>
.brain-view {
  width: 100%;
  height: 100%;
}
</style>
