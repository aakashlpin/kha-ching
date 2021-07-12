import useSWR from 'swr';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';

export default function MonthlySummaryCard() {
    const { data: monthlySummary } = useSWR("/api/monthly_summary", () => {
        return {
            month: "July",
            totalPL: "-5800",
            maxDayLoss: 3700,
            maxDayProfit: 2300
        }
    })

    if (monthlySummary && monthlySummary.month) {
        const summaryLineItems = [
            { label: `total P/L for ${monthlySummary.month}`, value: monthlySummary.totalPL, valueColor: monthlySummary.totalPL >= 0 ? "success" : "error" },
            { label: `max loss in a day`, value: monthlySummary.maxDayLoss, valueColor: "error" },
            { label: `highest profit in a day`, value: monthlySummary.maxDayProfit, valueColor: "success" }
        ]

        return (
            <Card>
                <CardContent>
                    <Typography gutterBottom variant="h6" component="h2">
                        trading summary for the month
                    </Typography>
                    <Box>
                        {
                            summaryLineItems.map(info =>
                                <Box display="flex" justifyContent="space-between" mb="4px" key={info.label}>
                                    <Typography variant="caption" className="primaryLight">
                                        {info.label}
                                    </Typography>
                                    <Typography variant="caption" className={`semiBold ${info.valueColor}`}>
                                        {info.value}
                                    </Typography>
                                </Box>
                            )
                        }
                    </Box>
                </CardContent>
            </Card>
        )
    }

    return null;
}