import Link from 'next/link';
import PropTypes from 'prop-types';
import AppBar from '@material-ui/core/AppBar';
import Container from '@material-ui/core/Container';
import Toolbar from '@material-ui/core/Toolbar';
import { makeStyles } from '@material-ui/core/styles';
import MenuIcon from '@material-ui/icons/Menu';
import HomeIcon from '@material-ui/icons/Home';
import { useState } from 'react';
import SideMenu from './SideMenu';

const useStyles = makeStyles((theme) =>
({
    root: {
        flexGrow: 1,
        marginBottom: "16px"
    },
    container: {
        display: "flex",
        justifyContent: "space-between",
        padding: 0
    },
    home: {
        color: theme.palette.common.white,
    },
}),
);


export default function Header() {
    const classes = useStyles();
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <>
            <header className={classes.root}>
                <AppBar position="static" elevation={0}>
                    <Toolbar>
                        <Container maxWidth="sm" className={classes.container}>
                            {/* TODO: replace with signalX icon */}
                            <Link href="/dashboard">
                                <HomeIcon />
                            </Link>
                            <MenuIcon className={classes.home} onClick={() => setDrawerOpen(true)} />
                        </Container>
                    </Toolbar>
                </AppBar>
            </header>
            <SideMenu isOpen={drawerOpen} handleClose={() => setDrawerOpen(false)} />
        </>
    );
}

Header.propTypes = {
    title: PropTypes.string,
    showProfileIcon: PropTypes.bool
}