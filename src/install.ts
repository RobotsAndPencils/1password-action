import os from 'os'
import * as core from '@actions/core'
import {mv} from '@actions/io'
import {chmod} from '@actions/io/lib/io-util'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import {execWithOutput} from './exec'

const CERT_IDENTIFIER = 'Developer ID Installer: AgileBits Inc. (2BUA8C4S2C)'

export async function install(onePasswordVersion: string): Promise<void> {
  const platform = os.platform().toLowerCase()

  let extension = 'zip'
  if (platform === 'darwin') {
    extension = 'pkg'
  }
  const onePasswordUrl = `https://cache.agilebits.com/dist/1P/op/pkg/v${onePasswordVersion}/op_${platform}_amd64_v${onePasswordVersion}.${extension}`
  const archive = await tc.downloadTool(onePasswordUrl)

  let extracted: string
  if (platform === 'darwin') {
    const signatureCheck = await execWithOutput('pkgutil', [
      '--check-signature',
      archive
    ])
    if (signatureCheck.includes(CERT_IDENTIFIER) === false) {
      throw new Error(
        `Unable to verify the code signature of the installer package downloaded from ${onePasswordUrl}.\nExpecting it to include ${CERT_IDENTIFIER}.\nReceived:\n${signatureCheck}`
      )
    } else {
      core.info('Verified the code signature of the installer package.')
    }

    // Expanding the package manually to avoid needing an admin password for installation and to be able to put it into the tool cache.
    const destination = 'op.unpkg'
    await exec.exec('pkgutil', ['--expand', archive, destination])
    await exec.exec(
      `/bin/bash -c "cat ${destination}/Payload | gzip -d | cpio -id"`
    )
    extracted = '.'
  } else {
    extracted = await tc.extractZip(archive)
  }
  const destination = `${process.env.HOME}/bin`
  await mv(`${extracted}/op`, `${destination}/op`)
  await chmod(`${destination}/op`, '0755')

  const cachedPath = await tc.cacheDir(destination, 'op', onePasswordVersion)
  core.addPath(cachedPath)
}
