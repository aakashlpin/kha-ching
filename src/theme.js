import { red } from '@material-ui/core/colors';
import { createMuiTheme } from '@material-ui/core/styles';

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#0F3262",
    },
    secondary: {
      main: '#19857b'
    },
    error: {
      main: '#e83d55'
    },
    background: {
      default: '#fff'
    },
    text: {
      primary: "#202124"
    },
  },
  typography: {
    fontFamily: `'Roboto', sans-serif`,
    h6: {
      fontSize: "1rem"
    }
  },
  overrides: {
    MuiCard: {
      root: {
        borderRadius: "16px"
      },
    },
    MuiButton: {
      root: {
        textTransform: "none"
      }
    },
    MuiTypography: {
      root: {
        '&.primaryLight': {
          color: "#5E6F87"
        },
        '&.white': {
          color: "white",
        },
        '&.primary': {
          color: "#0F3262"
        },
        '&.error': {
          color: "#FF6558"
        },
        '&.success': {
          color: "#32A065"
        },
        '&.semiBold': {
          fontWeight: 500
        }
      }
    }
  },
});

export default theme;
