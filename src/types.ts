export type Item = {
  id: string
  title: string
  category: string
  fields?: Field[]
  files?: File[]
}

export type Field = {
  id: string
  type: string
  purpose: string
  label: string
  value: string
}

export type File = {
  id: string
  name: string
}
