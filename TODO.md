Status 4.45am

- have wrapped up all major pieces for the BNF directional option selling


## TODOs
  1. ✅ Test if the exit strat works - haven't been able to check if we're able to get ST value of option that's sold
  2. ✅ Code the logic that'd place another order as per martingale
  3. ✅ deploy signalx.trade on DO
  4. ✅ build the khaching connection to signalx.trade
  6. ✅ Enable form fields for customization
  5. ✅ DO NOT take another trade if it's beyond 2pm
  7. ✅ don't send modify order if difference is small ie 3-5% option price.