import * as exec from '@actions/exec'

export async function execWithOutput(
  command: string,
  args?: string[],
  options?: exec.ExecOptions
): Promise<string> {
  let out = ''
  const opt = options ?? {}
  opt.silent = true
  opt.listeners = {
    stdout: (data: Buffer) => {
      out += data.toString()
    }
  }
  await exec.exec(command, args, opt)
  return out
}
