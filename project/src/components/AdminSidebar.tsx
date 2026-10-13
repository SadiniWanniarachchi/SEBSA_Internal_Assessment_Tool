"use client";

import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useRouter } from "next/navigation";

const SIDEBAR_WIDTH = 280;

const BG      = "#0F2040";
const ACTIVE  = "rgba(255,255,255,0.12)";
const ACCENT  = "#6B8FD4";
const INACTIVE= "#FFFFFF";

const navItems = [
  { label: "Tracker",         href: "/admin/tracker",   icon: <DashboardOutlinedIcon sx={{ fontSize: 20 }} /> },
  { label: "Employees",       href: "/admin/employees", icon: <PeopleAltOutlinedIcon sx={{ fontSize: 20 }} /> },
  { label: "Question Bank",   href: "/admin/questions", icon: <QuizOutlinedIcon      sx={{ fontSize: 20 }} /> },
  { label: "Send Assessment", href: "/admin/cycles",    icon: <SendOutlinedIcon      sx={{ fontSize: 20 }} /> },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        bgcolor: BG,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        pt: 0,
        pb: 3,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Box
        component="a"
        href="/admin/tracker"
        sx={{
          height: { xs: 76, sm: 88 },
          px: 3,
          display: "flex",
          alignItems: "center",
          bgcolor: BG,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <img
          src="/sebsa-logo.png"
          alt="SEBSA"
          style={{ height: 48, width: "auto", display: "block", objectFit: "contain" }}
        />
      </Box>

      <List disablePadding sx={{ px: 1.5, pt: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.href}
              component="a"
              href={item.href}
              sx={{
                borderRadius: 1.5,
                mb: 1,
                px: 1.5,
                py: 1.35,
                bgcolor: isActive ? ACTIVE : "transparent",
                borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                color: isActive ? "#FFFFFF" : INACTIVE,
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.07)",
                  color: "#FFFFFF",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: "inherit",
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: "0.95rem",
                      fontWeight: isActive ? 700 : 500,
                      color: "inherit",
                      lineHeight: 1.3,
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <List disablePadding sx={{ px: 1.5, mt: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1.5,
            px: 1.5,
            py: 1.35,
            color: "#FFFFFF",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.07)",
            },
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
            <LogoutOutlinedIcon sx={{ fontSize: 22 }} />
          </ListItemIcon>
          <ListItemText
            primary="Log out"
            slotProps={{
              primary: {
                sx: {
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "inherit",
                },
              },
            }}
          />
        </ListItemButton>
      </List>
    </Box>
  );
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  return (
    <>
      <Box
        component="nav"
        sx={{
          display: { xs: "none", md: "block" },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1100,
        }}
      >
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            height: "100vh",
          }}
        >
          <SidebarContent />
        </Box>
      </Box>

      {/* Mobile: temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            bgcolor: BG,
            border: "none",
          },
        }}
      >
        <SidebarContent />
      </Drawer>
    </>
  );
}
