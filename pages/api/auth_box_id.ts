import axios from 'axios'
import csv from 'csvtojson'
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
    const { data } = await axios(process.env.SUBSCRIPTIONS_CSV_URL!)
    const records = await csv().fromString(data)

    const requestedBoxId = req.body.box
    const userRecord = records.find(record => record.api_key === requestedBoxId)

    if (!userRecord) {
      return res.json({
        type: SUBSCRIPTION_TYPE.NOT_SUBSCRIBER,
        allowed: false,
        message: 'User not found.'
      })
    }

    const { expires, paid_subscriber, xtra_subscriber } = userRecord

    const isPremiumUser = paid_subscriber === 'checked'
    const isClubUser = xtra_subscriber === 'checked'

    return res.json({
      type: SUBSCRIPTION_TYPE.SUBSCRIBER,
      expireOn: expires,
      allowed: dayjs().isSameOrBefore(dayjs(expires, 'YYYY-MM-DD'), 'day'),
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
