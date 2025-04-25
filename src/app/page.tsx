"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Sun, Utensils, Moon, PackageCheck, X, Check } from 'lucide-react';
import Link from 'next/link';
import {
  createUserMealAttendance,
  getUserMealAttendance,
  updateUserMealAttendance,
} from '@/lib/firebase/db';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const weekDates = getWeekDates(selectedWeekStart);
  const { toast } = useToast();
  const [diet, setDiet] = useState<string | null>(null);
  const router = useRouter();
  const [isRouteInitialized, setIsRouteInitialized] = useState(false);

  useEffect(() => {
    // Check if a centre is selected
    const selectedCentre = localStorage.getItem('selectedCentre');
    if (!selectedCentre) {
      router.push('/select-centre'); // Redirect to centre selection page
    }
    setIsRouteInitialized(true);
  }, [router]);

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
              acc[formatDate(date)] = { breakfast: null, lunch: null, dinner: null };
              return acc;
            }, {} as Record<string, MealAttendanceState>);

            // Default the centre code to "vi"
            await createUserMealAttendance(username, initialAttendance, diet || null, 'vi');
            setMealAttendance(initialAttendance);
          }
        } catch (error: any) {
          console.error('Error loading meal attendance:', error);
          toast({
            title: 'Error',
            description: `Failed to load meal attendance. ${error.message || 'Please check your connection.'
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
    router.push('/select-centre'); // Redirect to centre selection page
  };

  function getWeekDates(startDate: Date): Date[] {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
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
      [dateKey]: { ...(mealAttendance[dateKey] || {}), [meal]: status },
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
        description: `Failed to update attendance. ${error.message || 'Please try again later.'
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

  const weekOptions = Array.from({ length: 4 }, (_, i) => {
    // Show current week and next 3 weeks
    const weekStart = addWeeks(new Date(), i);
    const start = startOfWeek(weekStart, { weekStartsOn: 0 });
    const end = addDays(start, 6);
    return {
      start,
      label: `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`,
    };
  });

  const initialWeekOption = weekOptions.find(week =>
    format(week.start, 'yyyy-MM-dd') === format(selectedWeekStart, 'yyyy-MM-dd')
  ) || weekOptions[0];


  useEffect(() => {
    if (!username && isRouteInitialized) {
      router.push('/sign-in');
    }
  }, [username, router, isRouteInitialized]);

  if (!username) {
    return null;
  }

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

              <div className="grid grid-cols-3 gap-4">
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
