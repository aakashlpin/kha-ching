/* eslint-disable jsx-a11y/accessible-emoji */
import { Box, Button, Divider, Link, List, ListItem } from '@material-ui/core'
import AppBar from '@material-ui/core/AppBar'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import Tab from '@material-ui/core/Tab'
import Tabs from '@material-ui/core/Tabs'
import Typography from '@material-ui/core/Typography'
import Alert from '@material-ui/lab/Alert'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import SwipeableViews from 'react-swipeable-views'

import Footer from '../components/Footer'
import Layout from '../components/Layout'
import PlanDash from '../components/PlanDash'
import TradesForDay from '../components/TradesForDay'
import { STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants'
import useUser from '../lib/useUser'

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

const Dashboard = ({ hasDbSetup }) => {
  const { user } = useUser({ redirectTo: '/' })
  const router = useRouter()
  const [value, setValue] = useState(() => (router.query?.tabId ? Number(router.query.tabId) : 1))

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

  const handleChangeIndex = (index) => {
    setValue(index)
  }

  return (
    <Layout>
      <Typography component='h1' variant='h6' style={{ marginBottom: 24, textAlign: 'center' }}>
        {dayjs().format('dddd')} / {dayjs().format('DD MMM YYYY')}
      </Typography>

      {!hasDbSetup
        ? (
          <Alert variant='outlined' severity='error' style={{ marginBottom: 24 }}>
            [IMP] Your app no longer works. Follow upgrade instruction{' '}
            <Link href='https://www.notion.so/Release-notes-20-06-2021-84859083abca4f5bb2ed229eea8642f2'>
              here
            </Link>
            .
          </Alert>)
        : null}

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
              <Link href='/strat/dos'>
                {STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING].heading}
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

export async function getStaticProps (context) {
  const DATABASE_HOST_URL = process.env.DATABASE_HOST_URL
  const DATABASE_USER_KEY = process.env.DATABASE_USER_KEY
  const DATABASE_API_KEY = process.env.DATABASE_API_KEY

  const hasDbSetup = !!(DATABASE_HOST_URL && DATABASE_USER_KEY && DATABASE_API_KEY)
  return {
    props: {
      hasDbSetup
    } // will be passed to the page component as props
  }
}

export default Dashboard
