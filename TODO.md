- [NOW] Disable auto selected NF and BNF in DOS form
  - UI - throw an error if nothing is selected
- [NOW] make instruments file available in redis on first call
- [NOW] add an option to not take the trade if skew is greater than another custom user entered skew %. So ideal skew can be 10%, but reject skew can be 30%.
- [LATER] Reduce delay for everyone else. Save response in redis cache from signlax repo
- [LATER] calculate skews of ATM+-<step> strikes and take trade in whatever has least skew

/**
https://www.investopedia.com/terms/s/syntheticfuturescontract.asp

A synthetic futures contract uses put and call options with the same strike price and expiration date to simulate a traditional futures contract.
so, basically what I am suggesting is … for your ATM straddle follow this algo
Look at spot. Pick strike closest to it … say S1
Get prices of S1 CE and S1 PE (these will be very liquid)
compute F = S1 + CE - PE
Compute S2 closest to F
Use S2 as the apex of your straddle. If S2 is different from S2, get prices of CE and PE again
Then follow usual procedure

**/


TODO

- Allow interrupts from even when queue is in progress (by checking for db props before punching orders)