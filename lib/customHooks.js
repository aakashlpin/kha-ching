import axios from 'axios';
import dayjs from 'dayjs';
import Router from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

export function useUser({ redirectTo = false, redirectIfFound = false } = {}) {
  const { data: user, mutate: mutateUser } = useSWR('/api/user');

  useEffect(() => {
    // if no redirect needed, just return (example: already on /dashboard)
    // if user data not yet there (fetch in progress, logged in or not) then don't do anything yet
    if (!redirectTo || !user) return;

    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !user?.isLoggedIn) ||
      // If redirectIfFound is also set, redirect if the user was found
      (redirectIfFound && user?.isLoggedIn)
    ) {
      Router.push(redirectTo);
    }
  }, [user, redirectIfFound, redirectTo]);

  const isClubMember = !!Router?.router?.query?.clubMember;

  return {
    user:
      typeof user === 'object'
        ? { ...user, isClubMember: user.isClubMember || isClubMember }
        : user,
    mutateUser
  };
}

export function usePlans() {
  const { data, mutate: mutatePlans, isLoading, isError } = useSWR('/api/plan');
  const [plans, setPlans] = useState(undefined);

  useEffect(() => {
    if (Array.isArray(data) && data.length) {
      const date = dayjs();
      const day = date.format('D');
      const month = Number(date.format('M')) - 1;
      const year = date.format('YYYY');
      const dayWiseData = data.reduce((accum, config) => {
        const updatedConfig = { ...config };
        if (updatedConfig.runAt) {
          updatedConfig.runAt = dayjs(updatedConfig.runAt)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .format();
        }

        if (updatedConfig.squareOffTime) {
          updatedConfig.squareOffTime = dayjs(updatedConfig.squareOffTime)
            .set('date', day)
            .set('month', month)
            .set('year', year)
            .format();
        }

        if (Array.isArray(accum[updatedConfig._collection])) {
          return {
            ...accum,
            [updatedConfig._collection]: [...accum[updatedConfig._collection], updatedConfig]
          };
        }
        return {
          ...accum,
          [updatedConfig._collection]: [updatedConfig]
        };
      }, {});

      setPlans(dayWiseData);
    }
  }, [data]);

  return {
    plans,
    mutatePlans,
    isLoading,
    isError,
    rawPlans: data
  };
}

/**
 *
 * @param {*} trades // make sure these trades have queue id
 * @returns trades array with pnl info attached
 */
// TODO: @Aakash please have a look at this logic
export function usePnL(tradesInfo) {
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('effect triggered');
    let errCount = 0;
    const updatePnLForAllTrades = () => {
      setIsLoading(true);
      Promise.all(
        tradesInfo
          .filter((t) => t.orderTag)
          .map((trade) => axios.get(`/api/pnl?order_tag=${trade.orderTag}`))
      )
        .then((res) => res.map((res) => res.data))
        .then((res) => {
          let modifiedTrades = [...trades];
          res.map((item, idx) => (modifiedTrades[idx] = { ...modifiedTrades[idx], ...item }));
          setTrades(modifiedTrades);
        })
        .catch((err) => {
          console.log(err);
          errCount++;
          // retry once
          errCount <= 1 ? updatePnLForAllTrades() : null;
        })
        .finally(() => setIsLoading(false));
    };

    updatePnLForAllTrades();
  }, [JSON.stringify(tradesInfo)]); // @Manish/@Aakash TODO: fix this with better approach. Issue: effect getting triggered infinitely even with same input "tradesInfo". Hack: added stringify to pass reference by check

  return { trades, isLoading };
}
