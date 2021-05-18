export type Item = {
  details: Details
  overview: Overview
  templateUuid: string
  uuid: string
}

export type Overview = {
  title: string
}

export type Details = {
  fields?: Field[]
  password?: string
  documentAttributes?: DocumentAttributes
  sections?: Section[]
}

export type DocumentAttributes = {
  fileName: string
}

export type Field = {
  designation: string
  name: string
  value: string
}

interface Section {
  fields: {
    /** Conceal? */
    k: 'concealed' | string
    /** Id */
    n: string
    /** Name */
    t: string
    /** Value */
    v: string
  }[]
  name: ''
  /** Section Title */
  title: string
}
