import * as core from '@actions/core'
import {install} from './install'
import * as tc from '@actions/tool-cache'
import {execWithOutput} from './exec'

const ONE_PASSWORD_VERSION = '2.30.0'

export class OnePassword {
  onePasswordEnv: {[key: string]: string}

  constructor(deviceId: string) {
    this.onePasswordEnv = {
      ...process.env,
      OP_DEVICE: deviceId
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
          'account',
          'add',
          '--address',
          signInAddress,
          '--email',
          emailAddress,
          '--secret-key',
          secretKey,
          '--raw',
          '--shorthand',
          'github_action',
          '--signin'
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
      if (error instanceof Error) {
        throw new Error(error.message)
      } else {
        throw new Error(`signIn has failed with ${JSON.stringify(error)}`)
      }
    }
  }
  async listItemsInVault(vault: string): Promise<string> {
    const env = this.onePasswordEnv

    return await execWithOutput(
      'op',
      ['item', 'list', '--vault', vault, '--format=json'],
      {
        env
      }
    )
  }

  async getItemInVault(vault: string, uuid: string): Promise<string> {
    const env = this.onePasswordEnv
    return await execWithOutput(
      'op',
      ['item', 'get', uuid, '--vault', vault, '--format=json'],
      {
        env
      }
    )
  }

  async getDocument(uuid: string, filename: string): Promise<void> {
    const env = this.onePasswordEnv
    await execWithOutput(
      'op',
      ['document', 'get', uuid, '--output', filename],
      {
        env
      }
    )
  }

  async signOut(): Promise<void> {
    const env = this.onePasswordEnv
    await execWithOutput(
      'op',
      ['signout', '--account', 'github_action', '--forget'],
      {env}
    )
  }
}
