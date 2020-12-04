import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import {execWithOutput} from './exec'
import {Item} from './types'
import {install} from './install'
import * as parsing from './parsing'

const ONE_PASSWORD_VERSION = '1.8.0'

async function run(): Promise<void> {
  try {
    const deviceId = core.getInput('device-id')
    const signInAddress = core.getInput('sign-in-address')
    const emailAddress = core.getInput('email-address')
    const masterPassword = core.getInput('master-password')
    const secretKey = core.getInput('secret-key')
    const itemRequestsString = core.getInput('items')

    // Set inputs to secrets so they can't be leaked back to github console accidentally
    core.setSecret(deviceId)
    core.setSecret(signInAddress)
    core.setSecret(emailAddress)
    core.setSecret(masterPassword)
    core.setSecret(secretKey)

    // Check if op is installed and download if necessary
    const cachedOpDirectory = tc.find('op', ONE_PASSWORD_VERSION)
    // This seems like a weird API, why not return undefined?
    if (cachedOpDirectory !== '') {
      core.addPath(cachedOpDirectory)
    } else {
      await install(ONE_PASSWORD_VERSION)
    }

    const env: {[key: string]: string} = {
      OP_DEVICE: deviceId
    }

    if (process.env['XDG_CONFIG_HOME'] === undefined) {
      // This env var isn't set on GitHub-hosted runners
      env.XDG_CONFIG_HOME = `${process.env['HOME']}/.config`
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
        env,
        input: Buffer.alloc(masterPassword.length, masterPassword)
      }
    )
    const session = output.toString().trim()
    core.setSecret(session)

    env.OP_SESSION_github_action = session

    const itemRequests = parsing.parseItemRequestsInput(itemRequestsString)

    for (const itemRequest of itemRequests) {
      const itemsJSON = await execWithOutput(
        'op',
        ['list', 'items', '--vault', itemRequest.vault],
        {env}
      )

      const items: Item[] = JSON.parse(itemsJSON)
      const uuid = items
        .filter(item => item.overview.title === itemRequest.name)
        .map(item => item.uuid)[0]

      const itemJSON = await execWithOutput(
        'op',
        ['get', 'item', uuid, '--vault', itemRequest.vault],
        {env}
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

          const usernameOutputName = `${itemRequest.outputName}_username`
          core.setOutput(usernameOutputName, username)
          const passwordOutputName = `${itemRequest.outputName}_password`
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

          const passwordOutputName = `${itemRequest.outputName}_password`
          core.setSecret(password)
          core.setOutput(passwordOutputName, password)

          break
        }
        // Document
        case '006': {
          const filename = item.details.documentAttributes?.fileName
          if (filename === undefined) {
            throw new Error(
              'Expected string for property document.details.documentAttributes?.filename, got undefined.'
            )
          }

          await exec.exec(
            'op',
            ['get', 'document', uuid, '--output', filename],
            {env}
          )

          const documentOutputName = `${itemRequest.outputName}_filename`
          core.setOutput(documentOutputName, filename)

          break
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
