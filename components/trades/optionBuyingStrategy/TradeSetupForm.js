import {
  Button,
  Checkbox,
  CssBaseline,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  Link,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography
} from '@material-ui/core';
import Box from '@material-ui/core/Box';
import useSWR from 'swr';

import { INSTRUMENT_DETAILS } from '../../../lib/constants';

const TradeSetupForm = ({ enabledInstruments, state, onChange, onSubmit }) => {
  const { error: fyersProfileError } = useSWR(`/api/fyers_profile`);

  return (
    <form noValidate>
      <Paper style={{ padding: 16 }}>
        {fyersProfileError ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="h6" component="span">
                <Link href="/api/broker_auth/fyers">&lt;Login with Fyers to trade this&gt;</Link>
              </Typography>
            </div>
            <Divider />
          </>
        ) : null}
        <h3>Setup new trade</h3>
        <Grid container alignItems="flex-start" spacing={2}>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Instruments</FormLabel>
              <FormGroup row>
                {enabledInstruments.map((instrument) => (
                  <FormControlLabel
                    key={instrument}
                    label={INSTRUMENT_DETAILS[instrument].displayName}
                    control={
                      <Checkbox
                        name="instruments"
                        checked={state.instruments[instrument]}
                        onChange={() => {
                          onChange({
                            instruments: {
                              [instrument]: !state.instruments[instrument]
                            }
                          });
                        }}
                      />
                    }
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="lots"
              value={state.lots}
              onChange={(e) => onChange({ lots: e.target.value || '' })}
              label="Lots"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              disabled={fyersProfileError}
              variant="contained"
              color="primary"
              type="button"
              onClick={() => onSubmit()}>
              Let&apos;s go!
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography>
              <Box fontStyle="italic" fontSize={14}>
                <p>Note —</p>
                <ol>
                  <li>This strategy takes trades between 9.30-11am and 1-3pm.</li>
                  <li>
                    Depending on when you set this up, the tasks can be deleted if they haven&apos;t
                    been triggered yet.
                  </li>
                  <li>
                    The backtests of this strategy can be <Link>found here</Link>.
                  </li>
                </ol>
              </Box>
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </form>
  );
};
export default TradeSetupForm;
