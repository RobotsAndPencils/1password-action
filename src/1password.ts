import * as core from '@actions/core'
import {install} from './install'
import * as tc from '@actions/tool-cache'
import {execWithOutput} from './exec'

const ONE_PASSWORD_VERSION = '1.8.0'

export class OnePassword {
  onePasswordEnv: {[key: string]: string}

  constructor(deviceId: string) {
    this.onePasswordEnv = {
      OP_DEVICE: deviceId
    }

    if (process.env['XDG_CONFIG_HOME'] === undefined) {
      // This env var isn't set on GitHub-hosted runners
      this.onePasswordEnv.XDG_CONFIG_HOME = `${process.env['HOME']}/.config`
    }
  }

  async setupAndInstallIfNeeded(): Promise<void> {
    // Check if op is installed and download if necessary
    const cachedOpDirectory = tc.find('op', ONE_PASSWORD_VERSION)
    // This seems like a weird API, why not return undefined?
    if (cachedOpDirectory !== '') {
      core.addPath(cachedOpDirectory)
    } else {
      await install(ONE_PASSWORD_VERSION)
    }
  }

  async signIn(
    signInAddress: string,
    emailAddress: string,
    secretKey: string,
    masterPassword: string
  ): Promise<void> {
    const env = this.onePasswordEnv
    try {
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

      core.info(`Successfully signed in to 1Password`)
      const session = output.toString().trim()
      core.setSecret(session)

      this.onePasswordEnv.OP_SESSION_github_action = session
    } catch (error) {
      throw error
    }
  }
  async listItemsInVault(vault: string): Promise<string> {
    const env = this.onePasswordEnv

    return await execWithOutput('op', ['list', 'items', '--vault', vault], {
      env
    })
  }

  async getItemInVault(vault: string, uuid: string): Promise<string> {
    const env = this.onePasswordEnv
    return await execWithOutput('op', ['get', 'item', uuid, '--vault', vault], {
      env
    })
  }

  async getDocument(uuid: string, filename: string): Promise<void> {
    const env = this.onePasswordEnv
    await execWithOutput(
      'op',
      ['get', 'document', uuid, '--output', filename],
      {
        env
      }
    )
  }

  async signOut(): Promise<void> {
    const env = this.onePasswordEnv
    await execWithOutput('op', ['signout', '--forget'], {env})
  }
}
