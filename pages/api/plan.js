import axios from 'axios'

import { withoutFwdSlash,orclsodaUrl } from '../../lib/utils'

const orclEndpoint=`${orclsodaUrl}/trade_plans`
export default async function plan (req, res) {
  const { dayOfWeek, config } = req.body
  try {
    if (req.method === 'POST') {
      
      //POST for SODA accepts an object and returns an arrray of ids
      let updatedConfig={...config[0],collection: `${dayOfWeek}`} 
      const  {data:{items:[{id}]}}=await axios.post(orclEndpoint,updatedConfig);
      const {data} = await axios.get(`${orclEndpoint}/${id}`)
      const newdata= {...data,id}
      return res.json(newdata)
    }

    if (req.method === 'PUT') {
      await axios[req.method.toLowerCase()](
        `${orclEndpoint}/${config.id}`,
        config
  );
  const {data:getData} = await axios.get(`${orclEndpoint}/${config.id}`)
  const data={...getData,id:config.id}
      return res.json(data)
    }

    if (req.method === 'DELETE') {
      console.log(`${config.id}`);
      const { data }=await axios[req.method.toLowerCase()](
        `${orclEndpoint}/${config.id}`  );
      return res.json(data)
    }
    const {data:{items}}= await axios(
      `${orclEndpoint}`);

const settings=items.map(items=>{
  return ({...items.value,id:items.id})
 });
 return res.json(settings)
  } catch (e) {
    console.log('[api/plan] error', e)
    if (e.isAxiosError) {
      return res.status(e.response.status).json(e.response.data || {})
    }
    return res.status(500).send(e)
  }
}
