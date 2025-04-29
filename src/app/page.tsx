
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, CalendarCheck2, NotepadText, LogOut, Sun, Utensils, Moon, PackageCheck, X, Check } from 'lucide-react';
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
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({}); // Track loading state per meal box
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if a centre is selected
    const selectedCentre = localStorage.getItem('selectedCentre');
    if (!selectedCentre) {
      router.push('/select-centre'); // Redirect to centre selection page
    } else {
      // Only set route initialized if centre exists
      setIsRouteInitialized(true);
    }
  }, [router]); // Only depends on router

  useEffect(() => {
    // Load username from localStorage on component mount
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else if (isRouteInitialized) { // Redirect only if route is initialized and no username
        router.push('/sign-in');
    }
    const storedDiet = localStorage.getItem('diet');
    if (storedDiet) {
      setDiet(storedDiet);
    }
  }, [isRouteInitialized, router]); // Depend on isRouteInitialized

  useEffect(() => {
    const loadMealAttendance = async () => {
      if (username && isRouteInitialized) { // Ensure route is initialized and username exists
        try {
          const userData = await getUserMealAttendance(username);
          if (userData) {
            setMealAttendance(userData.mealAttendance);
            setDiet(userData.diet || null); // Load diet from database
            setLoading(false);
          } else {
            // If no data exists for the user, initialize it in the database
            const initialAttendance = weekDates.reduce((acc, date) => {
              acc[formatDateForKey(date)] = { breakfast: null, lunch: null, dinner: null };
              return acc;
            }, {} as Record<string, MealAttendanceState>);

            const selectedCentre = localStorage.getItem('selectedCentre'); // Should exist due to earlier check
            if (selectedCentre) {
              await createUserMealAttendance(username, initialAttendance, diet || null, selectedCentre);
              setMealAttendance(initialAttendance);
            } else {
              console.error("Selected centre missing, cannot create user attendance.");
              toast({ title: 'Error', description: 'Centre information missing.' });
              // Maybe redirect back to centre selection?
            }
          }
        } catch (error: any) {
          console.error('Error loading meal attendance:', error);
          toast({
            title: 'Error',
            description: `Failed to load meal attendance. ${error.message || 'Please check your connection.'
              }`,
              variant: 'destructive',
          });
        }
      }
    };

    loadMealAttendance();
  }, [username, weekDates, toast, diet, isRouteInitialized]); // Add isRouteInitialized dependency

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

  // Async function to handle the database update and subsequent state change
  const updateMealAttendanceInDb = async (updateData: {
    date: Date;
    meal: string;
    status: MealStatus;
    dateKey: string;
    username: string;
    mealBoxKey: string; // Unique key for the meal box being updated
  }) => {
    const { date, meal, status, dateKey, username, mealBoxKey } = updateData;

    // Indicate loading for this specific meal box
    setIsUpdating(prev => ({ ...prev, [mealBoxKey]: true }));

    // Calculate the state *as it would be after the update*
    // This object will be used both for the DB update and the local state update if successful
    const attendanceForDbUpdate = {
      ...mealAttendance,
      [dateKey]: {
        ...(mealAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null }),
        [meal]: status
      },
    };

    try {
        // --- Step 1: Update Firestore ---
        await updateUserMealAttendance(username, attendanceForDbUpdate);

        // --- Step 2: Update local state ONLY if Firestore update succeeded ---
        setMealAttendance(attendanceForDbUpdate);

        // --- Step 3: Show success toast (optional, can be annoying) ---
        // toast({
        //     title: 'Success',
        //     description: `Attendance updated for ${meal} on ${formatDateForGridDisplay(date)}.`,
        //     duration: 2000, // Shorter duration for success
        // });
    } catch (error: any) {
        console.error('Error updating meal attendance:', error);
        // --- Step 4: Show error toast if Firestore update failed ---
        // Local state remains unchanged because setMealAttendance was not called
        toast({
            title: 'Error',
            description: `Failed to update attendance. ${error.message || 'Please try again later.'}`,
            variant: 'destructive',
        });
        // No state rollback needed because we didn't update it optimistically
    } finally {
        // --- Step 5: Stop loading indicator regardless of success/failure ---
        setIsUpdating(prev => ({ ...prev, [mealBoxKey]: false }));
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
    //console.log(date, new Date())
    if (date < new Date()) {
      return;
    }

    if (!username) {
      toast({
        title: 'Error',
        description: 'Please sign in to update meal attendance.',
        variant: 'destructive',
      });
      return;
    }

    const dateKey = formatDateForKey(date);
    const mealBoxKey = `${dateKey}-${meal}`; // Unique identifier for the box

    // Prevent clicking if already updating
    if (isUpdating[mealBoxKey]) {
        return;
    }

    const currentStatus = mealAttendance[dateKey]?.[meal as keyof MealAttendanceState];
    let newStatus: MealStatus = null;
    if (currentStatus === null) {
      newStatus = 'present';
    } else if (currentStatus === 'present') {
      newStatus = 'absent';
    } else if (currentStatus === 'absent') {
      newStatus = 'packed';
    } else { // currentStatus === 'packed'
      newStatus = null; // Cycle back to null
    }

    // Call the async update function
    updateMealAttendanceInDb({ date, meal, status: newStatus, dateKey, username, mealBoxKey });
    // **Crucially, do NOT call setMealAttendance here anymore.**
    // It will be called inside updateMealAttendanceInDb *after* the DB is updated.
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


  if (!username && isRouteInitialized) { // Render loading or nothing until initialization and user check is done
      return null; // Or a loading spinner
  }

  return (
      <div className="container mx-auto py-0">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="px-4 py-4 sm:px-6 bg-[#4864c3]">
            <div className="flex justify-between items-center">
              <CardTitle className="flex gap-1 text-2xl text-[#c6cfec]">
                <CalendarCheck2 className="inline-block" size={30} />
                <span className="">MealTrack</span>
              </CardTitle>
              <div className="flex gap-4 items-center">
                <Link href="/daily-report">
                  <Button variant="secondary" className="px-2 h-8">
                    <NotepadText size={10} />
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut} className="px-2 h-8">
                  <LogOut size={10} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 pb-16 sm:p-6 pt-4">
            {/* Meal Check-in Section */}
          {loading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : (
            <section className="grid gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm text-muted-foreground">Welcome, {username?.split(" ")[0]}</h4>
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

                {weekDates.map(date => {
                   const dateKey = formatDateForKey(date);
                   return (
                    <React.Fragment key={dateKey}>
                      <div>
                        <div className="font-semibold">{formatDayOfWeek(date)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateForGridDisplay(date)}
                        </div>
                      </div>

                      {/* Breakfast */}
                      <div
                        className={cn(
                          "flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer",
                          isUpdating[`${dateKey}-breakfast`] && "opacity-50 cursor-not-allowed" // Add loading style
                        )}
                        onClick={() => handleMealTimeBoxClick(date, 'breakfast')}
                      >
                        {isUpdating[`${dateKey}-breakfast`]
                          ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div> // Simple spinner
                          : getMealStatusIcon(date, 'breakfast', mealAttendance[dateKey]?.breakfast)
                        }
                      </div>

                      {/* Lunch */}
                      <div
                        className={cn(
                          "flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer",
                          isUpdating[`${dateKey}-lunch`] && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => handleMealTimeBoxClick(date, 'lunch')}
                      >
                        {isUpdating[`${dateKey}-lunch`]
                          ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
                          : getMealStatusIcon(date, 'lunch', mealAttendance[dateKey]?.lunch)
                        }
                      </div>

                      {/* Dinner */}
                      <div
                        className={cn(
                          "flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer",
                          isUpdating[`${dateKey}-dinner`] && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => handleMealTimeBoxClick(date, 'dinner')}
                      >
                        {isUpdating[`${dateKey}-dinner`]
                          ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
                          : getMealStatusIcon(date, 'dinner', mealAttendance[dateKey]?.dinner)
                        }
                      </div>
                    </React.Fragment>
                   );
                })}
              </div>
            </section>
            )}
          </CardContent>
        </Card>
      </div>         
  );
};

export default MealCheckin;

