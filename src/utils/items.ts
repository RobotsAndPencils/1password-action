import * as core from '@actions/core'
import {ItemRequest} from '../parsing'
import {Section} from '../types'

export function sectionParse(
  allSections: Section[],
  itemRequest: ItemRequest
): void {
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
}
