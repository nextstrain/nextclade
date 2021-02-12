/* eslint-disable sonarjs/no-identical-functions */
import React from 'react'

import { Col, Row } from 'reactstrap'
import { PROJECT_NAME } from 'src/constants'
import styled from 'styled-components'
import { FaGithub, FaTwitter } from 'react-icons/fa'
import { GiEarthAfricaEurope } from 'react-icons/gi'

import { LinkExternal } from 'src/components/Link/LinkExternal'
import { getContributors } from 'src/io/getContributors'

import { TeamCreditsContributor } from './TeamCreditsContributor'

const contributors = getContributors()

const Flex = styled.section`
  display: flex;
  flex-direction: column;
  width: 300px;
  margin: 10px auto;
`

const TeamCreditsH1 = styled.h1`
  font-size: 1.33rem;
  margin: 15px auto;
`

const Ul = styled.ul`
  list-style: none;
  padding: 0;

  margin-top: 0.5rem;
`

const Li = styled.li`
  display: inline-block;
  margin-left: 5px;
  margin-right: 5px;
`

const NameText = styled.h2`
  font-size: 1.1rem;
`

const AffiliationText = styled.small`
  font-size: 0.8rem;
`

const Portrait = styled.img`
  margin: 0 auto;
  width: 100px;
  border-radius: 100px;
`

const FlexContributors = styled.section`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-evenly;

  width: 100%;
  max-width: 1500px;
  margin: 10px auto;
`

const mainLinksLeft = [
  {
    title: 'GitHub',
    url: 'https://github.com/ivan-aksamentov',
    alt: 'Link to Github page, with grey Github Octocat logo',
    icon: <FaGithub size={25} color="#24292E" />,
  },
]

const mainLinksRight = [
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
]

export function TeamCredits() {
  return (
    <Row noGutters>
      <Col>
        <Row noGutters>
          <Col className="d-flex text-center">
            <TeamCreditsH1>{`${PROJECT_NAME} is developed by`}</TeamCreditsH1>
          </Col>
        </Row>

        <Row noGutters>
          <Col className="d-flex text-center">
            <Flex>
              <Portrait src="https://avatars3.githubusercontent.com/u/9403403?s=400" />
              <NameText>{'Ivan Aksamentov'}</NameText>
              <AffiliationText>{'Senior Software Engineer'}</AffiliationText>
              <AffiliationText>{'NeherLab, Biozentrum, University of Basel'}</AffiliationText>

              <Ul>
                {mainLinksLeft.map(({ title, url, alt, icon }) => (
                  <Li key={title}>
                    <LinkExternal title={title} href={url} alt={alt}>
                      {icon}
                    </LinkExternal>
                  </Li>
                ))}
              </Ul>
            </Flex>

            <Flex>
              <Portrait src="https://avatars3.githubusercontent.com/u/8379168?s=400" />
              <NameText>{'Richard Neher'}</NameText>
              <AffiliationText>{'Principal Investigator'}</AffiliationText>
              <AffiliationText>{'NeherLab, Biozentrum, University of Basel'}</AffiliationText>

              <Ul>
                {mainLinksRight.map(({ title, url, alt, icon }) => (
                  <Li key={title}>
                    <LinkExternal title={title} href={url} alt={alt}>
                      {icon}
                    </LinkExternal>
                  </Li>
                ))}
              </Ul>
            </Flex>
          </Col>
        </Row>

        <Row noGutters>
          <Col>
            <FlexContributors>
              {contributors.map((contributor) => (
                <TeamCreditsContributor key={contributor.login} contributor={contributor} />
              ))}
            </FlexContributors>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}
