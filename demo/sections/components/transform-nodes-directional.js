const fs = require('fs');
// import events.json into this node file
// events.json is an array of objects following this typescript type
// { resource: { id: string }, related: { id: string }[] }
const events = require('./events.json');

const output = {
  nodes: [],
  links: [],
}

const nodes = new Map()
const links = new Set()

// const trimmed = events.splice(0, 10000);

// add each event to the output.nodes array
// add each event.related to the output.links array
events.forEach((event) => {
  if(event.related.length === 0) {
    return
  }

  const resource = {
    ...event.resource,
    'prefect.resource.role': event.event,
  }

  nodes.set(resource['prefect.resource.id'], resource)
  event.related.forEach((related) => {
    nodes.set(related['prefect.resource.id'], related)
  })

  event.related.forEach((related) => {
    links.add(`${related['prefect.resource.id']}#${event.resource['prefect.resource.id']}`)
  })
})

output.nodes = Array.from(nodes.values())
output.links = Array.from(links).map((link) => {
  const [source, target] = link.split('#')
  return {
    source,
    target,
  }
})

// output the output object to a file relative to this file
fs.writeFileSync('./demo/sections/components/nodes-basic.json', JSON.stringify(output, null, 2));