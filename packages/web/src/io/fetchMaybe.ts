import Axios from 'axios'

export async function fetchMaybe(url?: string): Promise<string | undefined> {
  if (url) {
    const { data } = await Axios.get<string | undefined>(url, { transformResponse: [] })
    return data
  }
  return undefined
}
