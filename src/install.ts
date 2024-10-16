import os from 'os'
import * as core from '@actions/core'
import {mv} from '@actions/io'
import {chmod} from '@actions/io/lib/io-util'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

const KEY_FINGERPRINT = '3FEF9748469ADBE15DA7CA80AC2D62742012EA22'

export async function install(onePasswordVersion: string): Promise<void> {
  const platform = os.platform().toLowerCase()
  let arch = os.arch() // This will return 'x64' for Intel and 'arm64' for Apple Silicon

  if (arch === 'x64') {
    arch = 'amd64'
  }
  const onePasswordUrl = `https://cache.agilebits.com/dist/1P/op2/pkg/v${onePasswordVersion}/op_${platform}_${arch}_v${onePasswordVersion}.zip`
  core.info(
    `Downloading ${onePasswordVersion} for ${platform} from ${onePasswordUrl}`
  )
  const archive = await tc.downloadTool(onePasswordUrl)
  const extracted = await tc.extractZip(archive)

  if (platform !== 'darwin') {
    await exec.exec('gpg', [
      '--keyserver',
      'keyserver.ubuntu.com',
      '--receive-keys',
      KEY_FINGERPRINT
    ])
    const verifyStatus = await exec.exec('gpg', [
      '--verify',
      `${extracted}/op.sig`,
      `${extracted}/op`
    ])
    if (verifyStatus !== 0) {
      throw new Error(
        `Signature verification of the executable downloaded from ${onePasswordUrl} failed.`
      )
    }
  }

  let destination = `${process.env.HOME}/bin`

  // Using ACT, lets set to a directory we have access to.
  if (process.env.ACT) {
    destination = `/tmp`
  }

  await mv(`${extracted}/op`, `${destination}/op`)
  await chmod(`${destination}/op`, '0755')

  const cachedPath = await tc.cacheDir(destination, 'op', onePasswordVersion)
  core.addPath(cachedPath)
}
