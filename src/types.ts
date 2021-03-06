export type Item = {
  uuid: string
  templateUuid: string
  overview: Overview
  details: Details
}

export type Overview = {
  title: string
}

export type Details = {
  fields?: Field[]
  password?: string
  documentAttributes?: DocumentAttributes
}

export type DocumentAttributes = {
  fileName: string
}

export type Field = {
  designation: string
  name: string
  value: string
}
