import dynamic from 'next/dynamic'

const TreePage = dynamic(() => import('src/components/Tree/TreePage'), { ssr: false })

export default TreePage
