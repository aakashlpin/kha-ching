import { Card, Link, List, ListItem } from '@material-ui/core';
import Layout from '../components/Layout';
import { useUser } from '../lib/customHooks';
import { STRATEGIES, STRATEGIES_DETAILS } from '../lib/constants';
import { Router } from 'next/router';

const NewTrade = () => {
    const { user } = useUser({ redirectTo: '/' });

    if (!user || user.isLoggedIn === false) {
        return <Layout>loading...</Layout>;
    }

    if (user && user.isClubMember) {
        return Router.push("/dashbaord");
    }

    return (
        <Layout>
            <Card style={{ padding: "16px" }}>
                <List>
                    <ListItem button>
                        <Link href="/strat/straddle">
                            {STRATEGIES_DETAILS[STRATEGIES.ATM_STRADDLE].heading}
                        </Link>
                    </ListItem>
                    <ListItem button>
                        <Link href="/strat/straddle1x-strangle2x">
                            {STRATEGIES_DETAILS[STRATEGIES.CM_WED_THURS].heading}
                        </Link>
                    </ListItem>
                    <ListItem button>
                        <Link href="/strat/dos">
                            {STRATEGIES_DETAILS[STRATEGIES.DIRECTIONAL_OPTION_SELLING].heading}
                        </Link>
                    </ListItem>
                    {/* <ListItem>
          <Link href="/strat/obs">
            {STRATEGIES_DETAILS[STRATEGIES.OPTION_BUYING_STRATEGY].heading}
          </Link>
        </ListItem> */}
                </List>
            </Card>
        </Layout>
    );
};

export default NewTrade;
