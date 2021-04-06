### Exit strategies:
  1. SLM buy orders
    1.1. Buy the leg that hits the SL (configurable quantity 2x)
  2. Combined legs premium based SL
  3. Profit = if one leg was to hit SL and other was brought to cost


Do we need a interrupt to stop the exit strategy?

Want to build:

- See max loss as per strategy before placing the order
- Auto square off (at 3.15)

## How would auto square off work?
- Create a redis job when the initial task is completed. This task should contain { tradingSymbol, quantity, product, etc }
- 2 tiered work:
  - ensure open positions contain those tradingSymbols. Place counter orders to close positions
  - goto pending orders and modify or delete orders depending on quantity

Open TODO:
  - remove the logic of adding to next queue on completion event
  - schedule the auto square off queue and exit strat queue from within the core strat