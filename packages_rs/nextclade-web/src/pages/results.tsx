import dynamic from 'next/dynamic'

const ResultsPage = dynamic(() => import('src/components/Results/ResultsPage'), { ssr: false })

export default ResultsPage
