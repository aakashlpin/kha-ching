import { Box, Link, List, ListItem } from '@material-ui/core'
import AppBar from '@material-ui/core/AppBar'
import Tab from '@material-ui/core/Tab'
import Tabs from '@material-ui/core/Tabs'
import Typography from '@material-ui/core/Typography'
import Alert from '@material-ui/lab/Alert'
// import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import SwipeableViews from 'react-swipeable-views'
// import memoizer from 'memoizee'

import Footer from '../components/Footer'
import Layout from '../components/Layout'
import PlanDash from '../components/PlanDash'
import TradesForDay from '../components/TradesForDay'
import {
  STRATEGIES,
  STRATEGIES_DETAILS,
  SUBSCRIBER_TYPE
} from '../lib/constants'
import useUser from '../lib/useUser'
// import { ms } from '../lib/utils'

function TabPanel (props) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      style={{ minHeight: 300 }}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps (index) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`
  }
}

const Dashboard = ({
  isInstallationValid,
  isExpiringSoon,
  expireOn,
  subscriberType
}) => {
  const { user } = useUser({ redirectTo: '/' })
  const router = useRouter()
  const [value, setValue] = useState(() =>
    router.query?.tabId ? Number(router.query.tabId) : 1
  )

  useEffect(() => {
    if (router.query?.tabId && router.query?.tabId !== value) {
      setValue(Number(router.query.tabId))
    }
  }, [router.query])

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>
  }

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

  const handleChangeIndex = index => {
    setValue(index)
  }

  return (
    <Layout>
      <Typography
        component='h1'
        variant='h6'
        style={{ marginBottom: 24, textAlign: 'center' }}
      >
        {dayjs().format('dddd')} / {dayjs().format('DD MMM YYYY')}
      </Typography>

      {!isInstallationValid ? (
        <Alert variant='outlined' severity='error' style={{ marginBottom: 24 }}>
          [IMP] Your SignalX{' '}
          {subscriberType === SUBSCRIBER_TYPE.PREMIUM ? 'Premium' : 'Club'}{' '}
          subscription expired on {dayjs(expireOn).format('DD MMM')}. Refer to
          renewal email or{' '}
          <Link
            href={
              subscriberType === SUBSCRIBER_TYPE.PREMIUM
                ? 'https://imjo.in/q6g7cB'
                : 'https://imjo.in/SZKjZ9'
            }
          >
            renew here
          </Link>{' '}
          to resume services tomorrow onwards.
        </Alert>
      ) : null}

      {isInstallationValid && isExpiringSoon ? (
        <Alert
          variant='outlined'
          severity='warning'
          style={{ marginBottom: 24 }}
        >
          [IMP] Your SignalX{' '}
          {subscriberType === SUBSCRIBER_TYPE.PREMIUM ? 'Premium' : 'Club'}{' '}
          subscription expires on {dayjs(expireOn).format('DD MMM')}.{' '}
          <Link
            href={
              subscriberType === SUBSCRIBER_TYPE.PREMIUM
                ? 'https://imjo.in/q6g7cB'
                : 'https://imjo.in/SZKjZ9'
            }
          >
            Renew early
          </Link>{' '}
          for uninterrupted services.
        </Alert>
      ) : null}

      <AppBar position='static' color='default'>
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor='primary'
          textColor='primary'
          variant='fullWidth'
          aria-label='dashboard options'
        >
          <Tab label='Today' {...a11yProps(0)} />
          <Tab label='New Trade' {...a11yProps(1)} />
          <Tab label='Plan' {...a11yProps(2)} />
        </Tabs>
      </AppBar>
      <SwipeableViews axis='x' index={value} onChangeIndex={handleChangeIndex}>
        <TabPanel value={value} index={0}>
          <TradesForDay />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <List>
            <ListItem>
              <Link href='/strat/straddle'>
                {STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}
              </Link>
            </ListItem>
            <ListItem>
              <Link href='/strat/strangle'>
                {STRATEGIES_DETAILS[STRATEGIES.ATM_STRANGLE].heading}
              </Link>
            </ListItem>
            <ListItem>
              <Link href='/strat/ots'>
                {STRATEGIES_DETAILS[STRATEGIES.OVERNIGHT_TREND_STATEGY].heading}
              </Link>
            </ListItem>
            <ListItem>
              <Link href='/strat/dos'>
                {
                  STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING]
                    .heading
                }
              </Link>
            </ListItem>
            {/* <ListItem>
          <Link href="/strat/obs">
            {STRATEGIES_DETAILS[STRATEGIES.OPTION_BUYING_STRATEGY].heading}
          </Link>
        </ListItem> */}
          </List>
        </TabPanel>
        <TabPanel value={value} index={2}>
          <PlanDash />
        </TabPanel>
      </SwipeableViews>

      <Footer />
    </Layout>
  )
}

// const _checkSubscriptionStatus = async apiKey => {
//   console.log('fetching subscription status...')
//   const endpoint =
//     process.env.SUBSCRIPTION_URL ?? `https://auth.signalx.club/api/auth_box_id`
//   const { data } = await axios.post(endpoint, {
//     box: apiKey
//   })
//   console.log(data)
//   return data
// }

// const checkSubscriptionStatus = memoizer(_checkSubscriptionStatus, {
//   maxAge: ms(9 * 60 * 60),
//   promise: true
// })

export async function getServerSideProps (context) {
  return {
    props: {
      isInstallationValid: true
    }
  }

  // const SIGNALX_API_KEY = process.env.SIGNALX_API_KEY
  // if (!(SIGNALX_API_KEY && SIGNALX_API_KEY.length === 16)) {
  //   return {
  //     props: {
  //       isInstallationValid: true
  //     }
  //   }
  // }

  // try {
  //   const subscriptionData = await checkSubscriptionStatus(SIGNALX_API_KEY)
  //   const { isPremiumUser, isClubUser, allowed, expireOn } = subscriptionData

  //   if (!isClubUser && !isPremiumUser) {
  //     // open source user
  //     return {
  //       props: {
  //         isInstallationValid: true
  //       }
  //     }
  //   }

  //   // either club or premium
  //   if (!allowed) {
  //     // refetch immediately if subscription has expired
  //     checkSubscriptionStatus.delete(SIGNALX_API_KEY, true)

  //     return {
  //       props: {
  //         isInstallationValid: false,
  //         expireOn,
  //         subscriberType: isClubUser
  //           ? SUBSCRIBER_TYPE.CLUB
  //           : SUBSCRIBER_TYPE.PREMIUM
  //       }
  //     }
  //   }

  //   // valid subscription
  //   const ttl = dayjs(expireOn).diff(dayjs(), 'days')
  //   if (ttl <= 3) {
  //     // but expiring soon
  //     return {
  //       props: {
  //         isInstallationValid: true,
  //         isExpiringSoon: true,
  //         expireOn,
  //         subscriberType: isClubUser
  //           ? SUBSCRIBER_TYPE.CLUB
  //           : SUBSCRIBER_TYPE.PREMIUM
  //       }
  //     }
  //   }

  //   return {
  //     props: {
  //       isInstallationValid: true
  //     }
  //   }
  // } catch (e) {
  //   console.log(e)
  //   // in case of any issues, give the benefit to the user
  //   return {
  //     props: {
  //       isInstallationValid: true
  //     }
  //   }
  // }
}

export default Dashboard
