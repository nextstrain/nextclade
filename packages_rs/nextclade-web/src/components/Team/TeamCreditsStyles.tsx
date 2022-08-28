import { Col } from 'reactstrap'
import styled from 'styled-components'

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
  border-radius: ${(props) => props.width}px;
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
