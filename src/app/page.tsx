
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format, startOfWeek, addDays, addWeeks, eachDayOfInterval, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, LoaderPinwheel, CalendarCheck2, NotepadText, MessageCircleMore, LogOut, Sun, Utensils, Moon, PackageCheck, X, Check, AlarmClockMinus } from 'lucide-react';
import Link from 'next/link';
import {
  createUserMealAttendance,
  getUserMealAttendance,
  updateUserMealAttendance,
} from '@/lib/firebase/db';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/ui/logo';
import { registerForPushNotifications } from '@/lib/utils';
import useFCM from '@/hooks/use-fcm';

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
type MealStatus = 'present' | 'absent' | 'packed' | 'late' | null;

interface MealAttendanceState {
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
}

const MealCheckin = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [fullname, setFullname] = useState<string | null>(null);
  const [centre, setCentre] = useState<string | null>(null);
  const [mealAttendance, setMealAttendance] = useState<
    Record<string, MealAttendanceState>
  >({});
  const [temporaryMealAttendance, setTemporaryMealAttendance] = useState<
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
  const [mealChanged, setMealChanged] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({}); // Track loading state per meal box
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applyAllStatus, setApplyAllStatus] = useState<MealStatus | null>(null); // New state for applying status to all meals
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [openSelects, setOpenSelects] = useState<Record<string, boolean>>({});
  const [isLongPress, setIsLongPress] = useState(false);

  const mealStatusIcons = {
    'present': <Check className="h-6 w-6 text-green-500 font-bold" />,
    'absent': <X className="h-6 w-6 text-red-500 font-bold" />,
    'packed': <PackageCheck className="h-6 w-6 text-blue-500 font-bold" />,
    'late': <AlarmClockMinus className="h-6 w-6 text-amber-500 font-bold" />,
  };

  // useEffect(() => {
  //     // Request notification permission from the user
  //     if (typeof window !== 'undefined' && 'Notification' in window) {
  //         Notification.requestPermission().then(permission => {
  //             if (permission === 'granted') {
  //                 console.log('Notification permission granted.');
  //                 registerForPushNotifications()
  //             } else {
  //                 console.log('Notification permission denied.');
  //                 console.log(permission)
  //             }
  //         });
  //     } 
      
  // }, [username]);

  useFCM(username);

  // Check if meal attendance has changed
  useEffect(() => {
    setMealChanged(
      hasMealAttendanceChanged(mealAttendance, temporaryMealAttendance)
    )
  }, [temporaryMealAttendance]);
  
  useEffect(() => {
    // Check if a centre is selected
    const selectedCentre = localStorage.getItem('selectedCentre');
    const centreName = localStorage.getItem('ctrName');
    setCentre(centreName);
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
    const storedFullname = localStorage.getItem('fullname');
    if (storedUsername) {
      setUsername(storedUsername);
      setFullname(storedFullname);
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
            setTemporaryMealAttendance(userData.mealAttendance)
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
  }, [username, isRouteInitialized]); // Add isRouteInitialized dependency

  const handleMealStatusChange = (date: Date, meal: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    const dateKey = formatDateForKey(date);
    const newStatus: MealStatus = value === 'None' ? null : value as MealStatus; // Handle 'None' option
    console.log(newStatus)
    // Update the temporary state with the selected value from the dropdown
    setTemporaryMealAttendance(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { breakfast: null, lunch: null, dinner: null }),
        [meal]: newStatus
      },
    }));
    // Close the dropdown after selection
    setOpenSelects(prev => ({
      ...prev,
      [`${dateKey}-${meal}`]: false
    }));
    // Note: The actual database update will happen when the user clicks the "Save for this week" button.
    // The temporary state is updated here to reflect the selection immediately in the UI.
  };

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
    //setIsUpdating(prev => ({ ...prev, [mealBoxKey]: true }));

    // Calculate the state *as it would be after the update*
    // This object will be used both for the DB update and the local state update if successful
    const attendanceForDbUpdate = {
      ...temporaryMealAttendance,
      [dateKey]: {
        ...(temporaryMealAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null }),
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
    // Check if status is null or undefined before accessing mealStatusIcons
    if (status === null || status === undefined) {
      return null;
    }
    return mealStatusIcons[status];
  };

  const handleMealTimeBoxClick = (date: Date, meal: 'breakfast' | 'lunch' | 'dinner') => {
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
    const mealBoxKey = `${dateKey}-${meal}`;
  
    // Prevent clicking if already updating (this is for the final save, but good to keep)
    if (isUpdating[mealBoxKey]) {
      return;
    }
    
    // Use the temporary state
    const currentStatus = temporaryMealAttendance[dateKey]?.[meal];
    //let newStatus: MealStatus = null;
    const statusOrder: MealStatus[] = ['present', 'absent', 'packed', 'late', null];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    if (currentStatus === null) {
      newStatus = 'present';
    // } else if (currentStatus === 'present') {
    //   newStatus = 'absent';
    // } else if (currentStatus === 'absent') {
    //   newStatus = 'packed';
    // } else {
    //   newStatus = null; // Cycle back to null
    }
    
    // Update the temporary state
    setTemporaryMealAttendance(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { breakfast: null, lunch: null, dinner: null }),
        [meal]: newStatus
      },
    }));

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

  // Function to handle long press start
  const handleTouchStart = (event: React.TouchEvent, dateKey: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    setIsLongPress(false); // Assume it's not a long press initially
    // Prevent the default touch action (like scrolling)
    // Clear any existing timer to prevent multiple timers running
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    // Start a timer for the long press duration (e.g., 500ms)
    const timer = setTimeout(() => {
      setIsLongPress(true); // Mark as long press if timer completes
      // This code runs if the touch is held for the long press duration
      setOpenSelects(prev => ({ ...prev, [`${dateKey}-${meal}`]: true }));
    }, 500); // Adjust long press duration as needed (in milliseconds)
    setLongPressTimer(timer);
  };
  // Function to handle touch end
  const handleTouchEnd = () => {
    // Clear the timer when the touch ends (quickly or after long press)
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null); // Reset the timer state
    }
  };
  // Function to handle opening/closing the select
  const handleOpenChange = (open: boolean, dateKey: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
      // We control the open state programmatically based on long press,
      // so we only update our internal state when the select's open state changes.
      // This prevents the select from opening on a short tap.
      setOpenSelects(prev => ({ ...prev, [`${dateKey}-${meal}`]: open }));
  };
  // When using programmatically controlled open state, we need to add
  // onTouchStart and onTouchEnd to the SelectTrigger. We also need to
  // handle the onOpenChange event to update our state and ensure the select
  // behaves correctly after the long press opens it.
  const getSelectTriggerProps = (dateKey: string, meal: 'breakfast' | 'lunch' | 'dinner') => ({
      //className: "w-full h-[50px] flex items-center justify-center touch-manipulation",
      //onMouseDown: (e: React.MouseEvent) => handleTouchStart(e, dateKey, meal),
      //onMouseUp: handleTouchEnd,
      //onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, dateKey, meal),
      //onTouchEnd: handleTouchEnd,
      className: "w-full h-[50px] flex items-center justify-center touch-manipulation opacity-0", // Made trigger invisible
      tabIndex: -1, // Prevent focus on the hidden trigger
      //onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (!isSaving) {console.log('clicked');handleMealTimeBoxClick(new Date(dateKey), meal);} },
  });


  if (!username && isRouteInitialized) { // Render loading or nothing until initialization and user check is done
      return null; // Or a loading spinner
  }

  const hasMealAttendanceChanged = (
    original: Record<string, MealAttendanceState>,
    temporary: Record<string, MealAttendanceState>
  ): boolean => {
    // Get all date keys from both objects
    const originalDates = Object.keys(original);
    const temporaryDates = Object.keys(temporary);
  
    // If the number of dates is different, they have changed
    if (originalDates.length !== temporaryDates.length) {
      return true;
    }
  
    // Check each date and each meal within that date
    for (const dateKey of originalDates) {
      const originalDay = original[dateKey] || { breakfast: null, lunch: null, dinner: null };
      const temporaryDay = temporary[dateKey] || { breakfast: null, lunch: null, dinner: null };
  
      // Check if the meal attendance for any meal is different
      if (
        originalDay.breakfast !== temporaryDay.breakfast ||
        originalDay.lunch !== temporaryDay.lunch ||
        originalDay.dinner !== temporaryDay.dinner
      ) {
        return true; // Found a difference
      }
    }
  
    // If no differences were found, the objects are considered the same for our purpose
    return false;
  };

  const handleSaveWeek = async () => {
    if (!username) {
      console.error('Attempted to save without a username.');
      toast({
        title: 'Error',
        description: 'Please sign in to save your meal attendance.',
        variant: 'destructive',
      });
      return; // Stop the function if no username is found
    }

    setIsSaving(true);
  
    try {
      const dates = eachDayOfInterval({ start: startOfWeek(selectedWeekStart), end: endOfWeek(selectedWeekStart) });
      for (const date of dates) {
        const dateKey = formatDateForKey(date);
        const originalDayAttendance = mealAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null };
        const temporaryDayAttendance = temporaryMealAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null };
        // Check if there are any changes for this day
        if (
          originalDayAttendance.breakfast !== temporaryDayAttendance.breakfast ||
          originalDayAttendance.lunch !== temporaryDayAttendance.lunch ||
          originalDayAttendance.dinner !== temporaryDayAttendance.dinner
        ) {
          // If there are changes, iterate through the meals
          for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
            if (originalDayAttendance[meal] !== temporaryDayAttendance[meal]) {
              const mealBoxKey = `${dateKey}-${meal}`;
              const newStatus = temporaryDayAttendance[meal];
              // Call the update function for each changed meal
              await updateMealAttendanceInDb({ date, meal, status: newStatus, dateKey, username, mealBoxKey });
            }
          }
        }
      }
      // If all updates are successful, update the main mealAttendance state
    // This assumes temporaryMealAttendance holds the desired final state
    setMealAttendance(temporaryMealAttendance);
    setMealChanged(false);

    toast({
      title: 'Success',
      description: 'Meal attendance updated for the week.',
    });
  } catch (error) {
    console.error('Error saving meal attendance:', error);
    toast({
      title: 'Error',
      description: 'Failed to update meal attendance. Please try again.',
      variant: 'destructive', // Assuming your toast component supports variants
    });
  } finally {
    setIsSaving(false); // Always set loading state to false
  }
}

