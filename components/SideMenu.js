import { Box, Drawer, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, Typography } from "@material-ui/core";
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import PersonIcon from '@material-ui/icons/Person';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import PaymentIcon from '@material-ui/icons/Payment';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import { useUser } from "../lib/customHooks";
import { useRouter } from "next/router";

const useStyles = makeStyles((theme) =>
({
    drawer: {
        '& .MuiDrawer-paper': {
            width: "250px",
        }
    },
    nameContainer: {
        background: theme.palette.primary.main,
        color: "white",
        padding: "16px"
    },
    list: {
        '& .MuiListItem-root': {
            cursor: "pointer"
        },
        '& .MuiListItemIcon-root': {
            minWidth: "36px"
        },
        '& .MuiSvgIcon-root': {
            color: "#5E6F87"
        }
    }
}),
);

export default function SideMenu({ isOpen, handleClose }) {
    const classes = useStyles();
    const { user, mutateUser } = useUser();
    const router = useRouter();

    return (
        <Drawer open={isOpen} onClose={() => handleClose(false)} className={classes.drawer}>
            <Box display="flex" className={classes.nameContainer}>
                {user?.session?.avatar_url && (
                    <img
                        alt={user.session.user_shortname}
                        src={user.session.avatar_url}
                        stle={{ marginRight: "8px" }}
                        width={20}
                        height={20}
                    />
                )}
                <Typography variant="h6">
                    {user?.session?.user_shortname}
                </Typography>
            </Box>
            <List className={classes.list}>
                <ListItem button onClick={() => router.push("/profile")}>
                    <ListItemIcon>
                        <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="profile details" primaryTypographyProps={{ className: "primaryLight" }} />
                    <ListItemSecondaryAction>
                        <ChevronRightIcon />
                    </ListItemSecondaryAction>
                </ListItem>

                {user?.isClubMember ? null : <ListItem button onClick={() => router.push("/plan")}>
                    <ListItemIcon>
                        <FavoriteBorderIcon />
                    </ListItemIcon>
                    <ListItemText primary="daily trading plan" primaryTypographyProps={{ className: "primaryLight" }} />
                    <ListItemSecondaryAction>
                        <ChevronRightIcon />
                    </ListItemSecondaryAction>
                </ListItem>}

                {user?.isClubMember ? null : <ListItem button onClick={() => router.push("/new-trade")}>
                    <ListItemIcon>
                        <AddIcon />
                    </ListItemIcon>
                    <ListItemText primary="new trade" primaryTypographyProps={{ className: "primaryLight" }} />
                    <ListItemSecondaryAction>
                        <ChevronRightIcon />
                    </ListItemSecondaryAction>
                </ListItem>}

                <ListItem button onClick={() => alert("coming soon.. stay tuned 🙂")}>
                    <ListItemIcon>
                        <MonetizationOnIcon />
                    </ListItemIcon>
                    <ListItemText primary="monthly performance" primaryTypographyProps={{ className: "primaryLight" }} />
                    <ListItemSecondaryAction>
                        <ChevronRightIcon />
                    </ListItemSecondaryAction>
                </ListItem>

                <ListItem button onClick={() => alert("coming soon.. stay tuned 🙂")}>
                    <ListItemIcon>
                        <PaymentIcon />
                    </ListItemIcon>
                    <ListItemText primary="subscriptions and payments" primaryTypographyProps={{ className: "primaryLight" }} />
                    <ListItemSecondaryAction>
                        <ChevronRightIcon />
                    </ListItemSecondaryAction>
                </ListItem>

                <ListItem button onClick={async (e) => {
                    e.preventDefault();
                    await mutateUser(fetchJson('/api/logout'));
                    router.push('/');
                }}>
                    <ListItemIcon>
                        <ExitToAppIcon />
                    </ListItemIcon>
                    <ListItemText primary="logout" primaryTypographyProps={{ className: "primaryLight" }} />
                </ListItem>


            </List>
        </Drawer>
    )
}