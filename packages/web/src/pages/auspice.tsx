import dynamic from 'next/dynamic'

const AuspicePage = dynamic(() => import('src/components/Auspice/AuspicePage'), { ssr: false })

export default AuspicePage
