import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import {execWithOutput} from './exec'
import {Item} from './types'
import {install} from './install'

const ONE_PASSWORD_VERSION = '1.7.0'

async function run(): Promise<void> {
  try {
    const deviceId = core.getInput('device-id')
    const signInAddress = core.getInput('sign-in-address')
    const emailAddress = core.getInput('email-address')
    const masterPassword = core.getInput('master-password')
    const secretKey = core.getInput('secret-key')
    const vaultName = core.getInput('vault-name')
    const itemName = core.getInput('item-name')

    // Check if op is installed and download if necessary
    const cachedOpDirectory = tc.find('op', ONE_PASSWORD_VERSION)
    // This seems like a weird API, why not return undefined?
    if (cachedOpDirectory !== '') {
      core.addPath(cachedOpDirectory)
    } else {
      await install(ONE_PASSWORD_VERSION)
    }

    const output = await execWithOutput(
      'op',
      [
        'signin',
        signInAddress,
        emailAddress,
        secretKey,
        '--raw',
        '--shorthand',
        'github_action'
      ],
      {
        env: {
          OP_DEVICE: deviceId
        },
        input: Buffer.alloc(masterPassword.length, masterPassword)
      }
    )
    const session = output.toString().trim()
    core.setSecret(session)

    const itemsJSON = await execWithOutput(
      'op',
      ['list', 'items', '--vault', vaultName],
      {env: {OP_DEVICE: deviceId, OP_SESSION_github_action: session}}
    )

    const items: Item[] = JSON.parse(itemsJSON)
    const uuid = items
      .filter(item => item.overview.title === itemName)
      .map(item => item.uuid)[0]

    const itemJSON = await execWithOutput(
      'op',
      ['get', 'item', uuid, '--vault', vaultName],
      {env: {OP_DEVICE: deviceId, OP_SESSION_github_action: session}}
    )
    const item: Item = JSON.parse(itemJSON)

    switch (item.templateUuid) {
      // Item
      case '001': {
        const username = (item.details.fields ?? []).filter(
          field => field.designation === 'username'
        )[0].value
        const password = (item.details.fields ?? []).filter(
          field => field.designation === 'password'
        )[0].value

        const normalizedItemName = normalizeOutputName(item.overview.title)
        const usernameOutputName = `${normalizedItemName}_username`
        core.setOutput(usernameOutputName, username)
        const passwordOutputName = `${normalizedItemName}_password`
        core.setSecret(password)
        core.setOutput(passwordOutputName, password)

        break
      }
      // Password
      case '005': {
        const password = item.details.password
        if (password === undefined) {
          throw new Error(
            'Expected string for property item.details.password, got undefined.'
          )
        }

        const normalizedItemName = normalizeOutputName(item.overview.title)
        const passwordOutputName = `${normalizedItemName}_password`
        core.setSecret(password)
        core.setOutput(passwordOutputName, password)
        break
      }
      // Document
      case '006': {
        const documentOutput = await execWithOutput(
          'op',
          ['get', 'document', uuid, '--vault', vaultName],
          {env: {OP_DEVICE: deviceId, OP_SESSION_github_action: session}}
        )
        core.info(documentOutput)
        break
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

function normalizeOutputName(dataKey: string): string {
  return dataKey
    .replace(' ', '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .toLowerCase()
}

run()
