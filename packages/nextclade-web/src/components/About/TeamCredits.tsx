import { shuffle } from 'lodash'
import React, { ReactNode, useMemo } from 'react'
import { Col, Row } from 'reactstrap'
import styled from 'styled-components'
import { FaGithub, FaTwitter } from 'react-icons/fa'
import { GiEarthAfricaEurope } from 'react-icons/gi'
import { PROJECT_NAME } from 'src/constants'
import { getContributors } from 'src/io/getContributors'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { TeamCreditsContributor } from 'src/components/About/TeamCreditsContributor'
import NextstrainLogo from 'src/assets/img/nextstrain_logo.svg'

const maintainers: MaintainerInfo[] = [
  {
    name: 'Ivan Aksamentov',
    portraitUrl: 'https://avatars3.githubusercontent.com/u/9403403?s=400',
    title: 'Senior Software Engineer',
    affiliations: ['NeherLab, Biozentrum, University of Basel', 'Swiss Institute of Bioinformatics'],
    links: [
      {
        title: 'GitHub',
        url: 'https://github.com/ivan-aksamentov',
        alt: 'Link to GitHub page, with grey GitHub Octocat logo',
        icon: <FaGithub size={25} color="#24292E" />,
      },
    ],
  },
  {
    name: 'Richard Neher',
    portraitUrl: 'https://avatars3.githubusercontent.com/u/8379168?s=400',
    title: 'Principal Investigator',
    affiliations: ['NeherLab, Biozentrum, University of Basel', 'Swiss Institute of Bioinformatics'],
    links: [
      {
        title: 'Website',
        url: `https://neherlab.org`,
        alt: 'Link to website',
        icon: <GiEarthAfricaEurope size={25} color="#3267E9" />,
      },
      {
        title: 'Twitter',
        url: `https://twitter.com/richardneher`,
        alt: 'Link to Twitter, with blue Twitter bird logo',
        icon: <FaTwitter size={25} color="#08a0e9" />,
      },
      {
        title: 'GitHub',
        url: 'https://github.com/rneher',
        alt: 'Link to GitHub page, with grey GitHub Octocat logo',
        icon: <FaGithub size={25} color="#24292E" />,
      },
    ],
  },
  {
    name: 'Cornelius Roemer',
    portraitUrl: 'https://avatars1.githubusercontent.com/u/25161793?v=4',
    title: 'Staff Scientist',
    affiliations: ['NeherLab, Biozentrum, University of Basel', 'Swiss Institute of Bioinformatics'],
    links: [
      {
        title: 'Twitter',
        url: `https://twitter.com/corneliusroemer`,
        alt: 'Link to Twitter, with blue Twitter bird logo',
        icon: <FaTwitter size={25} color="#08a0e9" />,
      },
      {
        title: 'GitHub',
        url: 'https://github.com/corneliusroemer',
        alt: 'Link to GitHub page, with grey GitHub Octocat logo',
        icon: <FaGithub size={25} color="#24292E" />,
      },
    ],
  },
]

export const contributors = getContributors()

export function TeamCredits() {
  const maintainerComponents = useMemo(
    () => shuffle(maintainers).map((maintainer) => <Maintainer key={maintainer.name} maintainer={maintainer} />),
    [],
  )

  const contributorComponents = useMemo(
    () =>
      shuffle(contributors).map((contributor) => (
        <TeamCreditsContributor key={contributor.login} contributor={contributor} />
      )),
    [],
  )

  return (
    <Row>
      <Col>
        <Row>
          <Col className="d-flex text-center">
            <TeamCreditsH1>
              {`${PROJECT_NAME} is a part of `}
              <NextstrainLogo width="20px" height="20px" className="mx-1" />
              <LinkExternal href="https://nextstrain.org">
                <span>{'Nextstrain project'}</span>
              </LinkExternal>
              <span>{`. ${PROJECT_NAME} is maintained by: `}</span>
            </TeamCreditsH1>
          </Col>
        </Row>

        <Row>
          <FlexCol>{maintainerComponents}</FlexCol>
        </Row>

        <Row>
          <Col>
            <TeamCreditsH1 className="text-center">{'We are thankful to our contributors: '}</TeamCreditsH1>
            <FlexContributors>{contributorComponents}</FlexContributors>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

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

export const FlexCol = styled(Col)`
  display: flex;
  flex-wrap: wrap;
  text-align: center;
`

export const Flex = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1 0 300px;
  margin: 10px auto;

  @media (min-width: 768px) {
    &:first-child {
      padding-left: 50px;
    }

    &:last-child {
      padding-right: 50px;
    }
  }

  @media (min-width: 992px) {
    &:first-child {
      padding-left: 70px;
    }

    &:last-child {
      padding-right: 70px;
    }
  }

  @media (min-width: 1201px) {
    &:first-child {
      padding-left: 120px;
    }

    &:last-child {
      padding-right: 120px;
    }
  }
`

export const TeamCreditsH1 = styled.h1`
  font-size: 1.33rem;
  margin: 15px auto;
`

export const Ul = styled.ul`
  list-style: none;
  padding: 0;

  margin-top: 0.5rem;
`

export const Li = styled.li`
  display: inline-block;
  margin-left: 5px;
  margin-right: 5px;
`

export const NameText = styled.h2`
  font-size: 1.1rem;
`

export const AffiliationText = styled.small`
  font-size: 0.8rem;
`

export const Portrait = styled.img`
  margin: 0 auto;
  width: 100px;
  border-radius: 100px;
`

export const FlexContributors = styled.section`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-evenly;

  width: 100%;
  max-width: 1500px;
  margin: 10px auto;
`
