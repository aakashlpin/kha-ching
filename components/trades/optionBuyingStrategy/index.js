import 'react-toastify/dist/ReactToastify.css';

import axios from 'axios';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import { EXIT_STRATEGIES, STRATEGIES, STRATEGIES_DETAILS } from '../../../lib/constants';
import Details from './TradeSetupDetails';
import Form from './TradeSetupForm';
const TESTING = true;

/**
 *
 * lets show the details popup per instrument
 * set the actionable as "remove job" to clean up memory
 *
 * on the "days" section, show all jobs of the day only
 * and automatically clean up any jobs that belong to days before today
 */

function getDefaultSquareOffTime() {
  try {
    const [hours, minutes] = (process.env.NEXT_PUBLIC_DEFAULT_SQUARE_OFF_TIME || '15:20').split(
      ':'
    );
    return dayjs().set('hours', hours).set('minutes', minutes).format();
  } catch (e) {
    return null;
  }
}

const notify = (message) =>
  toast.error(message, {
    position: 'bottom-center',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined
  });

const OptionBuyingStrategy = ({
  LOCALSTORAGE_KEY,
  strategy = STRATEGIES.OPTION_BUYING_STRATEGY,
  enabledInstruments,
  exitStrategies = [EXIT_STRATEGIES.OBS_TRAIL_SL]
}) => {
  const { heading } = STRATEGIES_DETAILS[strategy];
  const [db, setDb] = useState(() => {
    const existingDb =
      typeof window !== 'undefined' && localStorage.getItem(LOCALSTORAGE_KEY)
        ? JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY))
        : null;

    if (!existingDb) {
      return {};
    }

    return existingDb;
  });

  function getDefaultState() {
    return {
      instruments: enabledInstruments.reduce(
        (accum, item) => ({
          ...accum,
          [item]: true
        }),
        {}
      ),
      lots: 2,
      runNow: false,
      exitStrategy: exitStrategies[0]
      // isAutoSquareOffEnabled: true,
      // squareOffTime: getDefaultSquareOffTime()
    };
  }

  const [state, setState] = useState(getDefaultState());

  useEffect(() => {
    async function fn() {
      try {
        if (!Object.isExtensible(db)) return;
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(db));
      } catch (e) {
        console.log(e);
      }
    }

    fn();
  }, [db]);

  const onSubmit = async (e) => {
    e && e.preventDefault();

    const { lots, exitStrategy, instruments } = state;

    if (TESTING) {
      const jobProps = {
        instruments: Object.keys(instruments).filter((key) => state.instruments[key]),
        lots: Number(lots),
        runNow: true,
        strategy,
        exitStrategy
      };
      await axios.post('/api/create_job', jobProps);
      return;
    }

    const allowedTimes = STRATEGIES_DETAILS[STRATEGIES.OPTION_BUYING_STRATEGY].schedule;

    /**
     * 9.29am or before
     * both trades can be taken
     *
     * 11am-12.59pm
     * only 1pm trade can be taken
     *
     * 1pm or after
     * no trade can be taken
     */

    const runnableSlots = allowedTimes.map(({ afterTime }) => dayjs().isBefore(afterTime()));

    let message;
    let isScheduleable = true;
    if (runnableSlots.every((val) => val)) {
      message = 'This strategy will take trades between 9.30-11am and between 1-3pm. Okay?';
    } else if (runnableSlots[1]) {
      message = `You've missed the 9.30-11am slot. Trade will now be attempted between 1-3pm. Okay?`;
    } else {
      message = `Sorry! No further trades can be taken today.`;
      isScheduleable = false;
    }

    if (!isScheduleable) {
      return notify(message);
    }

    const yes = await window.confirm(message);

    if (!yes) {
      return notify(`No trade taken as you didn't confirm!`);
    }

    const jobs = runnableSlots
      .map((runnable, idx) => {
        if (!runnable) {
          return null;
        }
        const jobProps = {
          instruments: Object.keys(state.instruments).filter((key) => state.instruments[key]),
          lots: Number(lots),
          runNow: false,
          runAt: allowedTimes[idx].afterTime().add(1, 'second'),
          strategy,
          exitStrategy
        };
        return axios.post('/api/create_job', jobProps);
      })
      .filter((i) => i);

    try {
      const responses = await Promise.all(jobs);
      const data = responses.reduce((accum, res) => [...accum, ...res.data], []);
      setDb((exDb) => ({
        queue: Array.isArray(exDb.queue) ? [...data, ...exDb.queue] : data
      }));
      setState(getDefaultState());

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {
      if (e.response) {
        notify(e.response.data);
      }
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

  const onDeleteJob = async ({ jobId } = {}) => {
    if (!jobId) {
      throw new Error('onDeleteJob called without jobId');
    }

    const queueWithoutJobId = db.queue.filter((job) => job.id !== jobId);
    setDb((exDb) => ({
      ...exDb,
      queue: queueWithoutJobId
    }));

    try {
      await axios.post('/api/delete_job', {
        id: jobId
      });
    } catch (e) {
      console.log('error deleting job', e);
    }
  };

  useEffect(() => {
    if (state.runNow) {
      onSubmit();
    }
  }, [state.runNow]);

  return (
    <div style={{ marginBottom: '60px' }}>
      <h3>{heading}</h3>
      {db.queue?.length
        ? db.queue.map((job) => (
            <Details key={job.name} job={job} strategy={strategy} onDeleteJob={onDeleteJob} />
          ))
        : null}
      <Form
        state={state}
        onChange={onChange}
        onSubmit={onSubmit}
        enabledInstruments={enabledInstruments}
        exitStrategies={exitStrategies}
      />
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default OptionBuyingStrategy;
