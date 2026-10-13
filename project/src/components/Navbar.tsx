"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LogoutIcon from "@mui/icons-material/Logout";

const P  = "#3E0B78";
const PD = "#2E0858";

export interface NavbarProps {
  userName?: string;
  userEmail?: string;
  homeUrl?: string;
  onMenuToggle?: () => void;
  showLogo?: boolean;
  showLogout?: boolean;
  height?: { xs: number; sm: number };
}

export function Navbar({
  userName,
  userEmail,
  homeUrl = "/dashboard",
  onMenuToggle,
  showLogo = true,
  showLogout = true,
  height = { xs: 60, sm: 68 },
}: NavbarProps) {
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
        borderBottom: `1px solid ${alpha(P, 0.1)}`,
        position: "sticky",
        top: 0,
        zIndex: 1200,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        {/* Left: optional hamburger (admin mobile) + logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onMenuToggle && (
            <IconButton
              onClick={onMenuToggle}
              sx={{ display: { md: "none" }, color: P, mr: 0.5 }}
              aria-label="open navigation"
            >
              <MenuIcon />
            </IconButton>
          )}
          {showLogo && (
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
              onClick={() => router.push(homeUrl)}
            >
              <img
                src="/sebsa-logo.png"
                alt="SEBSA"
                style={{ height: 48, width: "auto", display: "block", objectFit: "contain" }}
              />
            </Box>
          )}
        </Box>

        {/* Right: user button */}
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
          {showLogout && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                onClick={handleLogout}
                sx={{ color: "error.main", gap: 1.25, py: 1, fontSize: "0.85rem", fontWeight: 600 }}
              >
                <LogoutIcon sx={{ fontSize: 17 }} />
                Log out
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
    </Box>
  );
}
