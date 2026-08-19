import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme";
import JDFormatterPage from "./pages/JDFormatter";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <JDFormatterPage />
    </ThemeProvider>
  );
}