const handleApplyAllChange = (value: string) => {
  const newStatus: MealStatus | null = value === 'None' ? null : value as MealStatus;
  setApplyAllStatus(newStatus); // Update the state for the dropdown
  // Iterate through all days of the week and all meal types
  const newTemporaryAttendance = { ...temporaryMealAttendance };
  weekDates.forEach(date => {
    if (date > new Date()) { // only for future dates
      const dateKey = formatDateForKey(date);
      newTemporaryAttendance[dateKey] = {
        ...(newTemporaryAttendance[dateKey] || { breakfast: null, lunch: null, dinner: null }),
        breakfast: newStatus,
        lunch: newStatus,
        dinner: newStatus,
      };
    }
  });
  // Update the temporary meal attendance state
  setTemporaryMealAttendance(newTemporaryAttendance);
  // Optionally reset the applyAllStatus dropdown after applying
  // setApplyAllStatus(null); // Or set it to a placeholder value
};

const selectOptions = (
  <SelectContent className="w-fit">
    <SelectItem value="present" className="justify-center" onClick={(e) => e.stopPropagation()}>{mealStatusIcons["present"]}</SelectItem>
    <SelectItem value="absent" className="justify-center" onClick={(e) => e.stopPropagation()}>{mealStatusIcons["absent"]}</SelectItem>
    <SelectItem value="packed" className="justify-center" onClick={(e) => e.stopPropagation()}>{mealStatusIcons["packed"]}</SelectItem>
    <SelectItem value="late" className="justify-center" onClick={(e) => e.stopPropagation()}>{mealStatusIcons["late"]}</SelectItem>
    <SelectItem value="None" className="justify-center" onClick={(e) => e.stopPropagation()}></SelectItem> {/* Option for null/unset */}
  </SelectContent>
)

  return (
      <div className="container mx-auto py-0">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="px-4 py-4 sm:px-6 bg-[#4864c3]">
            <div className="flex justify-between items-center">
              <Logo centre={centre} title="" />
              <div className="flex gap-4 items-center">
                <Link href="/daily-report">
                  <Button variant="secondary" className="px-2 h-8">
                    <NotepadText size={10} />
                  </Button>
                </Link>
                <Link href="/chats">
                  <Button variant="secondary" className="px-2 h-8">
                    <MessageCircleMore size={10} />
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
                <LoaderPinwheel className="h-8 w-8 animate-spin text-[#4864c3]" />
            </div>
            ) : (
            <section className="grid gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm text-muted-foreground">Welcome, {fullname?.split(" ")[0]}</h4>
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

                      {(['breakfast', 'lunch', 'dinner'] as const).map((meal: 'breakfast' | 'lunch' | 'dinner') => (
                        <div 
                        key={meal}
                        className="relative"
                        onMouseDown={(e) => handleTouchStart(e as any, dateKey, meal)} // Added handlers for long press
                        onTouchStart={(e) => handleTouchStart(e, dateKey, meal)}
                        onTouchEnd={handleTouchEnd}
                        onMouseUp={handleTouchEnd}
                        onClick={() => {isSaving ? null : handleMealTimeBoxClick(date, meal)}}
                      >
                        <div
                          className={cn(
                            "z-10 flex h-[50px] items-center justify-center p-4 rounded-lg bg-secondary hover:bg-accent cursor-pointer",
                            isUpdating[`${dateKey}-${meal}`] && "opacity-50 cursor-not-allowed" // Add loading style
                          )}
                        >
                          {isUpdating[`${dateKey}-${meal}`]
                            ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div> // Simple spinner
                            : getMealStatusIcon(date, meal, temporaryMealAttendance[dateKey]?.[meal])
                          }
                        </div>

                        {/* Options Dropdown */}
                        {date < new Date
                        ? ''
                        : <div className="absolute z-0 top-0 left-0 w-[100%] h-[100%]">
                          <Select
                            open={openSelects[`${dateKey}-${meal}`] || false}
                            onOpenChange={(open) => handleOpenChange(open, dateKey, meal)}
                            value={temporaryMealAttendance[dateKey]?.[meal] || ''}
                            //onValueChange={(value: MealStatus) => handleMealStatusChange(date, meal, value)}
                            onValueChange={(value: string) => handleMealStatusChange(date, meal, value)}
                          >
                            <SelectTrigger 
                              {...getSelectTriggerProps(dateKey, meal)} 
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" 
                              style={{ pointerEvents: 'none' }}
                              
                            >
                              {isUpdating[`${dateKey}-${meal}`] ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                getMealStatusIcon(date, meal, temporaryMealAttendance[dateKey]?.[meal])
                              )}
                            </SelectTrigger>
                            {selectOptions}
                          </Select>
                        </div>
                        }
                      </div>
                      ))}
                      
                    </React.Fragment>
                   );
                })}
              </div>
              {/* Apply to All Dropdown */}
              <div className="flex justify-end items-center mt-4">
                <span className="px-2">Apply to all for this week:</span>
                <Select onValueChange={handleApplyAllChange} value={applyAllStatus || ''}>
                  <SelectTrigger className="w-auto max-w-xs">
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">{mealStatusIcons["present"]}</SelectItem>
                    <SelectItem value="absent">{mealStatusIcons["absent"]}</SelectItem>
                    <SelectItem value="packed">{mealStatusIcons["packed"]}</SelectItem>
                    <SelectItem value="late">{mealStatusIcons["late"]}</SelectItem>
                    <SelectItem value="None">None</SelectItem> {/* Option for null/unset */}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSaveWeek} 
                className={`flex h-12 mt-0 p-2 self-end justify-center items-center w-full ${mealChanged ? 'bg-[#f36767]' : 'bg-[#4864c3]'} font-semibold text-lg`}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-black" />
                    Saving...
                  </>
                ) : (
                  'Save for this week'
                )}
              </Button>
            </section>
            )}
          </CardContent>
        </Card>
      </div>         
  );
};

export default MealCheckin;

