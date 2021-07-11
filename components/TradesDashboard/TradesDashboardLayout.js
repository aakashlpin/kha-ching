import useSWR from 'swr';
import dayjs from 'dayjs';
import router from 'next/router';
import { useState, useEffect } from "react";
import { Card, CardContent, Link, Typography } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import { usePlans } from '../../lib/customHooks';
import TradesToday from './TradesToday';
import AvailablePlansToday from './AvailablePlansToday';


export default function TradesDashboardLayout() {
    const { data: tradesDay, isError: tradesLoadingError, isLoading: isLoadingTrades } = useSWR('/api/trades_day');
    const { plans, isLoading: isLoadingPlans, isError: plansLoadingError } = usePlans();
    const [pendingTrades, setPendingTrades] = useState(null);
    const [scheduleableTrades, setScheduleableTrades] = useState(null);

    const dayOfWeekHuman = dayjs().format('dddd');
    const dayOfWeek = dayOfWeekHuman.toLowerCase();

    useEffect(() => {
        if (plans && plans[dayOfWeek] && tradesDay) {
            let pendingTrades = plans[dayOfWeek]?.filter((plan) => !tradesDay?.find((trade) => trade.plan_ref === plan._id));
            if (pendingTrades.length) {
                setScheduleableTrades(pendingTrades.filter((trade) => dayjs().isBefore(dayjs(trade.runAt))))
            }
            setPendingTrades(pendingTrades);
        }
    }, [tradesDay, plans])

    if (isLoadingTrades || isLoadingPlans) return <Skeleton variant="rect" width={"100%"} height={200} />

    if (tradesLoadingError || plansLoadingError) {
        return (
            <Card>
                <CardContent>
                    <p>Something went wrong :( <br /> Please try again after sometime</p>
                </CardContent>
            </Card>
        )
    }


    if (!pendingTrades?.length) {
        return (
            <>
                <Card>
                    <CardContent>
                        {
                            plans && plans[dayOfWeek] ?
                                <Typography variant="body2">
                                    You&apos;ve scheduled all trades as per plan 🎉
                                </Typography>
                                :
                                <Typography variant="body2">
                                    You don&apos;t have a plan for {dayOfWeekHuman} yet. Create one{' '}
                                    <Link href="/plan">here</Link>.
                                <br />
                                Or{' '}
                                    <Link
                                        href="/new-trade"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            router.push('/new-trade');
                                        }}>
                                        Create a new trade for today
                                </Link>
                                </Typography>
                        }
                    </CardContent>
                </Card>
                <TradesToday />
            </>
        )
    }

    return (
        <>
            {
                plans && plans[dayOfWeek] && pendingTrades ? <AvailablePlansToday plan={plans[dayOfWeek]} scheduleableTrades={scheduleableTrades} pendingTrades={pendingTrades} /> : null
            }
            <TradesToday />
        </>
    )
}