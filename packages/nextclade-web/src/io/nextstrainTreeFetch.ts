import Axios from 'axios'

const URL_NCOV_SMALL_JSON = 'https://nextstrain-neherlab.s3.amazonaws.com/ncov_small.json' as const

export async function nextstrainTreeFetch() {
  const res = await Axios.get(URL_NCOV_SMALL_JSON)
  return res.data as Promise<Record<string, unknown>>
}
