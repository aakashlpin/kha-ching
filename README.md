# Kha-ching

Kha-ching helps you easily take the daily 12.30 trades and Prof Rao's Wednesday/Thursday trades.

## Prerequisites:

1. Goto https://kite.trade and sign up for Kite Connect. Create an app and pay Zerodha the ₹2000/month fee.

    - Ignore the `Redirect URL` and `Postback URL` fields for now.
    - Copy `API Key` and `API Secret` fields and keep them handy somewhere.

2. Goto https://redislabs.com/try-free/ and sign up for a "Cloud" redis account. Name your application and you'd land on a section that looks like this. ![redislabs](https://dl.dropbox.com/s/9dn1hduytlvr2n3/image.webp)

    - Copy the `Endpoint` and `Default User Password` fields to construct the following Redis URL - `redis://:{Default User Password}@{Endpoint}`. Keep this handy.

## 1-click Installation

Click the button to deploy the application on DigitalOcean's (DO) apps platform.

- *Ensure you sign up via this button to receive $25 in new signup credits. This will run this application FREE for 5 months @ $5/month.*
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

#### `NEXT_PUBLIC_DEFAULT_SLM_PERCENT`

Default percent of SLM BUY orders to be placed after initial order goes through. CapitalMind recommends setting this value `50`. YMMV. The value here only serves as a default and can be changed before setting up daily trades.

## Next Steps

- DigitalOcean Step 2: After entering all environment variables in setup Step 1, proceed to the next step and select `Bangalore` as region.
- DigitalOcean Step 3: Select `$5/mo` container size from the `Basic size` dropdown. Ensure you see `$5` as the `Monthy App Cost`.
- Click on `Launch Basic App`.
- Give it 5mins, let the application get build.
- Once successfully built, Goto `Settings` of this app, and copy the URL where DigitalOcean hosted this application for you.
- Go back to the [kite app](https://kite.trade/), and now enter Redirect URL as follows: `{url_from_digitalocean}/api/redirect_url_kite`. It should look something like this https://qwe-qwerty-gex5y.ondigitalocean.app/api/redirect_url_kite (only an example - yours will differ). Press `Save`!


## ...and, we're done!

Congratulations. You made it! Now visit your brand new URL created on DigitalOcean and enjoy it free for 5 months, thanks to DigitalOcean! Happy trading!
## Develop locally

In case you'd like to contribute, you can run the development server like so

```bash
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

Kha-ching is [MIT licensed](https://github.com/aakashlpin/kha-ching/blob/master/LICENSE.md).