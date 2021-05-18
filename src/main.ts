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
    core.setFailed(error.message)
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
    core.setFailed(`Error signing in to 1Password: ${error.message}`)
    return
  }
  core.endGroup()

  core.startGroup('Getting Items')

  const itemRequestsString = core.getInput('items')
  const itemRequests = parsing.parseItemRequestsInput(itemRequestsString)

  try {
    await requestItems(onePassword, itemRequests)
  } catch (error) {
    core.setFailed(error.message)
  }

  core.endGroup()

  core.info('Signing out of 1Password')

  try {
    await onePassword.signOut()
  } catch (error) {
    core.setFailed(error.message)
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
        .filter(item => item.overview.title === itemRequest.name)
        .map(item => item.uuid)[0]

      if (!uuid) {
        throw new Error(
          `Could not find item in vault${style.inverse.open} ${itemRequest.vault}${style.inverse.close} with name${style.inverse.open} ${itemRequest.name}`
        )
      }

      core.info(`Loading${style.bold.open} ${itemRequest.name}`)
      const itemJSON = await onePassword.getItemInVault(itemRequest.vault, uuid)
      const item: Item = JSON.parse(itemJSON)

      switch (item.templateUuid) {
        // Login
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
              `${style.inverse.open}Expected string for property item.details.password, got undefined.`
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
              `${style.inverse.open}Expected string for property document.details.documentAttributes?.filename, got undefined.`
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
          core.setOutput(documentOutputName, filename)

          break
        }
        /** Passport */
        case '106': {
          const allSections = item.details.sections
          if (!allSections) {
            break
          }
          for (const section of allSections) {
            for (const field of section.fields) {
              const {k: conceal, t: name, v: value} = field
              if (conceal === 'concealed') {
                core.setSecret(value)
              }

              core.setOutput(
                `${itemRequest.outputName}_${section.title}_${name}`,
                value
              )
            }
          }
          break
        }
      }
    } catch (error) {
      throw new Error(error)
    }
  }
}

run()
