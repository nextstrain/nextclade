import React, { ReactNode, useMemo } from 'react'

import { LinkExternal } from 'src/components/Link/LinkExternal'
import { PROJECT_NAME } from 'src/constants'
import { AffiliationText, Flex, Li, NameText, Portrait, Ul } from './TeamCreditsStyles'

export interface MaintainerInfoLink {
  title: string
  url: string
  alt: string
  icon: ReactNode
}

export interface MaintainerInfo {
  name: string
  portraitUrl: string
  title: string
  affiliations: string[]
  links: MaintainerInfoLink[]
}

export interface MaintainerProps {
  maintainer: MaintainerInfo
}

export function Maintainer({ maintainer }: MaintainerProps) {
  const { name, portraitUrl, title, affiliations, links } = maintainer
  const alt = useMemo(() => `Portrait of '${PROJECT_NAME}' maintainer, ${name}`, [name])
  const affiliationComponents = useMemo(
    () => affiliations.map((affiliation) => <AffiliationText key={affiliation}>{affiliation}</AffiliationText>),
    [affiliations],
  )
  return (
    <Flex>
      <Portrait src={portraitUrl} alt={alt} />
      <NameText>{name}</NameText>
      <AffiliationText>{title}</AffiliationText>
      {affiliationComponents}
      <Ul>
        {links.map(({ title, url, alt, icon }) => (
          <Li key={title}>
            <LinkExternal title={title} href={url} alt={alt}>
              {icon}
            </LinkExternal>
          </Li>
        ))}
      </Ul>
    </Flex>
  )
}
