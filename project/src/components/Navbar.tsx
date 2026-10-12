"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import { alpha } from "@mui/material/styles";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LogoutIcon from "@mui/icons-material/Logout";

const P = "#6343D8";
const PD = "#5332C7";

export interface NavbarProps {
  userName?: string;
  userEmail?: string;
}

export function Navbar({ userName, userEmail }: NavbarProps) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "SW";

  const handleLogout = async () => {
    setMenuAnchor(null);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <Box
      component="header"
      sx={{
        width: "100%",
        bgcolor: "#FFFFFF",
        borderBottom: `1px solid ${alpha(P, 0.08)}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          height: { xs: 60, sm: 68 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: { xs: 1.25, sm: 1.5 }, cursor: "pointer" }}
          onClick={() => router.push("/dashboard")}
        >
          <Box
            sx={{
              width: { xs: 34, sm: 38 },
              height: { xs: 34, sm: 38 },
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${P}, ${PD})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${alpha(P, 0.32)}`,
              flexShrink: 0,
            }}
          >
            <SecurityOutlinedIcon sx={{ color: "white", fontSize: { xs: 18, sm: 20 } }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                letterSpacing: "-0.4px",
                lineHeight: 1.1,
                background: `linear-gradient(120deg, ${P} 0%, #3C2FCF 55%, ${PD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SEBSA
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.58rem", sm: "0.62rem" },
                color: "text.secondary",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "0.01em",
              }}
            >
              Internal Assessment Portal
            </Typography>
          </Box>
        </Box>

        {/* User button */}
        <Button
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          endIcon={
            menuAnchor
              ? <KeyboardArrowUpIcon sx={{ fontSize: "1rem !important", color: "text.secondary" }} />
              : <ExpandMoreIcon sx={{ fontSize: "1rem !important", color: "text.secondary" }} />
          }
          sx={{
            minWidth: 0,
            px: { xs: 0.5, sm: 1 },
            py: 0.5,
            color: "text.primary",
            textTransform: "none",
            fontWeight: 500,
            fontSize: { xs: "0.8rem", sm: "0.85rem" },
            borderRadius: "10px",
            gap: { xs: 0.5, sm: 0.75 },
            "&:hover": { bgcolor: alpha(P, 0.05) },
          }}
        >
          <Avatar
            sx={{
              width: { xs: 30, sm: 34 },
              height: { xs: 30, sm: 34 },
              fontSize: { xs: "0.65rem", sm: "0.7rem" },
              fontWeight: 700,
              bgcolor: alpha(P, 0.12),
              color: P,
            }}
          >
            {initials}
          </Avatar>
          <Typography
            component="span"
            sx={{
              display: { xs: "none", sm: "block" },
              fontWeight: 500,
              color: "text.primary",
              fontSize: "0.85rem",
            }}
          >
            {userEmail}
          </Typography>
        </Button>

        {/* Dropdown menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          sx={{ mt: 0.5 }}
        >
          <MenuItem disabled sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 220, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#292634" }}>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userEmail}
            </Typography>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={handleLogout}
            sx={{ color: "error.main", gap: 1.25, py: 1, fontSize: "0.85rem", fontWeight: 600 }}
          >
            <LogoutIcon sx={{ fontSize: 17 }} />
            Log out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
