import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { useEffect, useState } from 'react';
import { usePnL } from '../../lib/customHooks';
import Skeleton from '@material-ui/lab/Skeleton';

// NOTE: How to handle all these cases and what to show to club user? @Aakash
const TRADE_STATUS_DISPLAY_CONFIG = {
    active: {
        title: "active",
        desc: "the bot is at work... finding the best time and options to punch your trades",
        bgColor: "#E9FFF3",
        titleColor: "#32A065"
    },
    waiting: {
        title: "scheduled",
        desc: "sit back, relax.. or do your daily chores! the bot will know when to start",
        bgColor: "#FFF8E3",
        titleColor: "#C9A52E"
    },
    delayed: {
        title: "scheduled",
        desc: "sit back, relax.. or do your daily chores! the bot will know when to start",
        bgColor: "#FFF8E3",
        titleColor: "#C9A52E"
    },
    completed: {
        title: "completed",
        desc: "the trades for the day are completed... check your broker app for exact returns",
        bgColor: "#E7F5FF",
        titleColor: "#0F3262"
    },
    failed: {
        title: "failed",
        desc: "the trade failed to execute.. please make sure you have sufficient funds.",
        bgColor: "#FFE7E6",
        titleColor: "#FF6558"
    },
    unknown: {
        title: "scheduled",
        desc: "sit back, relax.. or do your daily chores! the bot will know when to start",
        bgColor: "#FFF8E3",
        titleColor: "#C9A52E"
    },
}

"active" | "delayed" | "completed" | "failed" | "waiting" | "unknown"

// function TradeCurrentStatus({ trade, handleTradeComplete }) {
//     const { data: jobDetails } = useSWR(`/api/get_job?id=${trade.queue.id}`);

//     useEffect(() => {
//         if (jobDetails.current_state === "completed") {
//             handleTradeComplete(trade)
//         }
//     }, [jobDetails])

//     if (jobDetails) {
//         <Box borderRadius="16px" bgcolor={TRADE_STATUS_DISPLAY_CONFIG.scheduled.bgColor} p="8px" style={{ display: "flex", flexDirection: "column" }}>
//             <Typography gutterBottom variant="caption" style={{ color: TRADE_STATUS_DISPLAY_CONFIG.scheduled.titleColor }}>
//                 {TRADE_STATUS_DISPLAY_CONFIG.scheduled.title}
//             </Typography>
//             <Typography gutterBottom variant="caption">
//                 {TRADE_STATUS_DISPLAY_CONFIG.scheduled.desc}
//             </Typography>
//         </Box>
//     }

//     return null;
// }


// NOTE: status logic based on pnl
// i.e. if each of the trade has pnl data available that means trade is complete
// TODO: @Aakash have a look at this logic to show trade status to club members
export default function TradeStatus({ trades, handleTradeComplete }) {
    if (!trades || trades.length < 1) return null;

    /* NOTE: current assumption is that if trade is found then by default 
    show active to user until and unless all trades return with pnl data */
    const [tradeStatus, setTradeStatus] = useState("active");
    const { trades: tradesWithPnl, isLoading } = usePnL(trades.filter(trade => trade.status !== 'REJECT' && trade.queue?.id))

    useEffect(() => {
        if (!isLoading && Array.isArray(tradesWithPnl) && tradesWithPnl.length) {
            const isCompleted = tradesWithPnl.every(trade => trade.pnl);
            if (isCompleted) {
                setTradeStatus("completed");
                handleTradeComplete(tradesWithPnl);
            }
        }
    }, [tradesWithPnl, isLoading])


    return (
        <>
            <Typography gutterBottom variant="h6" component="h2">
                status
            </Typography>
            {
                isLoading ? <Skeleton variant="rect" width={"100%"} height={60} />
                    :
                    tradeStatus === "completed" ?
                        <Box borderRadius="16px" bgcolor={TRADE_STATUS_DISPLAY_CONFIG.completed.bgColor} p="8px" style={{ display: "flex", flexDirection: "column" }}>
                            <Typography gutterBottom variant="caption" style={{ color: TRADE_STATUS_DISPLAY_CONFIG.completed.titleColor }}>
                                {TRADE_STATUS_DISPLAY_CONFIG.completed.title}
                            </Typography>
                            <Typography gutterBottom variant="caption">
                                {TRADE_STATUS_DISPLAY_CONFIG.completed.desc}
                            </Typography>
                        </Box>
                        :
                        <Box borderRadius="16px" bgcolor={TRADE_STATUS_DISPLAY_CONFIG.active.bgColor} p="8px" style={{ display: "flex", flexDirection: "column" }}>
                            <Typography gutterBottom variant="caption" style={{ color: TRADE_STATUS_DISPLAY_CONFIG.active.titleColor }}>
                                {TRADE_STATUS_DISPLAY_CONFIG.active.title}
                            </Typography>
                            <Typography gutterBottom variant="caption">
                                {TRADE_STATUS_DISPLAY_CONFIG.active.desc}
                            </Typography>
                        </Box>
            }
        </>
    )

    // const jobWasQueued = trade.status !== 'REJECT' && trade.queue?.id;

    // if (jobWasQueued) return <TradeCurrentStatus trade={trade} handleTradeComplete={handleTradeComplete} />;

    // return (
    //     <>
    //         <Typography gutterBottom variant="h6" component="h2">
    //             status
    //         </Typography>
    //         <Box borderRadius="16px" bgcolor={TRADE_STATUS_DISPLAY_CONFIG.failed.bgColor} p="8px" style={{ display: "flex", flexDirection: "column" }}>
    //             <Typography gutterBottom variant="caption" style={{ color: TRADE_STATUS_DISPLAY_CONFIG.failed.titleColor }}>
    //                 {TRADE_STATUS_DISPLAY_CONFIG.scheduled.title}
    //             </Typography>
    //             <Typography gutterBottom variant="caption">
    //                 {typeof trade.status_message === 'string' ? trade.status_message : "the trade was not scheduled.. reach out to us for support"}
    //             </Typography>
    //         </Box>
    //     </>
    // )
}