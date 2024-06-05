import { Toolkit } from 'actions-toolkit'
import readFile from './read-file'
import jsYaml from 'js-yaml'

export default async function createCommit(tools: Toolkit) {
  const { content: yaml, file } = await Promise.any(
    ['action.yml', 'action.yaml'].map((file) =>
      readFile(tools.workspace, file).then((content) => ({ content, file }))
    )
  )

  const action = jsYaml.safeLoad(yaml) as {
    runs?: {
      main?: string
    }
  }

  const main = action?.runs?.main

  if (!main) {
    throw new Error(`Property "main" does not exist in your \`${file}\`.`)
  }

  tools.log.info('Creating tree')
  const tree = await tools.github.git.createTree({
    ...tools.context.repo,
    tree: [
      {
        path: file,
        mode: '100644',
        type: 'blob',
        content: yaml
      },
      {
        path: main,
        mode: '100644',
        type: 'blob',
        content: await readFile(tools.workspace, main)
      }
    ]
  })

  tools.log.complete('Tree created')

  tools.log.info('Creating commit')
  const commit = await tools.github.git.createCommit({
    ...tools.context.repo,
    message: 'Automatic compilation',
    tree: tree.data.sha,
    parents: [tools.context.sha]
  })
  tools.log.complete('Commit created')

  return commit.data
}
