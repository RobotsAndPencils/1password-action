import * as exec from '@actions/exec'

export async function execWithOutput(
  command: string,
  args?: string[],
  options?: exec.ExecOptions
): Promise<string> {
  let out = ''
  let err = ''

  const opt = options ?? {}
  opt.silent = true // for debugging set this to false to see the output of 1password
  opt.listeners = {
    stdout: (data: Buffer) => {
      out += data.toString()
    },
    stderr: (data: Buffer) => {
      err += data.toString().trim()
    }
  }
  try {
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
