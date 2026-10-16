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
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
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
    <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, minHeight: "100vh" }}>

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
                variant="caption"
                sx={{ fontWeight: 700, color: "#1A1033", fontSize: "0.72rem", letterSpacing: "0.03em" }}
              >
                Password
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{
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
                            tabIndex={-1}
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
            {loading ? <CircularProgress size={22} color="inherit" /> : "Log In"}
          </Button>

        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{ mt: 6, color: alpha("#6B7280", 0.55), fontWeight: 500, textAlign: "center" }}
        >
          © SEBSA (Pvt) Ltd. All corporate assessment data encrypted.
        </Typography>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT — Visual panel (lg+ only)
      ═══════════════════════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: { xs: "100%", lg: "56%" },
          minHeight: { xs: 560, lg: "100vh" },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          px: { xs: 3, sm: 6, lg: 7, xl: 11 },
          py: { xs: 7, lg: 8 },
          background: "linear-gradient(145deg, #F6F0FF 0%, #FBF9FE 52%, #EEE4FC 100%)",
        }}
      >
        <Box sx={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 650 }}>
          <Typography sx={{ color: P, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", mb: 1.5 }}>
            SEBSA assessment platform
          </Typography>
          <Typography component="h1" sx={{ color: "#211239", fontSize: { xs: 32, sm: 40 }, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.12, mb: 2 }}>
            Assessment, Simplified.
          </Typography>
          <Typography sx={{ color: "#635A75", fontSize: { xs: 15, sm: 16 }, lineHeight: 1.65, maxWidth: 500, mb: { xs: 5, lg: 6 } }}>
            A seamless process for completing assessments, tracking progress, and recognizing achievement.
          </Typography>
          <Box component="ol" aria-label="Assessment process" sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: { xs: 2, sm: 0 }, listStyle: "none", p: 0, m: 0, width: "100%" }}>
            {[
              { icon: MailOutlineRoundedIcon, title: "Invitation Received", text: "Receive your assessment invitation." },
              { icon: AssignmentTurnedInOutlinedIcon, title: "Complete Assessment", text: "Share your knowledge and progress." },
              { icon: WorkspacePremiumOutlinedIcon, title: "Results & Certificate", text: "Earn recognition when you meet the criteria." },
            ].map(({ icon: Icon, title, text }, index) => (
              <Box component="li" key={title} sx={{ display: "flex", alignItems: { xs: "center", sm: "flex-start" }, flex: 1, position: "relative" }}>
                {index > 0 && <Box aria-hidden sx={{ display: { xs: "none", sm: "block" }, position: "absolute", top: 27, left: 0, right: 0, height: 1, bgcolor: alpha(P, 0.2) }} />}
                <Box sx={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: { xs: "row", sm: "column" }, alignItems: { xs: "center", sm: "flex-start" }, gap: { xs: 2, sm: 1.75 }, pr: { sm: 2 } }}>
                  <Box sx={{ flex: "0 0 auto", width: 54, height: 54, borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#FFFFFF", color: P, border: `1px solid ${alpha(P, 0.13)}`, boxShadow: `0 8px 20px ${alpha(P, 0.1)}` }}>
                    <Icon sx={{ fontSize: 25 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: "#2C2043", fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>{title}</Typography>
                    <Typography sx={{ color: "#746B84", fontSize: 12, lineHeight: 1.5, mt: 0.75 }}>{text}</Typography>
                  </Box>
                </Box>
                {index < 2 && <ArrowForwardIosRoundedIcon aria-hidden sx={{ display: { xs: "none", sm: "block" }, position: "absolute", top: 20, right: 7, zIndex: 2, fontSize: 14, color: alpha(P, 0.42) }} />}
              </Box>
            ))}
          </Box>
        </Box>
        {/* ── Animated glow orbs ─────────────────────────────────────────────── */}
        <Box sx={{
          position: "absolute", top: "-20%", right: "-12%",
          width: 520, height: 520, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(P, 0.45)} 0%, transparent 68%)`,
          animation: "orbA 14s ease-in-out infinite",
          "@keyframes orbA": {
            "0%,100%": { transform: "translateY(0)   scale(1)"    },
            "50%":     { transform: "translateY(28px) scale(1.06)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }} />
        <Box sx={{
          position: "absolute", bottom: "-14%", left: "-10%",
          width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha("#7B2FBE", 0.38)} 0%, transparent 68%)`,
          animation: "orbB 18s ease-in-out infinite 5s",
          "@keyframes orbB": {
            "0%,100%": { transform: "translateY(0)    scale(1)"    },
            "50%":     { transform: "translateY(-22px) scale(1.05)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }} />
        <Box sx={{
          position: "absolute", top: "52%", right: "8%",
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha("#A855F7", 0.22)} 0%, transparent 70%)`,
          animation: "orbC 11s ease-in-out infinite 2s",
          "@keyframes orbC": {
            "0%,100%": { transform: "scale(1)"    },
            "50%":     { transform: "scale(1.18)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }} />

        {/* ── Subtle grid ────────────────────────────────────────────────────── */}
        <Box sx={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: [
            `linear-gradient(${alpha("#fff", 0.025)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${alpha("#fff", 0.025)} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "64px 64px",
        }} />

        {/* ── Decorative ring ────────────────────────────────────────────────── */}
        <Box sx={{
          position: "absolute", top: "12%", left: "-6%",
          width: 220, height: 220, borderRadius: "50%",
          border: `1px solid ${alpha("#fff", 0.07)}`,
        }} />
        <Box sx={{
          position: "absolute", bottom: "16%", right: "-4%",
          width: 160, height: 160, borderRadius: "50%",
          border: `1px solid ${alpha("#fff", 0.06)}`,
        }} />

        {/* ── Glass content card ─────────────────────────────────────────────── */}
        <Box
          sx={{
            position: "relative", zIndex: 1,
            textAlign: "center",
            display: "none",
            px: { lg: 6, xl: 8 }, py: 7,
            mx: { lg: 5, xl: 8 },
            borderRadius: "28px",
            background: alpha("#ffffff", 0.055),
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${alpha("#ffffff", 0.11)}`,
            maxWidth: 440,
            boxShadow: `0 32px 80px ${alpha("#000", 0.25)}`,
          }}
        >
          {/* Shield icon */}
          <Box
            sx={{
              width: 84, height: 84, borderRadius: "26px",
              mx: "auto", mb: 4,
              background: `linear-gradient(135deg, ${alpha("#fff", 0.16)}, ${alpha("#fff", 0.05)})`,
              border: `1px solid ${alpha("#fff", 0.18)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 28px ${alpha("#000", 0.2)}`,
            }}
          >
          </Box>

          <Typography
            sx={{
              fontSize: 27, fontWeight: 800, color: "#fff",
              letterSpacing: "-0.3px", lineHeight: 1.25, mb: 2.5,
            }}
          >
            Secure Assessments.
            <br />
            Trusted Results.
          </Typography>

          <Typography
            sx={{ fontSize: 14.5, color: alpha("#fff", 0.6), lineHeight: 1.75, mb: 4 }}
          >
            SEBSA's internal platform ensures every evaluation is confidential, tamper-proof, and aligned with employee development goals.
          </Typography>

        </Box>

        {/* ── Bottom wordmark ────────────────────────────────────────────────── */}
        <Typography
          sx={{
            display: "none",
            position: "absolute", bottom: 24, left: 0, right: 0,
            textAlign: "center",
            fontSize: 10.5, color: alpha("#fff", 0.25),
            fontWeight: 700, letterSpacing: "0.12em",
          }}
        >
          SEBSA (PVT) LTD · ENTERPRISE ASSESSMENT PLATFORM
        </Typography>
      </Box>
    </Box>
  );
}
