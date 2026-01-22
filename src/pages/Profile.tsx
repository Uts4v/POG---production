import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuthContext } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { TeaLeafIcon } from "@/components/ui/TeaLeafIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTimeShort } from "@/hooks/useWorkSession";
import { toast } from "sonner";
import {
  User,
  Mail,
  Briefcase,
  Award,
  Clock,
  Coffee,
  Calendar,
  TrendingUp,
  Edit3,
  Save,
  Loader2,
} from "lucide-react";

interface MonthlyStats {
  totalWorkHours: number;
  totalBreakHours: number;
  workingDays: number;
  avgDailyHours: number;
}

const Profile = () => {
  const { user, profile, loading: authLoading, updateProfile, refetchProfile } = useAuthContext();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalWorkHours: 0,
    totalBreakHours: 0,
    workingDays: 0,
    avgDailyHours: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setDesignation(profile.designation);
    }
  }, [profile]);

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      if (!user) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      try {
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const q = query(
          sessionsRef,
          where("date", ">=", startOfMonth.toISOString().split("T")[0]),
          where("date", "<=", endOfMonth.toISOString().split("T")[0]),
          orderBy("date", "desc")
        );

        const querySnapshot = await getDocs(q);
        const allSessions = querySnapshot.docs.map(doc => doc.data());
        const sessions = allSessions.filter(s => s.status === 'completed');

        if (sessions.length > 0) {
          const totalWork = sessions.reduce((acc, s) => acc + (s.totalWorkDuration || 0), 0);
          const totalBreak = sessions.reduce((acc, s) => acc + (s.totalBreakDuration || 0), 0);
          const workingDays = sessions.length;

          setMonthlyStats({
            totalWorkHours: totalWork,
            totalBreakHours: totalBreak,
            workingDays,
            avgDailyHours: workingDays > 0 ? Math.round(totalWork / workingDays) : 0,
          });
        }
      } catch (error) {
        console.error("Error fetching monthly stats:", error);
      }
    };

    fetchMonthlyStats();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      fullName,
      designation,
    });

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated! 🍃");
      setEditing(false);
      refetchProfile();
    }
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="font-display text-2xl font-semibold">Profile not found</h2>
            <p className="text-muted-foreground">We couldn't load your profile. Try refreshing your profile data.</p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => refetchProfile()} className="tea-button-primary">
                Refresh Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Go to Sign In
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <motion.div
            className="tea-card relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
              <TeaLeafIcon />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-tea-forest flex items-center justify-center text-white text-3xl font-display">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="mt-1"
                        placeholder="e.g., SEO Specialist, Developer"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="font-display text-3xl font-semibold text-foreground">
                      {profile.fullName}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {profile.email}
                      </span>
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {profile.designation}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Tea Points & Edit */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-2 text-accent">
                    <Award className="w-5 h-5" />
                    <span className="font-display text-2xl font-semibold">
                      {profile.tea_points}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Tea Points</span>
                </div>

                {editing ? (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="tea-button-primary"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Monthly Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Monthly Overview
              </h2>
              <span className="text-muted-foreground">{currentMonth}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Clock}
                label="Total Hours"
                value={formatTimeShort(monthlyStats.totalWorkHours)}
                color="primary"
              />
              <StatCard
                icon={Coffee}
                label="Break Time"
                value={formatTimeShort(monthlyStats.totalBreakHours)}
                color="accent"
              />
              <StatCard
                icon={Calendar}
                label="Working Days"
                value={monthlyStats.workingDays.toString()}
                color="primary"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg Daily"
                value={formatTimeShort(monthlyStats.avgDailyHours)}
                color="accent"
              />
            </div>
          </motion.div>

          {/* Productivity Summary */}
          <motion.div
            className="tea-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">
              Productivity Insights
            </h3>

            {monthlyStats.workingDays > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Work vs Break Ratio</span>
                    <span className="font-medium">
                      {Math.round(
                        (monthlyStats.totalWorkHours /
                          (monthlyStats.totalWorkHours + monthlyStats.totalBreakHours)) *
                          100
                      )}
                      % focused
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          (monthlyStats.totalWorkHours /
                            (monthlyStats.totalWorkHours + monthlyStats.totalBreakHours)) *
                          100
                        }%`,
                      }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  You've logged {monthlyStats.workingDays} working days this month with an
                  average of {formatTimeShort(monthlyStats.avgDailyHours)} per day. Keep up
                  the great work! 🍃
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No completed sessions this month yet. Start tracking to see your insights!
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: "primary" | "accent";
}) => (
  <motion.div
    className="tea-card text-center"
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <div
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 ${
        color === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
      }`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </motion.div>
);

export default Profile;
