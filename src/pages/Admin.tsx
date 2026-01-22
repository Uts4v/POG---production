import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { db } from "@/integrations/firebase/client";
import { collection, doc, deleteDoc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { Profile } from "@/integrations/firebase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Users, Shield, ShieldCheck, RefreshCw } from "lucide-react";
import { Navigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkSession {
  id: string;
  userId: string;
  date: string;
  workStartTime?: any;
  workEndTime?: any;
  totalWorkDuration: number;
  totalBreakDuration: number;
  status: "idle" | "working" | "break" | "completed";
  createdAt: any;
  updatedAt: any;
}

interface UserWithStats extends Profile {
  todayWorkTime: number;
  todayBreakTime: number;
  monthWorkTime: number;
  monthBreakTime: number;
  currentStatus: string;
  isActive: boolean;
}

const Admin = () => {
  const { user, profile, loading: authLoading } = useAuthContext();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!user || profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current date info
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Fetch all users
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      console.log("Fetched users:", usersSnapshot.docs.length);

      if (usersSnapshot.empty) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Process each user
      const usersWithStats = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = { id: userDoc.id, ...userDoc.data() } as Profile;
          
          // Initialize stats
          let todayWorkTime = 0;
          let todayBreakTime = 0;
          let monthWorkTime = 0;
          let monthBreakTime = 0;
          let currentStatus = "idle";
          let isActive = false;

          try {
            // Fetch all sessions for this user
            const sessionsRef = collection(db, "users", userData.id, "sessions");
            const sessionsSnapshot = await getDocs(sessionsRef);

            sessionsSnapshot.docs.forEach((sessionDoc) => {
              const session = { id: sessionDoc.id, ...sessionDoc.data() } as WorkSession;
              
              // Check if session is from today
              if (session.date === todayStr) {
                todayWorkTime += session.totalWorkDuration || 0;
                todayBreakTime += session.totalBreakDuration || 0;
                
                // Get current status from today's session
                if (session.status === "working" || session.status === "break") {
                  currentStatus = session.status;
                  isActive = true;
                }
              }

              // Check if session is from current month
              const sessionDate = new Date(session.date);
              if (
                sessionDate.getMonth() === currentMonth &&
                sessionDate.getFullYear() === currentYear
              ) {
                monthWorkTime += session.totalWorkDuration || 0;
                monthBreakTime += session.totalBreakDuration || 0;
              }
            });
          } catch (err) {
            console.error(`Error fetching sessions for user ${userData.id}:`, err);
          }

          return {
            ...userData,
            todayWorkTime,
            todayBreakTime,
            monthWorkTime,
            monthBreakTime,
            currentStatus,
            isActive,
          } as UserWithStats;
        })
      );

      setUsers(usersWithStats);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(`Failed to fetch users: ${err instanceof Error ? err.message : 'Unknown error'}. Please check Firestore security rules.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading, profile]);

  // Auto-refresh every 30 seconds to get live updates
  useEffect(() => {
    if (!authLoading && profile?.role === "admin") {
      const interval = setInterval(() => {
        fetchUsers();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [authLoading, profile]);

  const removeUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      // Refresh the list after deletion
      await fetchUsers();
    } catch (error) {
      console.error("Error removing user:", error);
      setError("Failed to remove user");
    }
  };

  const toggleRole = async (userId: string, currentRole: "admin" | "user") => {
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: Timestamp.now()
      });
      // Refresh the list after role change
      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      setError("Failed to update user role");
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0 || !seconds) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Authenticating...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (profile?.role !== "admin") {
    return (
      <div className="container mx-auto p-6 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button 
          onClick={fetchUsers} 
          size="sm" 
          variant="outline" 
          className="ml-auto"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
          <CardContent className="p-4">
            <p className="font-semibold text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Today's Work</TableHead>
                <TableHead>Today's Break</TableHead>
                <TableHead>This Month's Work</TableHead>
                <TableHead>This Month's Break</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <div className="font-medium">{userData.fullName}</div>
                      <div className="text-sm text-muted-foreground">{userData.email}</div>
                    </TableCell>
                    <TableCell>
                      {userData.currentStatus === "working" && (
                        <Badge variant="default" className="bg-green-600">
                          Working
                        </Badge>
                      )}
                      {userData.currentStatus === "break" && (
                        <Badge variant="destructive">
                          On Break
                        </Badge>
                      )}
                      {userData.currentStatus === "idle" && (
                        <Badge variant="secondary">
                          Offline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatTime(userData.todayWorkTime)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(userData.todayBreakTime)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatTime(userData.monthWorkTime)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(userData.monthBreakTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.role === "admin" ? "default" : "outline"}>
                        {userData.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRole(userData.id, userData.role)}
                          title={userData.role === "admin" ? "Remove admin role" : "Make admin"}
                        >
                          {userData.role === "admin" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user{" "}
                                <span className="font-semibold">{userData.fullName}</span> and all their data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeUser(userData.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;