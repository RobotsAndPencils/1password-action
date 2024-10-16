import * as exec from '@actions/exec'
import * as core from '@actions/core'

export async function execWithOutput(
  command: string,
  args?: string[],
  options?: exec.ExecOptions
): Promise<string> {
  let out = ''
  let err = ''

  const opt = options ?? {}
  opt.silent = true
  opt.listeners = {
    stdout: (data: Buffer) => {
      out += data.toString()
    },
    stderr: (data: Buffer) => {
      err += data.toString().trim()
    }
  }
  try {
    core.info(`Executing command: ${command} ${args ? args.join(' ') : ''}`)
    await exec.exec(command, args, opt)
  } catch {
    if (err) {
      throw new Error(err)
    } else {
      return out
    }
  }

  return out
}
