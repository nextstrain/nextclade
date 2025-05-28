import React from 'react'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'

export default function LoadingPage() {
  return <Layout noProviders>{LOADING}</Layout>
}
