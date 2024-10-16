import * as core from '@actions/core'
import {OnePassword} from './1password'
import * as parsing from './parsing'
import {Item} from './types'
import style from 'ansi-styles'

async function run(): Promise<void> {
  // try {
  const deviceId = core.getInput('device-id')

  const onePassword = new OnePassword(deviceId)

  try {
    await onePassword.setupAndInstallIfNeeded()
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(
        `Run has failed setupAndInstallIfNeeded with ${JSON.stringify(error)}`
      )
    }
  }

  const signInAddress = core.getInput('sign-in-address')
  const emailAddress = core.getInput('email-address')
  const masterPassword = core.getInput('master-password')
  const secretKey = core.getInput('secret-key')

  // Set inputs to secrets so they can't be leaked back to github console accidentally
  core.setSecret(signInAddress)
  core.setSecret(emailAddress)
  core.setSecret(masterPassword)
  core.setSecret(secretKey)

  core.startGroup('Signing in to 1Password')

  try {
    await onePassword.signIn(
      signInAddress,
      emailAddress,
      secretKey,
      masterPassword
    )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Error signing in to 1Password: ${error.message}`)
    } else {
      core.setFailed(`Error signing in to 1Password:: ${JSON.stringify(error)}`)
    }
    return
  }
  core.endGroup()

  core.startGroup('Getting Items')

  const itemRequestsString = core.getInput('items')
  const itemRequests = parsing.parseItemRequestsInput(itemRequestsString)

  try {
    await requestItems(onePassword, itemRequests)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(
        `Run has failed requestItems with ${JSON.stringify(error)}`
      )
    }
  }

  core.endGroup()

  core.info('Signing out of 1Password')

  try {
    await onePassword.signOut()
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`Run has failed signOut with ${JSON.stringify(error)}`)
    }
  }
}

async function requestItems(
  onePassword: OnePassword,
  itemRequests: parsing.ItemRequest[]
): Promise<void> {
  for (const itemRequest of itemRequests) {
    try {
      core.info(
        `Getting items in 1Password Vault:${style.bold.open} ${itemRequest.vault}`
      )
      const itemsJSON = await onePassword.listItemsInVault(itemRequest.vault)

      const items: Item[] = JSON.parse(itemsJSON)
      const uuid = items
        .filter(item => item.title === itemRequest.name)
        .map(item => item.id)[0]

      if (!uuid) {
        throw new Error(
          `Could not find item in vault${style.inverse.open} ${itemRequest.vault}${style.inverse.close} with name${style.inverse.open} ${itemRequest.name}`
        )
      }

      const itemJSON = await onePassword.getItemInVault(itemRequest.vault, uuid)
      const item: Item = JSON.parse(itemJSON)

      switch (item.category) {
        case 'LOGIN': {
          const username = (item.fields ?? []).filter(
            field => field.purpose === 'USERNAME'
          )[0].value
          const password = (item.fields ?? []).filter(
            field => field.purpose === 'PASSWORD'
          )[0].value

          const usernameOutputName = `${itemRequest.outputName}_username`
          core.debug(`Setting username variable ${usernameOutputName}`)
          core.setOutput(usernameOutputName, username)
          const passwordOutputName = `${itemRequest.outputName}_password`
          core.debug(`Setting password variable ${passwordOutputName}`)
          core.setSecret(password)
          core.setOutput(passwordOutputName, password)

          break
        }
        case 'PASSWORD': {
          const password = (item.fields ?? []).filter(
            field => field.purpose === 'PASSWORD'
          )[0].value

          if (password === undefined) {
            throw new Error(
              `${style.inverse.open}Expected string for field password, got undefined.`
            )
          }

          const passwordOutputName = `${itemRequest.outputName}_password`
          core.debug(`Setting password variable ${passwordOutputName}`)
          core.setSecret(password)
          core.setOutput(passwordOutputName, password)

          break
        }
        case 'DOCUMENT': {
          const filename = (item.files ?? [])[0].name
          if (filename === undefined) {
            throw new Error(
              `${style.inverse.open}Expected string for file name, got undefined.`
            )
          }

          try {
            await onePassword.getDocument(uuid, filename)
          } catch (error) {
            throw new Error(
              `${style.inverse.open}Error downloading file ${filename} - ${error}`
            )
          }

          const documentOutputName = `${itemRequest.outputName}_filename`
          core.debug(`Setting document variable ${documentOutputName}`)
          core.setOutput(documentOutputName, filename)

          break
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error(
          `request items has failed with ${JSON.stringify(error)}`
        )
      }
    }
  }
}

run()
