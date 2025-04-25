"use client";

import React, {useState, useEffect} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {format, startOfWeek, addDays, addWeeks} from 'date-fns';
import {cn} from '@/lib/utils';
import {Sun, Utensils, Moon, PackageCheck, X, Check} from 'lucide-react';
import Link from 'next/link';
import {
  createUserMealAttendance,
  getUserMealAttendance,
  updateUserMealAttendance,
} from '@/lib/firebase/db';
import {useToast} from '@/hooks/use-toast';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {db} from '@/lib/firebase/firebase';
import {doc, getDoc} from 'firebase/firestore';
import {Input} from '@/components/ui/input';

const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

// Define the meal status type
type MealStatus = 'present' | 'absent' | 'packed' | null;

interface MealAttendanceState {
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
  breakfastPacked: MealStatus;
  lunchPacked: MealStatus;
  dinnerPacked: MealStatus;
}

const MealCheckin = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [mealAttendance, setMealAttendance] = useState<
    Record<string, MealAttendanceState>
  >({});
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    startOfWeek(new Date(), {weekStartsOn: 0})
  );
  const weekDates = getWeekDates(selectedWeekStart);
  const {toast} = useToast();
  const [diet, setDiet] = useState<string | null>(null);
  const [preloadedUsers, setPreloadedUsers] = useState<
    {name: string; diet: string; centre: string}[]
  >([]);
  const [centreCode, setCentreCode] = useState<string | null>(null);
  const [isValidCentreCode, setIsValidCentreCode] = useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  useEffect(() => {
    // Load username from localStorage on component mount
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    const storedDiet = localStorage.getItem('diet');
    if (storedDiet) {
      setDiet(storedDiet);
    }
  }, []);

  useEffect(() => {
    const loadMealAttendance = async () => {
      if (username) {
        try {
          const userData = await getUserMealAttendance(username);
          if (userData) {
            setMealAttendance(userData.mealAttendance);
            setDiet(userData.diet || null); // Load diet from database
          } else {
            // If no data exists for the user, initialize it in the database
            const initialAttendance = weekDates.reduce((acc, date) => {
              acc[formatDate(date)] = {breakfast: null, lunch: null, dinner: null, breakfastPacked: null, lunchPacked: null, dinnerPacked: null};
              return acc;
            }, {} as Record<string, MealAttendanceState>);

            await createUserMealAttendance(username, initialAttendance, diet || null);
            setMealAttendance(initialAttendance);
          }
        } catch (error: any) {
          console.error('Error loading meal attendance:', error);
          toast({
            title: 'Error',
            description: `Failed to load meal attendance. ${
              error.message || 'Please check your connection.'
            }`,
          });
        }
      }
    };

    loadMealAttendance();
  }, [username, weekDates, toast, diet]);

  const handleSignOut = () => {
    setUsername(null);
    localStorage.removeItem('username');
    localStorage.removeItem('diet');
    setMealAttendance({}); // Clear local state on sign-out
    setDiet(null);
  };

  function getWeekDates(startDate: Date): Date[] {
    const weekStart = startOfWeek(startDate, {weekStartsOn: 0});
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  }

  const updateMealAttendance = async (
    date: Date,
    meal: string,
    status: MealStatus
  ) => {
    if (!username) {
      toast({
        title: 'Error',
        description: 'Please sign in to update meal attendance.',
      });
      return;
    }

    const dateKey = formatDate(date);
    const updatedAttendance = {
      ...mealAttendance,
      [dateKey]: {...(mealAttendance[dateKey] || {}), [meal]: status},
    };

    setMealAttendance(updatedAttendance);

    try {
      await updateUserMealAttendance(username, updatedAttendance);
      toast({
        title: 'Success',
        description: `Attendance updated for ${meal} on ${dateKey}.`,
      });
    } catch (error: any) {
      console.error('Error updating meal attendance:', error);
      toast({
        title: 'Error',
        description: `Failed to update attendance. ${
          error.message || 'Please try again later.'
        }`,
      });
    }
  };

  const getMealStatusIcon = (date: Date, meal: string, status: MealStatus) => {
    let icon = null;
    if (status === 'present') {
      icon = <Check className="h-6 w-6 text-green-500 font-bold" />;
    } else if (status === 'absent') {
      icon = <X className="h-6 w-6 text-red-500 font-bold" />;
    } else if (status === 'packed') {
      icon = <PackageCheck className="h-6 w-6 text-blue-500 font-bold" />;
    }
    return icon;
  };

  const handleMealTimeBoxClick = (date: Date, meal: string) => {
    const dateKey = formatDate(date);
    const currentStatus = mealAttendance[dateKey]?.[meal];
    let newStatus: MealStatus = null;
    if (currentStatus === null) {
      newStatus = 'present';
    } else if (currentStatus === 'present') {
      newStatus = 'absent';
    } else if (currentStatus === 'absent') {
      newStatus = 'packed';
    } else {
      newStatus = null;
    }
    updateMealAttendance(date, meal, newStatus);
  };

  const handleWeekChange = (weekStartDate: Date) => {
    setSelectedWeekStart(weekStartDate);
  };

  useEffect(() => {
    // Load preloaded users from Firebase
    const fetchUsers = async () => {
      try {
        const docRef = doc(db, 'centres', 'vi');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const users = (data.users || []) as {name: string; diet: string}[];
          // Fetch the centre for each user
          const usersWithCentre = await Promise.all(
            users.map(async user => {
              return {...user, centre: 'vi'}; // Assuming the centre is 'vi' for all users in this document.  Can modify as needed.
            })
          );
          setPreloadedUsers(usersWithCentre as {name: string; diet: string; centre: string}[]);
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
  }, []);

  const handleSignInWithPreload = async (user: {
    name: string;
    diet: string;
    centre: string;
  }) => {
    if (!isValidCentreCode) {
      toast({
        title: 'Error',
        description: 'Please enter a valid centre code.',
      });
      return;
    }

    setUsername(user.name);
    localStorage.setItem('username', user.name);
    localStorage.setItem('diet', user.diet);
    setDiet(user.diet);

    try {
      const initialAttendance = weekDates.reduce((acc, date) => {
        acc[formatDate(date)] = {breakfast: null, lunch: null, dinner: null, breakfastPacked: null, lunchPacked: null, dinnerPacked: null};
        return acc;
      }, {} as Record<string, MealAttendanceState>);

      await createUserMealAttendance(user.name, initialAttendance, user.diet || null);
      setMealAttendance(initialAttendance);
    } catch (error: any) {
      console.error('Error creating user meal attendance:', error);
      toast({
        title: 'Error',
        description: `Failed to create meal attendance. ${
          error.message || 'Please check your connection.'
        }`,
      });
    }
  };

  useEffect(() => {
    const verifyCentreCode = async () => {
      if (centreCode) {
        try {
          const docRef = doc(db, 'centres', 'vi');
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
      }
    };

    verifyCentreCode();
  }, [centreCode]);

  if (!username) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Sign In</CardTitle>
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
                    <SelectValue placeholder="Select a preloaded user" />
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
    );
  }

  const weekOptions = Array.from({length: 4}, (_, i) => {
    // Show current week and next 3 weeks
    const weekStart = addWeeks(new Date(), i);
    const start = startOfWeek(weekStart, {weekStartsOn: 0});
    const end = addDays(start, 6);
    return {
      start,
      label: `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`,
    };
  });

  const initialWeekOption = weekOptions.find(week =>
    format(week.start, 'yyyy-MM-dd') === format(selectedWeekStart, 'yyyy-MM-dd')
  ) || weekOptions[0];

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Weekly Mealtime Tracker</CardTitle>
            <div className="flex gap-4 items-center">
              <Link href="/daily-report">
                <Button variant="secondary">View Daily Report</Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out ({username})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Meal Check-in Section */}
          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              {/*<h4 className="text-xl font-semibold">Mark your attendance to meals</h4>*/}
              <Select onValueChange={value => handleWeekChange(new Date(value))}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder={initialWeekOption.label} />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(week => (
                    <SelectItem key={week.start} value={week.start.toISOString()}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />

            <div className="grid grid-cols-3 gap-4 my-8">
              {/* Header Row for Meal Icons */}
              <div></div> {/* Empty cell for date column */}
              <div className="flex flex-col items-center">
                <Sun className="mr-1 inline-block" size={20} />
              </div>
              <div className="flex flex-col items-center">
                <Utensils className="mr-1 inline-block" size={20} />
              </div>
              <div className="flex flex-col items-center">
                <Moon className="mr-1 inline-block" size={20} />
              </div>

              {weekDates.map(date => (
                <React.Fragment key={formatDate(date)}>
                {/*<div className="text-lg font-semibold">{format(date, 'EEEE, MMM dd, yyyy')}</div>*/}
                <div>
                  <div className="font-semibold">{format(date, 'EEEE')}</div>
                  <div className="text-sm">
                    {format(date, 'MMM dd, yyyy')}
                  </div>
                </div>

                {/* Breakfast */}
                <div
                  className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                  onClick={() => handleMealTimeBoxClick(date, 'breakfast')}
                >
                  {getMealStatusIcon(date, 'breakfast', mealAttendance[formatDate(date)]?.breakfast)}
                </div>

                {/* Lunch */}
                <div
                  className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                  onClick={() => handleMealTimeBoxClick(date, 'lunch')}
                >
                  {getMealStatusIcon(date, 'lunch', mealAttendance[formatDate(date)]?.lunch)}
                </div>

                {/* Dinner */}
                <div
                  className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                  onClick={() => handleMealTimeBoxClick(date, 'dinner')}
                >
                  {getMealStatusIcon(date, 'dinner', mealAttendance[formatDate(date)]?.dinner)}
                </div>
              </React.Fragment>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealCheckin;
