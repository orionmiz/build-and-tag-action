import { Toolkit } from 'actions-toolkit'
import semver from 'semver'
import createOrUpdateRef from './create-or-update-ref'
import createCommit from './create-commit'
import updateTag from './update-tag'
import getTagName from './get-tag-name'

export default async function buildAndTagAction(tools: Toolkit) {
  // Get the tag to update
  const tagName = getTagName(tools)
  tools.log.info(`Updating tag [${tagName}]`)

  // Create a new commit, with the new tree
  const commit = await createCommit(tools)

  // Update the tag to point to the new commit
  await createOrUpdateRef(tools, commit.sha, tagName);

  // Also update the major version tag.
  // For example, for version v1.0.0, we'd also update v1.
  let shouldRewriteMajorAndMinorRef = true

  const prerelease = semver.prerelease(tagName)

  if (prerelease) {
    await createOrUpdateRef(tools, commit.sha, prerelease[0])
    
    // If this is a prerelease, do not update the major and minor ref.
    shouldRewriteMajorAndMinorRef = false
  }

  // If this is a release event, only update the major ref for a full release.
  if (tools.context.event === 'release') {
    const { draft, prerelease } = tools.context.payload.release
    if (draft || prerelease) {
      shouldRewriteMajorAndMinorRef = false
    }
  }

  if (shouldRewriteMajorAndMinorRef) {
    const majorStr = semver.major(tagName).toString()
    const minorStr = semver.minor(tagName).toString()
    await createOrUpdateRef(tools, commit.sha, `v${majorStr}.${minorStr}`)
    return createOrUpdateRef(tools, commit.sha, `v${majorStr}`)
  }
}
