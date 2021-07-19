import useSWR from 'swr';

import Layout from '../components/Layout';
import BrokerOrders from '../components/lib/brokerOrders';
import useUser from '../lib/useUser';

const Profile = () => {
  const { user } = useUser({ redirectTo: '/' });
  const { data, error } = useSWR('/api/reconcile');

  if (!user || user.isLoggedIn === false || !data?.orders?.length) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      <BrokerOrders {...data} />
    </Layout>
  );
};

export default Profile;
