import axios from 'axios'

import { withoutFwdSlash } from '../../lib/utils'

const { DATABASE_HOST_URL, DATABASE_USER_KEY, DATABASE_API_KEY } = process.env

export default async function plan (req, res) {
  const { dayOfWeek, config } = req.body

  const baseUrl = `${withoutFwdSlash(DATABASE_HOST_URL)}/set_${DATABASE_USER_KEY}`
  console.log({ baseUrl })
  try {
    if (req.method === 'POST') {
      const { data } = await axios[req.method.toLowerCase()](`${baseUrl}/${dayOfWeek}`, config, {
        headers: {
          'x-api-key': DATABASE_API_KEY
        }
      })
      return res.json(data)
    }

    if (req.method === 'PUT') {
      const { data } = await axios[req.method.toLowerCase()](`${baseUrl}/${config._id}`, config, {
        headers: {
          'x-api-key': DATABASE_API_KEY
        }
      })
      return res.json(data)
    }

    if (req.method === 'DELETE') {
      const { data } = await axios[req.method.toLowerCase()](`${baseUrl}/${config._id}`, {
        headers: {
          'x-api-key': DATABASE_API_KEY
        }
      })
      return res.json(data)
    }

    const { data: settings } = await axios(`${baseUrl}?limit=100`)
    return res.json(settings)
  } catch (e) {
    console.log('[api/plan] error', e)
    if (e.isAxiosError) {
      return res.status(e.response.status).json(e.response.data || {})
    }
    return res.status(500).send(e)
  }
}
