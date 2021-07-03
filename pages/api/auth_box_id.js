import axios from 'axios';
import dayjs from 'dayjs';
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(isSameOrBefore);

export default async (req, res) => {
  try {
    const { data } = await axios(
      `https://api.airtable.com/v0/${
        process.env.AIRTABLE_USERS_BASE_ID
      }/Members?filterByFormula=${encodeURIComponent(`{API Key} = '${req.body.box}'`)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
      }
    );

    const { records = [] } = data;
    if (!records.length) {
      return res.json({
        allowed: false,
        message: 'User not found.'
      });
    }

    const [user] = records;
    const {
      fields: { Expires }
    } = user;

    return res.json({
      expireOn: Expires,
      allowed: dayjs().isSameOrBefore(dayjs(Expires, 'YYYY-MM-DD'), 'day')
    });
  } catch (e) {
    console.log('[auth_box_id] error', e);
    return res.json({
      allowed: false,
      message: 'Remote error'
    });
  }
};
