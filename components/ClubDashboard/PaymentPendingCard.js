import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import useSWR from 'swr';

export default function PaymentPendingCard() {
  // TODO: @Aakash Integrate with real api @Aakash
  const { data: paymentPendingData } = useSWR('/api/pending_payment', () => {
    return {
      isPaymentDue: true,
      amount: 2900,
      paymentLink: 'something',
      message: 'your invoice for August has been raised please make payment'
    };
  });

  console.log({ paymentPendingData });

  if (paymentPendingData && paymentPendingData.isPaymentDue) {
    return (
      <Card>
        <CardContent>
          <Typography gutterBottom variant="h6" component="h2">
            your signalX subscription
          </Typography>
          <Typography gutterBottom variant="body2" style={{ marginBottom: '16px' }}>
            {paymentPendingData.message}
          </Typography>
          <Typography variant="caption">due amount</Typography>
          <Typography gutterBottom variant="body1">
            INR {paymentPendingData.amount}
          </Typography>
        </CardContent>
        <CardActions>
          <Button variant="contained" color="primary" fullWidth>
            pay now
          </Button>
        </CardActions>
      </Card>
    );
  }

  return null;
}
