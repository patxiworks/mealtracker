
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  createUserMealAttendance,
  getUserMealAttendance,
} from '@/lib/firebase/db';
import { useToast } from '@/hooks/use-toast';
import {
  format, startOfWeek, addDays, addWeeks
} from 'date-fns';
import Link from 'next/link';
import { Header } from "@/components/header";
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

interface MealAttendanceState {
  breakfast: 'present' | 'absent' | 'packed' | null;
  lunch: 'present' | 'absent' | 'packed' | null;
  dinner: 'present' | 'absent' | 'packed' | null;
}

// Define a more detailed user type
interface CentreUser {
  id: string;
  name: string;
  diet: string;
  centre: string;
  role: 'admin' | 'rs';
  pwd?: string; // Password is optional
}

const SignIn = () => {
  // Use the new CentreUser type
  const [preloadedUsers, setPreloadedUsers] = useState<CentreUser[]>([]);
  const [centreCode, setCentreCode] = useState<string | null>(null);
  const [centre, setCentre] = useState<string | null>(null);
  const [isValidCentreCode, setIsValidCentreCode] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<CentreUser | null>(null); // State for the full user object
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  useEffect(() => {
    // Load selected centre from localStorage
    const selectedCentre = localStorage.getItem('selectedCentre');
    const centreName = localStorage.getItem('ctrName');
    setCentre(centreName);
    if (!selectedCentre) {
      router.push('/select-centre'); // Redirect to centre selection page
    } else {
      // Load preloaded users from Firebase based on selected centre
      const fetchUsers = async () => {
        try {
          const docRef = doc(db, 'centres', selectedCentre);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            // Cast to a more specific type including role and pwd
            const users = (data.users || []) as { id: string; name: string; diet: string; role: 'admin' | 'rs'; pwd?: string }[];
            
            const usersWithCentre = users.map(user => ({
              ...user,
              centre: selectedCentre,
            }));
            
            setPreloadedUsers(usersWithCentre);
          } else {
            console.log('No such document!');
            setPreloadedUsers([]);
          }
        } catch (error) {
          console.error('Error fetching users:', error);
          setPreloadedUsers([]);
        }
      };

      fetchUsers();

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const dates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        dates.push(addDays(weekStart, i));
      }
      setWeekDates(dates);
    }
  }, [router]);

  const handleSignInWithPreload = async (user: CentreUser) => {
    localStorage.setItem('username', user.id);
    localStorage.setItem('fullname', user.name);
    localStorage.setItem('diet', user.diet);
    localStorage.setItem('selectedCentre', user.centre);
    localStorage.setItem('role', user.role);

    try {
      const existingUserData = await getUserMealAttendance(user.id);
      let initialAttendance;
      if (existingUserData && existingUserData.mealAttendance) {
        initialAttendance = existingUserData.mealAttendance;
      } else {
        initialAttendance = weekDates.reduce((acc, date) => {
          acc[formatDate(date)] = { breakfast: null, lunch: null, dinner: null };
          return acc;
        }, {} as Record<string, MealAttendanceState>);
      }
      await createUserMealAttendance(user.id, initialAttendance, user.diet || null, user.centre);
      router.push('/');
    } catch (error: any) {
      console.error('Error creating user meal attendance:', error);
      toast({
        title: 'Error',
        description: `Failed to create meal attendance. ${error.message || 'Please check your connection.'}`,
        variant: 'destructive',
      });
    }
  };

  const handleSignInClick = () => {
    if (!isValidCentreCode) {
      toast({ title: 'Error', description: 'Please enter a valid centre code.', variant: 'destructive' });
      return;
    }
    if (!selectedUser) {
      toast({ title: 'Error', description: 'Please select a user.', variant: 'destructive' });
      return;
    }

    if (selectedUser.role === 'admin') {
      setPasswordError(''); // Clear previous errors
      setShowPasswordModal(true);
    } else {
      handleSignInWithPreload(selectedUser);
    }
  };

  const handleVerifyPassword = () => {
    if (!selectedUser) return;
    setIsVerifying(true);
    setPasswordError(''); // Clear error on new attempt

    // This is a simplified check. In a real app, this should be an async call to a backend.
    if (adminPassword === selectedUser.pwd) {
      toast({ title: 'Success', description: 'Password verified.' });
      setShowPasswordModal(false);
      handleSignInWithPreload(selectedUser);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
    setIsVerifying(false);
  };

  useEffect(() => {
    const verifyCentreCode = async () => {
      const selectedCentre = localStorage.getItem('selectedCentre');
      if (selectedCentre) {
        try {
          const docRef = doc(db, 'centres', selectedCentre);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const correctCode = data.code;
            setIsValidCentreCode(centreCode === correctCode);
          } else {
            console.log('No such document!');
            setIsValidCentreCode(false);
          }
        } catch (error) {
          console.error('Error fetching centre code:', error);
          setIsValidCentreCode(false);
        }
      } else {
        setIsValidCentreCode(false);
        router.push('/select-centre');
      }
    };

    if (centreCode) {
        verifyCentreCode();
    } else {
        setIsValidCentreCode(false);
    }
  }, [centreCode, router]);
  
  useEffect(() => {
    if (selectedUsername) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_USER_ID',
          userId: selectedUsername
        });
      }
    }
  }, [selectedUsername]);

  return (
    <>
      <div className="container mx-auto pb-10">
        <Card className="w-full max-w-md mx-auto">
          <Header centre={centre} title="Sign-In" menu={false} />
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Sign in {centre ? `to ${centre}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {preloadedUsers.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="preloaded-users">Choose User:</Label>
                <Select
                  onValueChange={value => {
                    const user = preloadedUsers.find(u => u.name === value) || null;
                    setSelectedUsername(value);
                    setSelectedUser(user);
                  }}
                >
                  <SelectTrigger id="preloaded-users" className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {preloadedUsers.sort((a,b) => a.name.localeCompare(b.name)).map(user => (
                      <SelectItem key={user.id} value={user.name}>
                        {user.name} {user.diet ? `(${user.diet})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="centre-code">Centre Code:</Label>
              <Input
                id="centre-code"
                placeholder="Enter centre code"
                type="password"
                onChange={e => setCentreCode(e.target.value)}
              />
              {!isValidCentreCode && centreCode && (
                <p className="text-red-500 text-sm">Invalid centre code</p>
              )}
            </div>
            <Button
              disabled={!isValidCentreCode || !selectedUsername}
              onClick={handleSignInClick}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>

      {showPasswordModal && selectedUser && (
         <AlertDialog open={showPasswordModal} onOpenChange={(open) => {
            if (!open) {
                // Reset state when modal is closed
                setAdminPassword('');
                setPasswordError('');
            }
            setShowPasswordModal(open);
         }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Admin Verification</AlertDialogTitle>
                <AlertDialogDescription>
                  Please enter the password for {selectedUser.name} to continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 py-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    autoFocus
                  />
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleVerifyPassword} disabled={isVerifying || !adminPassword}>
                  {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Sign In
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      )}

      <div className="text-center text-sm mt-2">
        <Link href="/select-centre" className="text-muted-foreground hover:underline">
          Choose a different centre
        </Link>
      </div>
    </>
  );
};

export default SignIn;
