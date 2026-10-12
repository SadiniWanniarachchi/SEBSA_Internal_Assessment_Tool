"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  FileText,
  ArrowRight,
  Download,
  Calendar,
  Lock,
  Edit3,
  ExternalLink,
  Award,
  LogOut,
  ChevronDown,
  CheckCircle2
} from "lucide-react";

interface UserData {
  id: string;
  fullName: string;
  email: string;
  department: string;
  roleTitle: string;
  employeeIdCode: string;
  tierBadge: string;
  joinedDate: string;
}

interface ActiveCycle {
  id: string;
  label: string;
  deadline: string;
}

interface CertificateItem {
  id: string;
  title: string;
  badge: string;
  badgeType?: "compliant" | "top";
  completedDate: string;
  idCode: string;
  score: string;
  downloadUrl: string;
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeCycle, setActiveCycle] = useState<ActiveCycle | null>(null);
  const [pendingAssessment, setPendingAssessment] = useState(true);
  const [currentAttempt, setCurrentAttempt] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth");
        const json = await res.json();
        if (!json.success || json.data.user.role !== "employee") {
          router.push("/login");
          return;
        }

        setUser(json.data.user);
        setActiveCycle(json.data.activeCycle);
        setPendingAssessment(json.data.pendingAssessment);
        setCurrentAttempt(json.data.currentAttempt);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  // Historical records matching the Stitch design
  const defaultCertificates: CertificateItem[] = [
    {
      id: "cert-1",
      title: "SEBSA Internal Assessment — 2026 H1",
      badge: "Compliant",
      badgeType: "compliant",
      completedDate: "18 Apr 2026",
      idCode: "CR-26-081",
      score: "9 / 10",
      downloadUrl: "#",
    },
    {
      id: "cert-2",
      title: "SEBSA Internal Assessment — 2025 H2",
      badge: "Compliant",
      badgeType: "compliant",
      completedDate: "12 Oct 2025",
      idCode: "CR-25-419",
      score: "8 / 10",
      downloadUrl: "#",
    },
    {
      id: "cert-3",
      title: "SEBSA Internal Assessment — 2025 H1",
      badge: "Top Score (100%)",
      badgeType: "top",
      completedDate: "20 Apr 2025",
      idCode: "CR-25-102",
      score: "10 / 10",
      downloadUrl: "#",
    },
    {
      id: "cert-4",
      title: "SEBSA Internal Assessment — 2024 H2",
      badge: "Compliant",
      badgeType: "compliant",
      completedDate: "15 Oct 2024",
      idCode: "CR-24-904",
      score: "9 / 10",
      downloadUrl: "#",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fd]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#5c4cf4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading user profile...</p>
        </div>
      </div>
    );
  }

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SW";

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-gray-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-[#5c4cf4] tracking-tight">SEBSA</span>
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5c4cf4] font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
              <span className="text-xs font-medium text-gray-700 hidden sm:inline">
                {user?.email}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-800">{user?.fullName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: User Profile Card (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[26px] border border-purple-100/70 shadow-[0_10px_30px_-5px_rgba(92,76,244,0.06)] p-7 flex flex-col items-center text-center relative">
              {/* Avatar circle with online badge */}
              <div className="relative mt-2">
                <div className="w-24 h-24 rounded-full bg-[#ede9fe] text-[#5c4cf4] font-extrabold text-2xl flex items-center justify-center shadow-inner">
                  {initials}
                </div>
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white absolute bottom-1 right-1 shadow-sm" />
              </div>

              {/* Name & Title */}
              <h2 className="text-xl font-bold text-gray-900 mt-4">{user?.fullName}</h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">{user?.roleTitle}</p>

              {/* Certification Tier Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f5f3ff] text-[#5c4cf4] border border-purple-200/60">
                <Shield className="w-3.5 h-3.5" />
                {user?.tierBadge}
              </div>

              <div className="w-full my-6 border-t border-gray-100" />

              {/* Metadata Key-Value List */}
              <div className="w-full space-y-4 text-left">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Email
                  </span>
                  <p className="text-xs font-medium text-gray-800 mt-0.5 truncate">{user?.email}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                      Employee ID
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">Internal Staff</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{user?.employeeIdCode}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Department
                  </span>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{user?.department}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Date Joined
                  </span>
                  <p className="text-xs font-medium text-gray-700 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    March 15, 2021
                  </p>
                </div>
              </div>

              {/* Edit Profile Action */}
              <button
                type="button"
                onClick={() => alert("Profile edits are managed by SEBSA HR directory.")}
                className="mt-6 w-full py-2.5 border border-[#5c4cf4]/30 hover:border-[#5c4cf4] text-[#5c4cf4] hover:bg-purple-50/50 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>

              {/* Bottom Security Footer */}
              <div className="mt-6 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                <span>Authenticated SEBSA ID</span>
                <Lock className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Certificate History (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Top Card: Pending Assessment Prompt */}
            {pendingAssessment ? (
              <div className="bg-[#f5f3ff] border border-purple-200/90 rounded-[22px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white text-[#5c4cf4] border border-purple-200/60 shadow-sm flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#5c4cf4] mb-1.5 uppercase tracking-wide">
                      Action Required
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      You have an assessment pending
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 font-normal">
                      {activeCycle?.label || "2026 H2"} Knowledge Assessment is open until{" "}
                      <span className="font-semibold text-gray-800">
                        {activeCycle?.deadline || "November 30, 2026"}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <Link
                  href="/assessment"
                  className="bg-[#5c4cf4] hover:bg-[#4b3ae3] active:bg-[#402fd0] text-white font-semibold text-xs px-5 py-3 rounded-xl shadow-md shadow-purple-500/25 flex items-center justify-center gap-2 whitespace-nowrap transition-all transform hover:-translate-y-0.5 self-start sm:self-center"
                >
                  Start Assessment <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-[22px] p-6 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 mb-1">
                      Cycle Completed
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {activeCycle?.label || "2026 H2"} Assessment Submitted
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Your score: <span className="font-bold text-emerald-700">{currentAttempt?.score ?? 9} / 10</span>. Certificate has been recorded.
                    </p>
                  </div>
                </div>
                <Link
                  href="/assessment"
                  className="text-xs font-semibold text-[#5c4cf4] hover:underline"
                >
                  View Summary
                </Link>
              </div>
            )}

            {/* Bottom Card: Certificate History */}
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] p-6 sm:p-7">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Certificate History</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Verified evaluation transcripts and completion credentials
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-gray-50 border border-gray-200/60 px-3 py-1.5 rounded-xl text-[11px] font-bold text-gray-700">
                    AVG. RATING <span className="text-gray-900 ml-1">9.25 / 10</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200/60 px-3 py-1.5 rounded-xl text-[11px] font-bold text-gray-700">
                    TOTAL PASSED <span className="text-gray-900 ml-1">4</span>
                  </div>
                </div>
              </div>

              {/* Certificate Rows */}
              <div className="mt-5 space-y-3">
                {defaultCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-purple-200/70 hover:bg-purple-50/20 transition gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5c4cf4] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-gray-800">{cert.title}</h4>
                          {cert.badgeType === "top" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#5c4cf4]">
                              {cert.badge}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
                              {cert.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-300" />
                          Completed: {cert.completedDate}
                          <span className="text-gray-300">·</span>
                          ID: {cert.idCode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="bg-purple-50/80 text-[#5c4cf4] px-2.5 py-1 rounded-lg text-xs font-bold">
                        Score: {cert.score}
                      </div>
                      <button
                        onClick={() => alert(`Certificate ${cert.idCode} verified. PDF download started.`)}
                        className="text-xs font-semibold text-gray-600 hover:text-[#5c4cf4] flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-400 gap-2">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  Certificates signed cryptographically by SEBSA Evaluation Authority.
                </span>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert("Exporting all records to CSV..."); }}
                  className="font-medium text-[#5c4cf4] hover:underline flex items-center gap-1"
                >
                  Export All Records (.CSV) <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
