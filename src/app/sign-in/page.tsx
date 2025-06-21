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

const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

interface MealAttendanceState {
  breakfast: 'present' | 'absent' | 'packed' | null;
  lunch: 'present' | 'absent' | 'packed' | null;
  dinner: 'present' | 'absent' | 'packed' | null;
}

const SignIn = () => {
  const [preloadedUsers, setPreloadedUsers] = useState<{ id: string; name: string; diet: string; centre: string; role: string}[]>([]);
  const [centreCode, setCentreCode] = useState<string | null>(null);
  const [centre, setCentre] = useState<string | null>(null);
  const [isValidCentreCode, setIsValidCentreCode] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
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
            const users = (data.users || []) as { id: string; name: string; diet: string }[];
            // Fetch the centre for each user
            const usersWithCentre = await Promise.all(
              users.map(async (user: { id: string; name: string; diet: string }) => {
                return { ...user, centre: selectedCentre }; // Assuming the centre is 'vi' for all users in this document.  Can modify as needed.
              })
            );
            setPreloadedUsers(usersWithCentre as { id: string; name: string; diet: string; centre: string; role: string }[]);
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

  const handleSignInWithPreload = async (user: { id: string; name: string; diet: string; centre: string; role: string }) => {
    if (!isValidCentreCode) {
      toast({
        title: 'Error',
        description: 'Please enter a valid centre code.',
      });
      return;

    }

    localStorage.setItem('username', user.id); // Use id instead of name
    localStorage.setItem('fullname', user.name);
    localStorage.setItem('diet', user.diet);
    localStorage.setItem('selectedCentre', user.centre);
    localStorage.setItem('role', user.role);

    try {
      // Fetch existing meal attendance, if any
      const existingUserData = await getUserMealAttendance(user.name);

      // If existing data exists, use it. Otherwise, create initial attendance.
      let initialAttendance;
      if (existingUserData && existingUserData.mealAttendance) {
        initialAttendance = existingUserData.mealAttendance;
      } else {
        initialAttendance = weekDates.reduce((acc, date) => {
          acc[formatDate(date)] = { breakfast: null, lunch: null, dinner: null };
          return acc;
        }, {} as Record<string, MealAttendanceState>);
      }

      await createUserMealAttendance(user.id, initialAttendance, user.diet || null, user.centre); // Use id instead of name

      router.push('/');
    } catch (error: any) {
      console.error('Error creating user meal attendance:', error);
      toast({
        title: 'Error',
        description: `Failed to create meal attendance. ${error.message || 'Please check your connection.'
          }`,
      });
    }
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

    verifyCentreCode();
  }, [centreCode, router]);

  useEffect(() => {
    if (selectedUsername) {
      // Check if service workers are supported and active
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_USER_ID',
          userId: selectedUsername
        });
      }
    }
  }, [selectedUsername]); // This effect runs whenever selectedUsername changes

  return (
    <>
      <div className="container mx-auto pb-10">
        <Card className="w-full max-w-md mx-auto">
          <Header centre={centre} title="Sign-In" menu={false} />
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Sign In {centre ? `to ${centre}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {preloadedUsers.length > 0 && (
              <div className="grid gap-2">
                <label htmlFor="preloaded-users">Choose User:</label>
                <Select
                  onValueChange={value => {
                    setSelectedUsername(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {preloadedUsers.map(user => (
                      <SelectItem key={user.name} value={user.name}>
                        {user.name} {user.diet ? `(${user.diet})` : ''}
 </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="centre-code">Centre Code:</label>
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
              onClick={() => {
                const selectedUser = preloadedUsers.find(u => u.name === selectedUsername);
                if (selectedUser) {
                  handleSignInWithPreload(selectedUser);
                } else {
                  toast({
                    title: 'Error',
                    description: 'Please select a user from the dropdown.',
                  });
                }
              }}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>

      </div>
      <div className="text-center text-sm mt-2">
        <Link href="/select-centre" className="text-muted-foreground hover:underline">
          Choose a different centre
        </Link>
      </div>
    </>
  );
};

export default SignIn;


