/* eslint-disable sonarjs/no-duplicate-string */
import { shuffle } from 'lodash'
import React, { useMemo } from 'react'

import { Col, Row } from 'reactstrap'
import { Maintainer } from 'src/components/Team/TeamCreditsMaintainer'
import { PROJECT_NAME } from 'src/constants'

import { FaGithub, FaTwitter } from 'react-icons/fa'
import { GiEarthAfricaEurope } from 'react-icons/gi'

import { getContributors } from 'src/io/getContributors'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import type { MaintainerInfo } from 'src/components/Team/TeamCreditsMaintainer'
import { TeamCreditsContributor } from 'src/components/Team/TeamCreditsContributor'
import { ReactComponent as NextstrainLogo } from 'src/assets/img/nextstrain_logo.svg'
import { FlexCol, FlexContributors, TeamCreditsH1 } from './TeamCreditsStyles'

const maintainers: MaintainerInfo[] = [
  {
    name: 'Ivan Aksamentov',
    portraitUrl: 'https://avatars3.githubusercontent.com/u/9403403?s=400',
    title: 'Senior Software Engineer',
    affiliation: 'NeherLab, Biozentrum, University of Basel',
    links: [
      {
        title: 'GitHub',
        url: 'https://github.com/ivan-aksamentov',
        alt: 'Link to Github page, with grey Github Octocat logo',
        icon: <FaGithub size={25} color="#24292E" />,
      },
    ],
  },
  {
    name: 'Richard Neher',
    portraitUrl: 'https://avatars3.githubusercontent.com/u/8379168?s=400',
    title: 'Principal Investigator',
    affiliation: 'NeherLab, Biozentrum, University of Basel',
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
        alt: 'Link to Github page, with grey Github Octocat logo',
        icon: <FaGithub size={25} color="#24292E" />,
      },
    ],
  },
  {
    name: 'Cornelius Roemer',
    portraitUrl: 'https://avatars1.githubusercontent.com/u/25161793?v=4',
    title: 'Staff Scientist',
    affiliation: 'NeherLab, Biozentrum, University of Basel',
    links: [
      {
        title: 'GitHub',
        url: 'https://github.com/corneliusroemer',
        alt: 'Link to Github page, with grey Github Octocat logo',
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
    <Row noGutters>
      <Col>
        <Row noGutters>
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

        <Row noGutters>
          <FlexCol>{maintainerComponents}</FlexCol>
        </Row>

        <Row noGutters>
          <Col>
            <TeamCreditsH1 className="text-center">{'We are thankful to our contributors: '}</TeamCreditsH1>
            <FlexContributors>{contributorComponents}</FlexContributors>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
