import Layout from '../components/Layout'
import useUser from '../lib/useUser'
import React from 'react'

const Profile = () => {
  const { user } = useUser({ redirectTo: '/' })

  if (!user?.isLoggedIn) {
    return <Layout>loading...</Layout>
  }

  return (
    <Layout>
      <h1>Your Zerodha profile:</h1>
      <pre>{JSON.stringify(user.session, null, 2)}</pre>
    </Layout>
  )
}

export default Profile
