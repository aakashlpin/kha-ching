import axios from 'axios'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { NextApiRequest, NextApiResponse } from 'next'
import { SUBSCRIPTION_TYPE } from '../../lib/constants'
dayjs.extend(isSameOrBefore)

const authBoxId = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  try {
    const { data } = await axios(
      `https://api.airtable.com/v0/${
        process.env.AIRTABLE_USERS_BASE_ID
      }/Members?filterByFormula=${encodeURIComponent(
        `{API Key} = '${req.body.box}'`
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
      }
    )

    const { records = [] } = data
    if (!records.length) {
      return res.json({
        type: SUBSCRIPTION_TYPE.NOT_SUBSCRIBER,
        allowed: false,
        message: 'User not found.'
      })
    }

    const [user] = records
    const {
      fields: { Expires }
    } = user

    const isPremiumUser = user.fields['Paid Subscriber']
    const isClubUser = user.fields['Xtra Subscriber']

    return res.json({
      type: SUBSCRIPTION_TYPE.SUBSCRIBER,
      expireOn: Expires,
      allowed: dayjs().isSameOrBefore(dayjs(Expires, 'YYYY-MM-DD'), 'day'),
      isPremiumUser,
      isClubUser
    })
  } catch (e) {
    console.log('[auth_box_id] error', e)
    return res.status(500).json({
      allowed: false,
      message: 'Remote error'
    })
  }
}

export default authBoxId
