export const INSTRUMENTS = {
  NIFTY: 'nf',
  BANKNIFTY: 'bnf',
  FINNIFTY: 'finnf'
};

export const INSTRUMENT_DETAILS = {
  [INSTRUMENTS.NIFTY]: {
    lotSize: 75,
    name: 'NIFTY 50'
  },
  [INSTRUMENTS.BANKNIFTY]: {
    lotSize: 25,
    name: 'BANKNIFTY'
  },
  [INSTRUMENTS.FINNIFTY]: {
    lotSize: 40,
    name: 'FINNIFTY'
  }
};
