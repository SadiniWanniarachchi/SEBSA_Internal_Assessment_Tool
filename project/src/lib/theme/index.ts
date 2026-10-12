import { createTheme, alpha } from "@mui/material/styles";

export const sebsaColors = {
  primary: "#6343D8",
  primaryDark: "#5332C7",
  ink: "#292634",
  muted: "#777283",
  line: "#E7E1EF",
  page: "#FFFFFF",
  lavender: "#F4EEFF",
  green: "#178F91",
} as const;

const P = sebsaColors.primary;
const PD = sebsaColors.primaryDark;

export const sebsaTheme = createTheme({
  palette: {
    mode: "light",
    primary:    { main: P,       dark: PD,      light: "#6A3C9A", contrastText: "#fff" },
    secondary:  { main: P,                         contrastText: "#fff" },
    success:    { main: "#10B981", light: "#ECFDF5", dark: "#059669", contrastText: "#fff" },
    error:      { main: "#EF4444", light: "#FEF2F2" },
    warning:    { main: "#F59E0B", light: "#FFFBEB" },
    info:       { main: P },
    background: { default: sebsaColors.page, paper: sebsaColors.page },
    text:       { primary: sebsaColors.ink, secondary: sebsaColors.muted, disabled: "#9CA3AF" },
    divider:    alpha(P, 0.08),
  },

  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.2 },
    h2: { fontWeight: 700, letterSpacing: "-1px",   lineHeight: 1.25 },
    h3: { fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.3 },
    h4: { fontWeight: 700, letterSpacing: "-0.25px" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontWeight: 600, lineHeight: 1.5 },
    body2:     { lineHeight: 1.55 },
    button:    { textTransform: "none", fontWeight: 600, letterSpacing: "0.1px" },
    caption:   { lineHeight: 1.4, fontWeight: 500 },
    overline:  { fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1.5 },
  },

  shape: { borderRadius: 12 },

  components: {
    // ── Reset ─────────────────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": { boxSizing: "border-box" },
        html: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
        body: {
          backgroundColor: sebsaColors.page,
          color: sebsaColors.ink,
          scrollbarWidth: "thin",
          scrollbarColor: "#D5DBDC transparent",
        },
        "body::-webkit-scrollbar":       { width: 6 },
        "body::-webkit-scrollbar-track": { background: "transparent" },
        "body::-webkit-scrollbar-thumb": { background: "#D5DBDC", borderRadius: 3 },
        a: { color: "inherit", textDecoration: "none" },
        "#__next": { minHeight: "100vh", backgroundColor: sebsaColors.page },
      },
    },

    // ── Button ────────────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: "0.1px",
          transition: "none",
          "&.MuiButton-containedPrimary": {
            background: P,
            boxShadow: `0 4px 15px ${alpha(P, 0.35)}`,
            "&:hover, &:active": {
              background: P,
              boxShadow: `0 4px 15px ${alpha(P, 0.35)}`,
            },
            "&.Mui-disabled": { background: "#E5E7EB", color: "#9CA3AF", boxShadow: "none" },
          },
          "&.MuiButton-outlinedPrimary": {
            borderColor: alpha(P, 0.3),
            "&:hover": { borderColor: alpha(P, 0.3), backgroundColor: "transparent" },
          },
          "&.MuiButton-textPrimary:hover": { backgroundColor: "transparent" },
        },
        sizeSmall:  { paddingLeft: 14,  paddingRight: 14,  fontSize: "0.78rem" },
        sizeMedium: { paddingLeft: 20,  paddingRight: 20,  paddingTop: 8,  paddingBottom: 8 },
        sizeLarge:  { paddingLeft: 28,  paddingRight: 28,  paddingTop: 12, paddingBottom: 12, fontSize: "0.95rem" },
      },
    },

    // ── IconButton ────────────────────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "all 0.15s ease",
          "&:hover": { backgroundColor: alpha(P, 0.08) },
        },
      },
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #E0E4E5",
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(32, 33, 105, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          backgroundImage: "none",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 24, "&:last-child": { paddingBottom: 24 } },
      },
    },

    // ── Paper ─────────────────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: 16 },
      },
    },

    // ── Inputs ────────────────────────────────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          transition: "background-color 0.15s ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#D2D9DA",
            transition: "border-color 0.15s ease",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9BAAAC" },
          "&.Mui-focused": {
            backgroundColor: "#FFFFFF",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: P, borderWidth: "1.5px" },
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "#EF4444" },
        },
        input: {
          fontSize: "0.875rem",
          fontWeight: 500,
          "&::placeholder": { color: "#9CA3AF", opacity: 1 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: "0.75rem", fontWeight: 700, "&.Mui-focused": { color: P } },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: "0.71rem", marginLeft: 0 } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiSelect: {
      styleOverrides: {
        select: { fontSize: "0.875rem", fontWeight: 500 },
      },
    },

    // ── Checkbox / Radio / Switch ─────────────────────────────────────────────
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: alpha(P, 0.35),
          "&.Mui-checked": { color: P },
          "&:hover": { backgroundColor: alpha(P, 0.06) },
          padding: 6,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: { color: "#D1D5DB", "&.Mui-checked": { color: P } },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 6 },
        track: { borderRadius: 10, backgroundColor: "#D1D5DB", opacity: "1 !important" as any },
        thumb: { boxShadow: "0 2px 4px rgba(0,0,0,0.2)", width: 16, height: 16 },
        switchBase: {
          padding: 8,
          "&.Mui-checked + .MuiSwitch-track": { backgroundColor: `${P} !important` },
        },
      },
    },

    // ── Chip ──────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: "0.72rem", height: 26 },
        colorSuccess:  { backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" },
        colorError:    { backgroundColor: "#FEF2F2", color: "#DC2626" },
        colorPrimary:  { backgroundColor: alpha(P, 0.1), color: P },
        colorWarning:  { backgroundColor: "#FFFBEB", color: "#B45309" },
      },
    },

    // ── Table ─────────────────────────────────────────────────────────────────
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 700,
            fontSize: "0.68rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#9CA3AF",
            backgroundColor: "#F9F8FF",
            borderBottom: `1px solid ${alpha(P, 0.08)}`,
            padding: "12px 16px",
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableRow-root": {
            transition: "background-color 0.1s ease",
            "&:hover": { backgroundColor: alpha(P, 0.02) },
            "& .MuiTableCell-body": {
              borderBottom: `1px solid ${alpha(P, 0.06)}`,
              padding: "14px 16px",
              fontSize: "0.825rem",
            },
          },
        },
      },
    },

    // ── Progress ──────────────────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: alpha(P, 0.1) },
        bar: { background: `linear-gradient(90deg, ${PD}, ${P})` },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: { color: P },
      },
    },

    // ── Avatar ────────────────────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: "0.85rem" },
        colorDefault: { backgroundColor: alpha(P, 0.12), color: P },
      },
    },

    // ── Divider ───────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: { root: { borderColor: alpha(P, 0.08) } },
    },

    // ── Dialog ────────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: "0 25px 60px rgba(0,0,0,0.15)",
          border: `1px solid ${alpha(P, 0.08)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { padding: "24px 24px 12px", fontWeight: 700, fontSize: "1.1rem" },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: "12px 24px 24px" } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: "16px 24px 24px", gap: 8 } },
    },

    // ── Alert ─────────────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: "0.8rem",
          alignItems: "center",
          "&.MuiAlert-standardError": { backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" },
          "&.MuiAlert-standardSuccess": { backgroundColor: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" },
          "&.MuiAlert-standardWarning": { backgroundColor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" },
          "&.MuiAlert-standardInfo": { backgroundColor: alpha(P, 0.06), color: PD, border: `1px solid ${alpha(P, 0.2)}` },
        },
      },
    },

    // ── Tooltip ───────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1A1033",
          fontSize: "0.72rem",
          borderRadius: 8,
          padding: "6px 10px",
        },
      },
    },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 2.5, borderRadius: 2, backgroundColor: P },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.82rem",
          minHeight: 40,
          padding: "8px 16px",
          "&.Mui-selected": { color: P },
        },
      },
    },

    // ── Badge ─────────────────────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 700, fontSize: "0.65rem" },
      },
    },

    // ── Menu ──────────────────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${alpha(P, 0.1)}`,
          boxShadow: `0 10px 30px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)`,
          padding: "4px",
          minWidth: 200,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: "0.825rem",
          fontWeight: 500,
          margin: "2px 0",
          padding: "8px 12px",
          "&:hover": { backgroundColor: alpha(P, 0.06) },
          "&.Mui-selected": { backgroundColor: alpha(P, 0.08), color: P, fontWeight: 600 },
        },
      },
    },

    // ── Pagination ────────────────────────────────────────────────────────────
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.8rem",
          "&.Mui-selected": {
            backgroundColor: P,
            color: "#fff",
            "&:hover": { backgroundColor: P },
          },
        },
      },
    },

    // ── Skeleton ──────────────────────────────────────────────────────────────
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: alpha(P, 0.06), borderRadius: 8 },
      },
    },
  },
});
