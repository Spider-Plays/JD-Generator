import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565c0",
      dark: "#0d47a1",
      light: "#42a5f5",
    },
    background: {
      default: "#f7f9fc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1c1b1f",
      secondary: "#5f6368",
    },
    divider: "#e6e8ee",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h6: { fontWeight: 600 },
    subtitle1: { color: "#5f6368" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 18, paddingBlock: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #e6e8ee",
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

export default theme;
