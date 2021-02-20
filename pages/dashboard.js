import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import Layout from '../components/Layout';
import TwelveThirtyDetails from '../components/trades/twelveThirtyDetails';
import TwelveThirtyForm from '../components/trades/twelveThirtyForm';
import { INSTRUMENTS } from '../lib/constants';
import useUser from '../lib/useUser';

const Dashboard = () => {
  const [db, setDb] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('khaching/trades')
      ? JSON.parse(localStorage.getItem('khaching/trades'))
      : {}
  );
  const [twelveThirtyState, setTwelveThirtyState] = useState({
    instruments: {
      [INSTRUMENTS.NIFTY]: true,
      [INSTRUMENTS.BANKNIFTY]: true,
      [INSTRUMENTS.FINNIFTY]: false
    },
    lots: 4
  });

  useEffect(() => {
    localStorage.setItem('khaching/trades', JSON.stringify(db));
  }, [db]);

  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    // typeof window !== 'undefined' && window.alert(JSON.stringify(values, 0, 2));
    const jobProps = {
      instruments: Object.keys(twelveThirtyState.instruments).filter(
        (key) => twelveThirtyState.instruments[key]
      ),
      lots: twelveThirtyState.lots
    };

    try {
      const createJobRes = await axios.post('/api/create_job', jobProps);
      console.log(createJobRes.data);
      setDb((db) => ({
        ...db,
        twelveThirty: { validity: dayjs().format('DD/MM/YYYY'), queue: createJobRes.data }
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const onChange = (props) => {
    if (props.instruments) {
      setTwelveThirtyState({
        ...twelveThirtyState,
        instruments: {
          ...twelveThirtyState.instruments,
          ...props.instruments
        }
      });
    } else {
      setTwelveThirtyState({
        ...twelveThirtyState,
        ...props
      });
    }
  };

  return (
    <Layout>
      <h1>{dayjs().format('dddd')}&apos;s trade setup</h1>

      <div>
        <h3>12:30 trade</h3>
        {db.twelveThirty?.queue?.id ? (
          <TwelveThirtyDetails twelveThirtyDb={db.twelveThirty} />
        ) : (
          <TwelveThirtyForm
            twelveThirtyState={twelveThirtyState}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
