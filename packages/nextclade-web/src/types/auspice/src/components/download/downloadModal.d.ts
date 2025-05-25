declare module 'auspice/src/components/download/downloadModal' {
  export interface Publication {
    author: string
    title: string
    year: string
    journal: string
    href: string
  }

  export interface Publications {
    nextstrain: Publication
    treetime: Publication
    titers: Publication
    [k: string]: Publication
  }

  export const publications: Publications
}
