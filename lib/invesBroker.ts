import * as invesBroker from 'inves-broker'

export default async function getInvesBrokerInstance (
  brokerName: invesBroker.BrokerName
): Promise<invesBroker.Broker> {
  const iConnectParams = {
    name: invesBroker.BrokerName.KITE,
    config: {}
  }
  switch (brokerName) {
    case invesBroker.BrokerName.KITE: {
      iConnectParams.name = invesBroker.BrokerName.KITE
      iConnectParams.config = {
        kiteAPIKey: process.env.KITE_API_KEY,
        kiteAPISecret: process.env.KITE_API_SECRET
      }
      break
    }
    case invesBroker.BrokerName.DHAN: {
      iConnectParams.name = invesBroker.BrokerName.DHAN
      iConnectParams.config = {
        dhanPartnerId: process.env.DHAN_PARTNER_ID,
        dhanPartnerSecret: process.env.DHAN_PARTNER_SECRET
      }
      break
    }
    case invesBroker.BrokerName.PAYTM_MONEY: {
      iConnectParams.name = invesBroker.BrokerName.PAYTM_MONEY
      iConnectParams.config = {
        paytmMoneyAPIKey: process.env.PAYTM_API_KEY,
        paytmMoneyAPISecret: process.env.PAYTM_API_SECRET
      }
      break
    }
    default: {
      throw new Error('not supported broker')
    }
  }
  return invesBroker.IConnect(iConnectParams.name, iConnectParams.config)
}
