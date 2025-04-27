
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarCheck2, NotepadText, LogOut, Sun, Utensils, Moon, PackageCheck, X, Check } from 'lucide-react';
import Link from 'next/link';
import {
  createUserMealAttendance,
  getUserMealAttendance,
  updateUserMealAttendance,
} from '@/lib/firebase/db';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Format date as "MMM dd, yyyy" for database keys and general storage
const formatDateForKey = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

// Format date as "MMM dd" for display in the grid
const formatDateForGridDisplay = (date: Date): string => {
  return format(date, 'MMM dd');
};

// Format date as "MMM dd, yyyy" for the week dropdown label
const formatDateForWeekDropdownLabel = (date: Date): string => {
    return format(date, 'MMM dd, yyyy');
};

// Format day of the week
const formatDayOfWeek = (date: Date): string => {
  return format(date, 'EEEE');
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
              acc[formatDateForKey(date)] = { breakfast: null, lunch: null, dinner: null };
              return acc;
            }, {} as Record<string, MealAttendanceState>);

            // Default the centre code to "vi"
            const selectedCentre = localStorage.getItem('selectedCentre') || 'vi'; // Fallback centre
            await createUserMealAttendance(username, initialAttendance, diet || null, selectedCentre);
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
  }, [username, weekDates, toast, diet]); // Removed initialWeekOption dependency

  const handleSignOut = () => {
    setUsername(null);
    localStorage.removeItem('username');
    localStorage.removeItem('diet');
    localStorage.removeItem('selectedCentre'); // Clear selected centre as well
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

    const dateKey = formatDateForKey(date);
    const updatedAttendance = {
      ...mealAttendance,
      [dateKey]: { ...(mealAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null }), [meal]: status },
    };

    setMealAttendance(updatedAttendance);

    try {
      await updateUserMealAttendance(username, updatedAttendance);
      toast({
        title: 'Success',
        description: `Attendance updated for ${meal} on ${formatDateForGridDisplay(date)}.`,
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
    const dateKey = formatDateForKey(date);
    const currentStatus = mealAttendance[dateKey]?.[meal as keyof MealAttendanceState];
    let newStatus: MealStatus = null;
    if (currentStatus === null) {
      newStatus = 'present';
    } else if (currentStatus === 'present') {
      newStatus = 'absent';
    } else if (currentStatus === 'absent') {
      newStatus = 'packed';
    } else {
      newStatus = null; // Cycle back to null from 'packed'
    }
    updateMealAttendance(date, meal, newStatus);
  };

  const handleWeekChange = (weekStartDate: Date) => {
    setSelectedWeekStart(weekStartDate);
  };

  // Generate week options on the fly
  const weekOptions = React.useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      // Show current week and next 3 weeks
      const weekStart = startOfWeek(addWeeks(new Date(), i), { weekStartsOn: 0 });
      const end = addDays(weekStart, 6);
      return {
        start: weekStart,
        // Use the new format for the label
        label: `${formatDateForWeekDropdownLabel(weekStart)} - ${formatDateForWeekDropdownLabel(end)}`,
      };
    });
  }, []); // Dependency array is empty as it calculates based on current date

  // Find the initial week option based on the selectedWeekStart
  const initialWeekOption = React.useMemo(() => {
    return weekOptions.find(week =>
      format(week.start, 'yyyy-MM-dd') === format(selectedWeekStart, 'yyyy-MM-dd')
    ) || weekOptions[0]; // Default to the first option if not found
  }, [selectedWeekStart, weekOptions]); // Depend on selectedWeekStart and the generated options

  useEffect(() => {
    if (!username && isRouteInitialized) {
      router.push('/sign-in');
    }
  }, [username, router, isRouteInitialized]);

  if (!username) {
    return null;
  }

  return (

      <div className="container mx-auto py-0">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="pt-2 pb-2 bg-[#4864c3]">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">
                <CalendarCheck2 className="inline-block" size={30} />
                <p className="inline-block ml-2 mt-2 leading-none">MealTrack</p>
              </CardTitle>
              <div className="flex gap-4 items-center">
                <Link href="/daily-report">
                  <Button variant="secondary">
                    <NotepadText size={20} />
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2">
            {/* Meal Check-in Section */}
            <section className="grid gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm text-muted-foreground">Welcome, {username}</h4>
                <Select onValueChange={value => handleWeekChange(new Date(value))} value={initialWeekOption.start.toISOString()}>
                  <SelectTrigger className="w-auto pr-4">
                    <SelectValue placeholder={initialWeekOption.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map(week => (
                      <SelectItem key={week.start.toISOString()} value={week.start.toISOString()}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />

              <div className="grid grid-cols-4 gap-4 mt-4"> {/* Added mt-4 for margin */}
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
                  <React.Fragment key={formatDateForKey(date)}>
                  <div>
                    <div className="font-semibold">{formatDayOfWeek(date)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateForGridDisplay(date)}
                    </div>
                  </div>

                  {/* Breakfast */}
                  <div
                    className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'breakfast')}
                  >
                    {getMealStatusIcon(date, 'breakfast', mealAttendance[formatDateForKey(date)]?.breakfast)}
                  </div>

                  {/* Lunch */}
                  <div
                    className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'lunch')}
                  >
                    {getMealStatusIcon(date, 'lunch', mealAttendance[formatDateForKey(date)]?.lunch)}
                  </div>

                  {/* Dinner */}
                  <div
                    className="flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer"
                    onClick={() => handleMealTimeBoxClick(date, 'dinner')}
                  >
                    {getMealStatusIcon(date, 'dinner', mealAttendance[formatDateForKey(date)]?.dinner)}
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

