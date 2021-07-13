import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { isLengthyArray } from '../../lib/uiHelpers';

export default function TradeCompletedInfo({ completedTradesWithPnl }) {

    if (!isLengthyArray(completedTradesWithPnl)) {
        return null;
    }

    const overAllPnlData = completedTradesWithPnl.reduce((accm, item) => {
        return {
            pnl: accm.pnl + item.pnl,
            roi: accm.roi + pnl.roi
        }
    }, {
        pnl: 0, roi: 0
    })

    if (pnlData) {
        return (
            <Box>
                <Box display="flex" justifyContent="space-between" mb="4px">
                    <Typography gutterBottom variant="body2">
                        P/L of the day
                        </Typography>
                    <Typography gutterBottom variant="h4" component="p">
                        {overAllPnlData.pnl}
                    </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb="4px">
                    <Typography gutterBottom variant="body2">
                        ROI
                        </Typography>
                    <Typography gutterBottom variant="h4" component="p">
                        {overAllPnlData.roi}
                    </Typography>
                </Box>
            </Box>
        )
    }

    return null;


}