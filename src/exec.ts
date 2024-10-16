import * as exec from '@actions/exec'

export async function execWithOutput(
  command: string,
  args?: string[],
  options?: exec.ExecOptions
): Promise<string> {
  let out = ''
  let err = ''

  const isDebug = process.env.ACTIONS_STEP_DEBUG === 'true'
  const opt = options ?? {}
  opt.silent = !isDebug
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
