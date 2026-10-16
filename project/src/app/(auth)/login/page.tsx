"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { loginSchema, type LoginInput } from "@/schemas";

const P    = "#3E0B78";
const PD   = "#2E0858";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setServerError(null);
    try {
      const res  = await fetch("/api/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setLoading(false);
        setServerError(json.error ?? "Login failed. Please verify your credentials.");
        return;
      }
      // Keep loading=true while navigating so button stays disabled during redirect
      router.push(json.data.role === "admin" ? "/admin/tracker" : "/dashboard");
    } catch {
      setLoading(false);
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <Box component="main" sx={{ "& :focus-visible": { outline: `3px solid ${P}`, outlineOffset: "3px" }, display: "flex", flexDirection: { xs: "column", lg: "row" }, minHeight: "100vh" }}>

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT — Form panel
      ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: { xs: "100%", lg: "44%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          bgcolor: "#FAFAFA",
          px: { xs: 3, sm: 6, md: 9, lg: 7, xl: 11 },
          py: { xs: 6, sm: 8 },
          "& > *": { width: "100%", maxWidth: 440, mx: "auto" },
          position: "relative",
          animation: "formEntrance 0.55s cubic-bezier(0.22,1,0.36,1) both",
          "@keyframes formEntrance": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to:   { opacity: 1, transform: "translateY(0)"    },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {/* ── Brand ─────────────────────────────────────────────────────────── */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ mb: 2.5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sebsa-logo.png"
              alt="SEBSA"
              style={{ height: 48, width: "auto", display: "block", objectFit: "contain" }}
            />
          </Box>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1033", mb: 0.75 }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ fontSize: 15, color: "#5A5572", lineHeight: 1.5 }}>
            Sign in to the Internal Assessment Portal
          </Typography>
        </Box>

        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Email */}
          <Box>
            <Typography
              component="label"
              htmlFor="login-email"
              variant="caption"
              sx={{ fontWeight: 700, color: "#1A1033", mb: 0.75, display: "block", fontSize: "0.72rem", letterSpacing: "0.03em" }}
            >
              Email Address
            </Typography>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  id="login-email"
                  type="email"
                  placeholder="name@sebsaworld.com"
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <AlternateEmailIcon sx={{ fontSize: 18, color: alpha("#292634", 0.35) }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Password */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography
                component="label"
                htmlFor="login-password"
                variant="caption"
                sx={{ fontWeight: 700, color: "#1A1033", fontSize: "0.72rem", letterSpacing: "0.03em" }}
              >
                Password
              </Typography>
              <Typography
                component="button"
                type="button"
                variant="caption"
                sx={{
                  border: 0, background: "none", p: 0, fontFamily: "inherit",
                  cursor: "pointer", fontWeight: 600, color: P,
                  fontSize: "0.7rem", transition: "opacity 0.15s",
                  "&:hover": { textDecoration: "underline", opacity: 0.8 },
                }}
                onClick={() =>
                  alert("Contact SEBSA IT Support (it-support@sebsaworld.com) to reset your credentials.")
                }
              >
                Forgot password?
              </Typography>
            </Box>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ fontSize: 18, color: alpha("#292634", 0.35) }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            type="button"
                            aria-pressed={showPassword}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            sx={{
                              color: alpha("#292634", 0.35),
                              mr: -0.5,
                              transition: "color 0.15s",
                              "&:hover": { color: P },
                            }}
                          >
                            {showPassword
                              ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                              : <VisibilityOutlinedIcon   sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Remember workstation */}
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                defaultChecked
                sx={{ p: "5px", color: alpha(P, 0.3), "&.Mui-checked": { color: P } }}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#292634" }}>
                Remember workstation
              </Typography>
            }
            sx={{ mx: 0, mt: -0.75 }}
          />

          {/* Server error */}
          {serverError && (
            <Alert severity="error" sx={{ py: 0.75 }}>
              {serverError}
            </Alert>
          )}

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            endIcon={!loading ? <ArrowForwardIcon /> : undefined}
            sx={{
              py: 1.5,
              borderRadius: "12px",
              fontSize: "0.95rem",
              fontWeight: 700,
              background: `linear-gradient(135deg, ${P} 0%, #6A2FBE 100%)`,
              boxShadow: `0 8px 24px ${alpha(P, 0.38)}`,
              transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
              "&:hover": {
                background: `linear-gradient(135deg, ${PD} 0%, ${P} 100%)`,
                boxShadow: `0 12px 30px ${alpha(P, 0.5)}`,
                transform: "translateY(-1px)",
              },
              "&:active": { transform: "translateY(0)" },
              "&.Mui-disabled": {
                background: "#E5E7EB", color: "#9CA3AF",
                boxShadow: "none", transform: "none",
              },
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            {loading ? <><CircularProgress aria-label="Signing in" size={22} color="inherit" /><Box component="span" sx={{ ml: 1 }}>Signing in…</Box></> : "Log In"}
          </Button>

        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{ mt: 6, color: "#6B6376", fontWeight: 500, textAlign: "center" }}
        >
          © SEBSA (Pvt) Ltd. All corporate assessment data encrypted.
        </Typography>
      </Box>

      {/* Illustrative workflow, never a user's live assessment status. */}
      <Box
        component="aside"
        aria-labelledby="workflow-heading"
        sx={{
          width: { xs: "100%", lg: "56%" },
          bgcolor: P,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 5, lg: 5, xl: 8 },
          py: { xs: 5, sm: 7, lg: 10 },
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""', position: "absolute", inset: { xs: "12px", sm: "24px" }, pointerEvents: "none",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: "24px",
          },
        }}
      >
        <Box sx={{ position: "relative", width: "100%", maxWidth: 700 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: "#DDC9F6", textTransform: "uppercase", mb: 2 }}>
            A clear path to achievement
          </Typography>
          <Typography id="workflow-heading" component="h2" sx={{ fontSize: { xs: 28, sm: 34, xl: 38 }, fontWeight: 750, letterSpacing: "-0.8px", lineHeight: 1.2, mb: 2 }}>
            Assessment, Simplified.
          </Typography>
          <Typography sx={{ fontSize: 15, color: "#E3D5F3", lineHeight: 1.7, maxWidth: 470 }}>
            A seamless process for completing assessments, tracking progress, and recognizing achievement.
          </Typography>

          <Box
            component="ol"
            aria-label="How assessments work"
            sx={{
              display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
              listStyle: "none", p: 0, m: 0, mt: { xs: 4, sm: 6 },
              columnGap: 2.5,
            }}
          >
            {[
              { icon: MailOutlineRoundedIcon, title: "Assessment Invitation", text: "Receive a secure invitation to complete your assessment." },
              { icon: AssignmentTurnedInOutlinedIcon, title: "Complete Your Assessment", text: "Answer the questions and submit your assessment securely." },
              { icon: WorkspacePremiumOutlinedIcon, title: "Results & Recognition", text: "View your result and access your certificate when you pass." },
            ].map(({ icon: Icon, title, text }, index) => (
              <Box
                component="li"
                key={title}
                sx={{
                  position: "relative", minWidth: 0,
                  display: { xs: "grid", sm: "block" }, gridTemplateColumns: "56px minmax(0, 1fr)", gap: 2.5,
                  pb: { xs: index < 2 ? 4 : 0, sm: 0 },
                }}
              >
                {index < 2 && (
                  <Box aria-hidden="true" sx={{
                    position: "absolute",
                    top: { xs: 64, sm: 28 }, left: { xs: 27, sm: 66 },
                    width: { xs: "1px", sm: "calc(100% - 54px)" },
                    height: { xs: "calc(100% - 72px)", sm: "1px" },
                    bgcolor: "rgba(255,255,255,0.45)",
                    "&::after": {
                      content: '""', position: "absolute",
                      width: 7, height: 7, borderRight: "1px solid #FFFFFF", borderBottom: "1px solid #FFFFFF",
                      right: { xs: -3, sm: 0 }, bottom: { xs: 0, sm: -3 },
                      transform: { xs: "rotate(45deg)", sm: "rotate(-45deg)" },
                    },
                  }} />
                )}
                <Box aria-hidden="true" sx={{
                  width: 56, height: 56, position: "relative", display: "grid", placeItems: "center",
                  borderRadius: "17px", border: "1px solid rgba(255,255,255,0.28)",
                  bgcolor: "rgba(255,255,255,0.08)", mb: { sm: 2.5 },
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}>
                  <Icon sx={{ fontSize: 27, color: "#FFFFFF" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#DDC9F6", mb: 0.75 }}>
                    STEP {String(index + 1).padStart(2, "0")}
                  </Typography>
                  <Typography component="h3" sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.45, mb: 1 }}>
                    {title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#E3D5F3", lineHeight: 1.65 }}>
                    {text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: { xs: 4, sm: 5 }, pt: 2.5, borderTop: "1px solid rgba(255,255,255,0.18)", color: "#DDC9F6", fontSize: 11, letterSpacing: "0.04em" }}>
            SEBSA · Internal Assessment Portal
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
