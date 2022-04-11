import React from 'react'

import { LayoutMain } from 'src/components/Layout/LayoutMain'

import { MainInputForm } from 'src/components/Main/MainInputForm'
import { MainSectionInfo } from 'src/components/Main/MainSectionInfo'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { TeamCredits } from 'src/components/Team/TeamCredits'

export function MainPage() {
  return (
    <LayoutMain>
      <MainSectionTitle />
      <MainInputForm />
      <MainSectionInfo />
      <TeamCredits />
    </LayoutMain>
  )
}
