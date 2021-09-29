# SignalX

SignalX is a trading app for anyone looking to diversify their funds into systematic and algorithmic intraday trading strategies.

✅ Read everything about SignalX [here](https://signalx.club).

Once you've gone through the Notion doc above, come back here for instructions to setup SignalX!

## Setup Prerequisites:

1. [Sign up on DigitalOcean using this link](https://m.do.co/c/d9db955b428e). You'd receive $100 in new signup credits valid for 2 months. Running this app costs $10/month. So you'd be able to run it FREE for first 2 months.

2) Goto https://kite.trade and sign up for Kite Connect. Create an app and pay Zerodha the ₹2000/month fee.

   - Ignore the `Redirect URL` and `Postback URL` fields for now.
   - Copy `API Key` and `API Secret` fields and keep them handy somewhere.

3) Goto https://redislabs.com/try-free/ and sign up for a "Cloud" redis account.

   - Activate your database and name it `signalx`
   - Copy the `Endpoint` and `User Password` fields to construct the following Redis URL - `redis://:{User Password}@{Endpoint}`. Keep this handy. (remove the curly braces)

## 1-click Installation

_Update - DigitalOcean's app platform is terribly slow. Recommend using render.com for all new installations. All other instructions remain as is._

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

or, deploy the application on DigitalOcean's (DO) apps platform.

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/aakashlpin/kha-ching/tree/master&refcode=d9db955b428e)

## Environment variables

> Environment variables are private setting variables that configures this application to run on your Zerodha account.

#### `KITE_API_KEY`

Paste the Kite API key that you copied from Step #1. Ensure to tick `Encrypt`.

#### `KITE_API_SECRET`

Paste the Kite Secret key that you copied from Step #1. Ensure to tick `Encrypt`.

#### `SECRET_COOKIE_PASSWORD`

This **must** be a 32 digit alphanumeric string. Generate a 32 digit password from here - https://1password.com/password-generator/. Ensure to tick `Encrypt`.

#### `REDIS_URL`

Paste the Redis URL generated from Step #2. Ensure to tick `Encrypt`.

#### `MOCK_ORDERS`

Set it to `true` if you'd simulate orders but not actually place them on Zerodha. Comes in handy if you're looking to develop this application locally. Ignore it otherwise.

#### `NEXT_PUBLIC_DEFAULT_LOTS`

Default lots that you trade on a regular basis. This is only the default initial value in the form and is changeable before taking the trade.

for e.g. If you regularly trade `150` quantity of Nifty Options, you'd enter `2` lots here.

#### `NEXT_PUBLIC_DEFAULT_SKEW_PERCENT`

Default skew that you're okay with when selling straddles. Anywhere between 5-15 is a good value. The value here only serves as a default and can be changed before setting up daily trades.

#### `NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME`

Default square off time of the strategy. The value here only serves as a default and can be changed per strategy during the strategy setup when taking daily trades. Format is 24 hours hh:mm. i.e. enter `15:20` as value if you mean 3.20pm.

#### `NEXT_PUBLIC_APP_URL`

Enter `${APP_URL}` here or leave this value as it is if you're doing a fresh setup as the value will be correctly prefilled for you.

#### `SIGNALX_API_KEY`

Upgrade to [SignalX Premium](https://imjo.in/q6g7cB) to receive your API key. SignalX Premium gives you access to technical indicators required to trade certain strategies.

#### `DATABASE_HOST_URL`

#### `DATABASE_USER_KEY`

#### `DATABASE_API_KEY`

[Follow the upgrade guide here](https://www.notion.so/Release-notes-20-06-2021-84859083abca4f5bb2ed229eea8642f2#7a05ef9737904c148ea299177f1de8f0) to get values for all these 3 variables.

#### `NEXT_PUBLIC_DEFAULT_SLM_PERCENT`

Default percent of SLM BUY orders to be placed after initial order goes through. The value here only serves as a default and can be changed before setting up daily trades.

#### `NEXT_PUBLIC_GIT_HASH`

Leave the value in this field as it-is. This'll inform if there's an app update available in the app UI. If there's an update available, you can hit the "Deploy" button in your DigitalOcean app to install the new build for yourself.

## Next Steps

- DigitalOcean Step 2: After entering all environment variables in setup Step 1, proceed to the next step and select `Bangalore` as region.
- DigitalOcean Step 3: Select `$5/mo` container size from the `Basic size` dropdown. Ensure you see `$5` as the `Monthy App Cost`.
- Click on `Launch Basic App`.
- Give it 5mins, let the application get build.
- Once successfully built, Goto `Settings` of this app, and copy the URL where DigitalOcean hosted this application for you.
- Go back to the [kite app](https://kite.trade/), and now enter Redirect URL as follows: `{url_from_digitalocean}/api/redirect_url_kite`. It should look something like this https://qwe-qwerty-gex5y.ondigitalocean.app/api/redirect_url_kite (only an example - yours will differ). Press `Save`!

## Using the application

- Bookmark the URL, or save it to your homescreen. You'd need it every trading day!
- Zerodha automatically expires the authentication token required to access the APIs at around 7.35am. You're required to login to this app every day after 7.45am to generate a new access token.
- Once logged in, you'd need to setup your trades for the day. **This needs to be done everyday!**. _Trades setup after market hours will fail the next day as the API access token would have expired._

## Data and Security

- All access tokens are saved via a first-party cookie in your browser and are encrypted via the `SECRET_COOKIE_PASSWORD` environment variable. Whatever you do, **DO NOT** share this with anyone!
- Redis is used for scheduling the tasks or running them on spot. **DO NOT** share your redis URL with anyone as it contains your Zerodha profile details alongwith API access tokens.

## Develop locally

In case you'd like to contribute, you can run the development server like so

```bash
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

SignalX is [MIT licensed](https://github.com/aakashlpin/kha-ching/blob/master/LICENSE.md).
