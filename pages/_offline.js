import Layout from '../components/Layout';
import { useUser } from '../lib/customHooks';

const Profile = () => {
    const { user } = useUser({ redirectTo: '/' });

    if (!user || user.isLoggedIn === false) {
        return <Layout>loading...</Layout>;
    }

    return (
        <Layout>
            <h1>Your Zerodha profile:</h1>
            <pre>{JSON.stringify(user.session, null, 2)}</pre>
        </Layout>
    );
};

export default function Profile() {
    return (
        <Layout>
            <h6>Your are offline 😐</h6>
        </Layout>
    )
};
