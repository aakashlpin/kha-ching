import useSWR from 'swr';
import dayjs from 'dayjs';
import Box from '@material-ui/core/Box';
import Skeleton from '@material-ui/lab/Skeleton';
import MonthlySummaryCard from "./MonthlySummaryCard";
import PaymentPendingCard from "./PaymentPendingCard";
import PlanTradeCard from "./PlanTradeCard";
import { usePlans } from '../../lib/customHooks';


export default function ClubDashboardLayout() {
    const { data: tradesDay, isError: tradesLoadingError, isLoading: isLoadingTrades } = useSWR('/api/trades_day');
    const { plans, isLoading: isLoadingPlans, isError: plansLoadingError } = usePlans();
    const dayOfWeekHuman = dayjs().format('dddd');
    const dayOfWeek = dayOfWeekHuman.toLowerCase();


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

    return (
        <>
            <PlanTradeCard tradesDay={tradesDay} todaysPlans={plans && plans[dayOfWeek]} />
            <Box mb="16px" />
            <PaymentPendingCard />
            <Box mb="16px" />
            <MonthlySummaryCard />
        </>
    )
}