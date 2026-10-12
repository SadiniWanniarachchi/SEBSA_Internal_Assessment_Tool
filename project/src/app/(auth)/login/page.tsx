"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { alpha } from "@mui/material/styles";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { loginSchema, type LoginInput } from "@/schemas";

const P = "#44107F";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "sadini.wanniarachchi@sebsaworld.com",
      password: "emp123",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      setLoading(false);
      if (!json.success) {
        setServerError(json.error ?? "Login failed. Please verify your credentials.");
        return;
      }
      router.push(json.data.role === "admin" ? "/admin/tracker" : "/dashboard");
    } catch {
      setLoading(false);
      setServerError("Network error. Please try again.");
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "#FFFFFF",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#D2D9DA",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#9BAAAC",
      },
      "&.Mui-focused": {
        backgroundColor: "#FFFFFF",
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: P,
          borderWidth: "1.5px",
          boxShadow: `0 0 0 3px ${alpha(P, 0.08)}`,
        },
      },
    },
    "& .MuiInputAdornment-root .MuiSvgIcon-root": {
      fontSize: 19,
      color: alpha("#1A1033", 0.35),
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        position: "relative",
        overflow: "hidden",
        // Layered gradient background
        background: "#F8FAFA",
      }}
    >
      {/* ── Login Card ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 444,
          position: "relative",
          zIndex: 1,
          borderRadius: "24px",
          border: "1px solid #DDE2E3",
          background: "#FFFFFF",
          boxShadow: [
            `0 2px 0 ${alpha("#fff", 0.9)} inset`,
            "0 24px 64px rgba(17,38,41,0.10)",
            "0 4px 16px rgba(0,0,0,0.04)",
          ].join(", "),
          px: { xs: 3.5, sm: 5 },
          pt: 5,
          pb: 4.5,
        }}
      >
        {/* Top accent line */}
        <Box
          aria-hidden
          sx={{
            position: "absolute", top: 0, left: "15%", right: "15%", height: "2px",
            background: `linear-gradient(90deg, transparent, ${alpha(P, 0.5)}, transparent)`,
            borderRadius: "0 0 2px 2px",
          }}
        />

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 4.5 }}>
          {/* Shield icon */}
          <Box
            sx={{
              width: 60, height: 60, borderRadius: "16px",
              background: P,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: [
                `0 10px 24px ${alpha(P, 0.35)}`,
                `0 2px 0 ${alpha("#fff", 0.25)} inset`,
              ].join(", "),
              mb: 2.5,
            }}
          >
            <SecurityOutlinedIcon sx={{ color: "white", fontSize: 30 }} />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.5px",
              background: P,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SEBSA
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Internal Assessment Portal
          </Typography>
        </Box>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Email */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }} color="primary">
                Email Address
              </Typography>
            </Box>
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
                  sx={inputSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmailIcon />
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }} color="primary">
                Password
              </Typography>
              <Typography
                variant="caption"
                sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.7rem", "&:hover": { textDecoration: "underline" } }}
                color="primary"
                onClick={() => alert("Contact SEBSA IT Support (it-support@sebsaworld.com) to reset your credentials.")}
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
                  sx={inputSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon />
                      </InputAdornment>
                      ),
                      endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          tabIndex={-1}
                          sx={{ color: alpha("#1A1033", 0.35), mr: -0.5 }}
                        >
                          {showPassword
                            ? <VisibilityOffOutlinedIcon sx={{ fontSize: 19 }} />
                            : <VisibilityOutlinedIcon   sx={{ fontSize: 19 }} />}
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
                sx={{
                  p: "5px",
                  color: alpha(P, 0.3),
                  "&.Mui-checked": { color: P },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600 }} color="text.primary">
                Remember workstation
              </Typography>
            }
            sx={{ mx: 0, mt: -0.5 }}
          />

          {/* Error state */}
          {serverError && (
            <Alert severity="error" sx={{ py: 0.75 }}>
              {serverError}
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            endIcon={!loading ? <ArrowForwardIcon /> : undefined}
            sx={{
              mt: 0.5,
              py: 1.6,
              borderRadius: "14px",
              fontSize: "0.9rem",
              fontWeight: 700,
              letterSpacing: "0.2px",
              background: P,
              boxShadow: [
                `0 8px 22px ${alpha(P, 0.4)}`,
                `0 1px 0 ${alpha("#fff", 0.2)} inset`,
              ].join(", "),
              "&:hover": {
                background: P,
                boxShadow: [
                  `0 8px 22px ${alpha(P, 0.4)}`,
                  `0 1px 0 ${alpha("#fff", 0.2)} inset`,
                ].join(", "),
              },
              "&:active": { background: P },
              "&.Mui-disabled": { background: alpha("#9CA3AF", 0.35), color: "#fff", boxShadow: "none" },
              transition: "none",
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Log In"}
          </Button>

          {/* Quick demo fill — dev only */}
          <Box>
            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" sx={{ color: alpha("#6B7280", 0.7), fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.05em" }}>
                QUICK DEMO SWITCH
              </Typography>
            </Divider>
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setValue("email", "sadini.wanniarachchi@sebsaworld.com"); setValue("password", "emp123"); }}
                sx={{
                  borderRadius: "10px",
                  fontSize: "0.71rem",
                  py: 0.6,
                  px: 1.8,
                  borderColor: alpha(P, 0.25),
                  color: P,
                  fontWeight: 600,
                  "&:hover": { borderColor: alpha(P, 0.25), bgcolor: "transparent" },
                }}
              >
                Employee: Sadini
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setValue("email", "admin@sebsaworld.com"); setValue("password", "admin123"); }}
                sx={{
                  borderRadius: "10px",
                  fontSize: "0.71rem",
                  py: 0.6,
                  px: 1.8,
                  borderColor: alpha("#6B7280", 0.2),
                  color: "text.secondary",
                  fontWeight: 600,
                  "&:hover": { borderColor: alpha("#6B7280", 0.2), bgcolor: "transparent" },
                }}
              >
                Admin: System
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Typography
        variant="caption"
        sx={{
          mt: 4,
          color: alpha("#6B7280", 0.65),
          fontWeight: 500,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        © SEBSA (Pvt) Ltd. All corporate assessment data encrypted.
      </Typography>
    </Box>
  );
}
