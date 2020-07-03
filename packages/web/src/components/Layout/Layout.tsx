import React, { PropsWithChildren, HTMLProps } from 'react'

import { Container } from 'reactstrap'

import { NavigationBar } from './NavigationBar'
import Footer from './Footer'

export function Layout({ children }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  return (
    <Container fluid className="layout-container">
      <header className="row navbar-container d-print-none">
        <NavigationBar />
      </header>

      <div className="row main-wrapper">
        <main className="container-fluid" role="main">
          {children}
        </main>
      </div>

      <Footer />
    </Container>
  )
}
