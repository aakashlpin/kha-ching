### List of tables in OracleDB

1. Trades: Stores executed transactions
2. ACCESS_TOKENS: Stores tokens for each day so that it's not requeried
3. dailyplan: This is a collection in SODA. This can be queried using `SELECT * FROM USER_SODA_COLLECTIONS`
Stores the daily executed plans. Can be queried using SODA: ords/signalx/soda/latest/dailyplan. Sysdate -2 trades would be deleted at the EOD. SQL Query:
`select json_query(json_document,'$' PRETTY),id
from dailyplan`
CREATE_TRADES procedure deletes the older trades
4. trade_plans : SODA_COLLECTION Stores the plans for each day.Can be queried using REST `ords/signalx/soda/latest/trade_plans/`
Add the filter condition to query based on day `?q={"collection" : { "$eq" : "tuesday" } }`
5. dailyProfits: View showing the profits for each strategy per day