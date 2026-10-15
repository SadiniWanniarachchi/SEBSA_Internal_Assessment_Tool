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
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { loginSchema, type LoginInput } from "@/schemas";

const P    = "#3E0B78";
const PD   = "#2E0858";
const NAVY = "#0D1B3E";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
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
    <Box sx={{ display: "flex", minHeight: "100vh" }}>

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

          {/* Dev-only demo switcher */}
          <Box>
            <Divider sx={{ my: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ color: alpha("#6B7280", 0.65), fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.06em" }}
              >
                QUICK DEMO SWITCH
              </Typography>
            </Divider>
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", mt: 1.5 }}>
              <Button
                type="button"
                size="small"
                variant="outlined"
                onClick={() => {
                  setValue("email", "sadini.wanniarachchi@sebsaworld.com");
                  setValue("password", "emp123");
                }}
                sx={{
                  borderRadius: "10px", fontSize: "0.71rem", py: 0.6, px: 1.8,
                  borderColor: alpha(P, 0.25), color: P, fontWeight: 600,
                  "&:hover": { borderColor: alpha(P, 0.4), bgcolor: alpha(P, 0.04) },
                }}
              >
                Employee: Sadini
              </Button>
              <Button
                type="button"
                size="small"
                variant="outlined"
                onClick={() => {
                  setValue("email", "admin@sebsaworld.com");
                  setValue("password", "admin123");
                }}
                sx={{
                  borderRadius: "10px", fontSize: "0.71rem", py: 0.6, px: 1.8,
                  borderColor: alpha("#6B7280", 0.2), color: "text.secondary", fontWeight: 600,
                  "&:hover": { borderColor: alpha("#6B7280", 0.35), bgcolor: alpha("#6B7280", 0.04) },
                }}
              >
                Admin: System
              </Button>
            </Box>
          </Box>
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
        aria-hidden
        sx={{
          display: { xs: "none", lg: "flex" },
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(145deg, ${NAVY} 0%, #150830 45%, #2A0A5C 100%)`,
        }}
      >
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
            <SecurityOutlinedIcon sx={{ fontSize: 40, color: "#fff" }} />
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
