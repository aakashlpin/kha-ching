# Kha-ching

Kha-ching helps you easily take the daily 12.30 trades and Prof Rao's Wednesday/Thursday trades.

## Prerequisites:

1. [Sign up on DigitalOcean using this link](https://m.do.co/c/d9db955b428e). You'd receive $100 in new signup credits valid for 2 months. Running this app costs $5/month. So you'd be able to run it FREE for first 2 months.


2. Goto https://kite.trade and sign up for Kite Connect. Create an app and pay Zerodha the ₹2000/month fee.

    - Ignore the `Redirect URL` and `Postback URL` fields for now.
    - Copy `API Key` and `API Secret` fields and keep them handy somewhere.

3. Goto https://redislabs.com/try-free/ and sign up for a "Cloud" redis account. Name your application and you'd land on a section that looks like this. ![redislabs](https://i.imgur.com/k9sZScs.jpg)

    - Copy the `Endpoint` and `Default User Password` fields to construct the following Redis URL - `redis://:{Default User Password}@{Endpoint}`. Keep this handy.

## 1-click Installation

Now, click the button to deploy the application on DigitalOcean's (DO) apps platform.

- You'd be prompted to enter environment variables. Refer below for details 👇.

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

Default skew that you're okay with when selling straddles. CapitalMind recommends setting this value at `10`. YMMV. The value here only serves as a default and can be changed before setting up daily trades.

#### `NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME`

Default square off time of the strategy. The value here only serves as a default and can be changed per strategy during the strategy setup when taking daily trades.

#### `NEXT_PUBLIC_DEFAULT_SLM_PERCENT`

Default percent of SLM BUY orders to be placed after initial order goes through. CapitalMind recommends setting this value `50`. YMMV. The value here only serves as a default and can be changed before setting up daily trades.

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
- Zerodha automatically expires the authentication token required to access their APIs at around 7.35am. So you'd need to login on this app every day after 7.45am for the system to save your new access token.
- Once logged in, you'd need to setup your trades for the day. **This needs to be done everyday!**. *Trades setup after market hours will fail the next day as the API access token would have expired.*

### 12.30 trades

These can be scheduled to run at 12.30pm or run instantly anytime after 12.30pm. System doesn't allow running them before 12.30pm as of now.
### Wed-Thurs trades

The panel to setup this trade will show up only on Wednesday and Thursday. You can schedule them anytime before 9.20am or run instantly anytime after 9.20am.

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

Kha-ching is [MIT licensed](https://github.com/aakashlpin/kha-ching/blob/master/LICENSE.md).
