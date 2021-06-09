import csv from 'csvtojson';

import withSession from '../../lib/session';
import {
  getTradingSymbolsByOptionPrice,
  saveInstrumentsToFile,
  syncGetKiteInstance
} from '../../lib/utils';

export default withSession(async (req, res) => {
  const user = req.session.get('user');

  if (!user) {
    return res.status(401).send('Unauthorized');
  }

  const kite = syncGetKiteInstance(user);
  const instrumentsFilename = await saveInstrumentsToFile();
  const sourceData = await csv().fromFile(instrumentsFilename);

  const response = await getTradingSymbolsByOptionPrice({
    sourceData,
    nfoSymbol: 'BANKNIFTY',
    price: 200,
    instrumentType: 'CE',
    pivotStrike: 35000,
    user
  });

  res.json({ response });
});
