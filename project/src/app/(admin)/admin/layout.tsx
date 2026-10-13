"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { Navbar } from "@/components/Navbar";
import { AdminSidebar } from "@/components/AdminSidebar";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Middleware already verified the JWT before this renders.
    // This GET just fetches the admin's display name/email for the Navbar.
    // We never block rendering for this — the layout shows immediately.
    fetch("/api/auth")
      .then(r => r.json())
      .then(json => {
        if (!json.success || json.data.user.role !== "admin") {
          router.replace("/login");
        } else {
          setAdmin(json.data.user);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "#FFFFFF" }}>
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          ml: { xs: 0, md: "280px" },
        }}
      >
        <Navbar
          userName={admin?.fullName}
          userEmail={admin?.email}
          homeUrl="/admin/tracker"
          onMenuToggle={() => setMobileOpen(true)}
          showLogo={false}
          showLogout={false}
          height={{ xs: 76, sm: 88 }}
        />
        <Box
          component="main"
          sx={{ flex: 1, bgcolor: "#FFFFFF", overflowY: "auto", minWidth: 0 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
