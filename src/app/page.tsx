'use client';

import {useState, useEffect} from 'react';
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
import { db } from "@/lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

const formatDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

// Define the meal status type
type MealStatus = 'present' | 'absent' | 'packed' | null;

interface MealAttendanceState {
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
}

const MealCheckin = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [mealAttendance, setMealAttendance] = useState<
    Record<string, MealAttendanceState>
  >({});
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekDates = getWeekDates(selectedWeekStart);
  const {toast} = useToast();
    const [diet, setDiet] = useState<string | null>(null);
    const [preloadedUsers, setPreloadedUsers] = useState<{ name: string; diet: string }[]>([]);

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
              acc[formatDate(date)] = {breakfast: null, lunch: null, dinner: null};
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
      icon = <Check className="h-5 w-5 text-green-500" />;
    } else if (status === 'absent') {
      icon = <X className="h-5 w-5 text-red-500" />;
    } else if (status === 'packed') {
      icon = <PackageCheck className="h-5 w-5 text-blue-500" />;
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
                const docRef = doc(db, "centres", "vi");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const users = (data.users || []) as { name: string; diet: string }[];
                    setPreloadedUsers(users);
                } else {
                    console.log("No such document!");
                    setPreloadedUsers([]);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
                setPreloadedUsers([]);
            }
        };

        fetchUsers();
    }, []);

    const handleSignInWithPreload = async (user: { name: string; diet: string }) => {
        setUsername(user.name);
        localStorage.setItem('username', user.name);
        localStorage.setItem('diet', user.diet);
        setDiet(user.diet);

        try {
            const initialAttendance = weekDates.reduce((acc, date) => {
                acc[formatDate(date)] = { breakfast: null, lunch: null, dinner: null };
                return acc;
            }, {} as Record<string, MealAttendanceState>);

            await createUserMealAttendance(user.name, initialAttendance, user.diet || null);
            setMealAttendance(initialAttendance);
        } catch (error: any) {
            console.error('Error creating user meal attendance:', error);
            toast({
                title: 'Error',
                description: `Failed to create meal attendance. ${error.message || 'Please check your connection.'}`,
            });
        }
    };

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
                <Select onValueChange={(value) => {
                  const selectedUser = preloadedUsers.find(u => u.name === value);
                  if (selectedUser) {
                    handleSignInWithPreload(selectedUser);
                  }
                }}>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekOptions = Array.from({ length: 4 }, (_, i) => { // Show current week and next 3 weeks
    const weekStart = addWeeks(new Date(), i);
    const start = startOfWeek(weekStart, { weekStartsOn: 0 });
    const end = addDays(start, 6);
    return {
      start,
      label: `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`,
    };
  });

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
                  <h4 className="text-xl font-semibold">Mark your attendance to meals</h4>
                  <Select onValueChange={(value) => handleWeekChange(new Date(value))}>
                      <SelectTrigger className="w-[280px]">
                          <SelectValue placeholder={format(selectedWeekStart, 'MMM dd, yyyy')}/>
                      </SelectTrigger>
                      <SelectContent>
                          {weekOptions.map((week) => (
                              <SelectItem key={week.start} value={week.start.toISOString()}>
                                  {week.label}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            <Separator />
            {weekDates.map(date => (
              <div key={formatDate(date)} className="mb-4">
                <h5 className="text-lg font-semibold">{format(date, 'EEEE, MMM dd, yyyy')}</h5>
                <div className="grid grid-flow-row md:grid-cols-3 gap-4">
                  {/* Breakfast */}
                  <div
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32 hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'breakfast')}
                  >
                    <label htmlFor={`breakfast-${formatDate(date)}`} className="mb-1 text-center">
                      <Sun className="mr-1 inline-block" size={20} />
                      Breakfast:
                    </label>
                    <div>{getMealStatusIcon(date, 'breakfast', mealAttendance[formatDate(date)]?.breakfast)}</div>
                  </div>

                  {/* Lunch */}
                  <div
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32 hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'lunch')}
                  >
                    <label htmlFor={`lunch-${formatDate(date)}`} className="mb-1 text-center">
                      <Utensils className="mr-1 inline-block" size={20} />
                      Lunch:
                    </label>
                    <div>{getMealStatusIcon(date, 'lunch', mealAttendance[formatDate(date)]?.lunch)}</div>
                  </div>

                  {/* Dinner */}
                  <div
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32 hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'dinner')}
                  >
                    <label htmlFor={`dinner-${formatDate(date)}`} className="mb-1 text-center">
                      <Moon className="mr-1 inline-block" size={20} />
                      Dinner:
                    </label>
                    <div>{getMealStatusIcon(date, 'dinner', mealAttendance[formatDate(date)]?.dinner)}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealCheckin;
