import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

import Details from './TradeSetupDetails';
import Form from './TradeSetupForm';

const TradeSetup = ({
  heading,
  strategy,
  LOCALSTORAGE_KEY,
  enabledInstruments,
  detailsProps,
  defaultRunAt
}) => {
  const isStillScheduleable = dayjs().isBefore(dayjs(defaultRunAt));

  const [db, setDb] = useState(() => {
    const existingDb =
      typeof window !== 'undefined' && localStorage.getItem(LOCALSTORAGE_KEY)
        ? JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY))
        : null;

    if (!existingDb) {
      return {};
    }

    const validity = existingDb?.validity;
    if (!validity) {
      return {};
    }
    // if seeing it next day
    if (dayjs().isAfter(dayjs(validity), 'date')) {
      // clean up trade from UI
      return {};
    }

    return existingDb;
  });

  const [state, setState] = useState({
    instruments: enabledInstruments.reduce(
      (accum, item) => ({
        ...accum,
        [item]: true
      }),
      {}
    ),
    lots: process.env.NEXT_PUBLIC_DEFAULT_LOTS,
    maxSkewPercent: process.env.NEXT_PUBLIC_DEFAULT_SKEW_PERCENT,
    slmPercent: process.env.NEXT_PUBLIC_DEFAULT_SLM_PERCENT
  });

  useEffect(() => {
    async function fn() {
      try {
        if (!Object.isExtensible(db)) return;
        const prevDb = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY));
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(db));
        if (prevDb.queue?.id && !db.queue?.id) {
          try {
            await axios.post('/api/delete_job', {
              id: prevDb.queue?.id
            });
          } catch (e) {
            console.log('error deleting job', e);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }

    fn();
  }, [db]);

  const onSubmit = async ({ runAt } = {}) => {
    const isProduction = !location.host.includes('localhost:');
    const willRunInstantly = !runAt;

    if (willRunInstantly) {
      const yes = await window.confirm('This will schedule this trade immediately. Are you sure?');
      if (!yes) {
        return;
      }
    }
    const jobProps = {
      instruments: Object.keys(state.instruments).filter((key) => state.instruments[key]),
      lots: state.lots,
      maxSkewPercent: state.maxSkewPercent,
      slmPercent: state.slmPercent,
      defaultRunAt: willRunInstantly ? dayjs() : defaultRunAt,
      expireIfUnsuccessfulInMins: !isProduction ? 1 : 30,
      strategy
    };

    try {
      const createJobRes = await axios.post('/api/create_job', jobProps);
      setDb({
        validity: dayjs().format(),
        queue: createJobRes.data
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onChange = (props) => {
    if (props.instruments) {
      setState({
        ...state,
        instruments: {
          ...state.instruments,
          ...props.instruments
        }
      });
    } else {
      setState({
        ...state,
        ...props
      });
    }
  };

  const onDeleteJob = () => {
    setDb({});
  };

  const humanTime = dayjs(defaultRunAt).format('h.mma');

  return (
    <div style={{ marginBottom: '60px' }}>
      <h3>{heading}</h3>
      {db.queue?.id ? (
        <Details db={db} onDeleteJob={onDeleteJob} {...detailsProps} />
      ) : (
        <Form
          state={state}
          onChange={onChange}
          onSubmit={onSubmit}
          enabledInstruments={enabledInstruments}
          defaultRunAt={defaultRunAt}
          helperText={`💡 If scheduled, you can safely delete the job until selected time on the next step!`}
        />
      )}
    </div>
  );
};

export default TradeSetup;
