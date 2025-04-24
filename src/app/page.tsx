"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Utensils } from 'lucide-react';
import Link from 'next/link';

interface AttendanceData {
  breakfast: number;
  lunch: number;
  dinner: number;
}

interface DailyReport {
  [date: string]: AttendanceData;
}

const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MealCheckin = () => {
  const [weeklyAttendance, setWeeklyAttendance] = useState<DailyReport>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [username, setUsername] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");

  useEffect(() => {
    // Load username from localStorage on component mount
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleSignIn = () => {
    if (inputUsername.trim() !== "") {
      setUsername(inputUsername);
      localStorage.setItem("username", inputUsername);
    }
  };

  const handleSignOut = () => {
    setUsername(null);
    localStorage.removeItem("username");
  };

  const getWeekDates = (date: Date): Date[] => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  };

  const weekDates = selectedDate ? getWeekDates(selectedDate) : getWeekDates(today);

  const [mealAttendance, setMealAttendance] = useState<Record<string, {breakfast: boolean, lunch: boolean, dinner: boolean}>>(
    weekDates.reduce((acc, date) => {
      acc[formatDate(date)] = { breakfast: false, lunch: false, dinner: false };
      return acc;
    }, {} as Record<string, {breakfast: boolean, lunch: boolean, dinner: boolean}>)
  );

  const updateMealAttendance = (date: Date, meal: string, checked: boolean) => {
    const dateKey = formatDate(date);
    setMealAttendance((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [meal]: checked },
    }));
  };

  const handleCheckIn = () => {
    if (!username) {
      alert("Please sign in to check in for meals.");
      return;
    }

    const updatedAttendance: DailyReport = { ...weeklyAttendance };

    weekDates.forEach((date) => {
      const dateKey = formatDate(date);
      const currentDayAttendance = mealAttendance[dateKey];

      // Initialize attendance data for the day if it doesn't exist
      if (!updatedAttendance[dateKey]) {
        updatedAttendance[dateKey] = { breakfast: 0, lunch: 0, dinner: 0 };
      }

      // Update attendance counts based on checkbox values. Increment if checkbox is checked, decrement if unchecked
      updatedAttendance[dateKey] = {
        breakfast: currentDayAttendance.breakfast
          ? updatedAttendance[dateKey].breakfast + 1
          : updatedAttendance[dateKey].breakfast,
        lunch: currentDayAttendance.lunch
          ? updatedAttendance[dateKey].lunch + 1
          : updatedAttendance[dateKey].lunch,
        dinner: currentDayAttendance.dinner
          ? updatedAttendance[dateKey].dinner + 1
          : updatedAttendance[dateKey].dinner,
      };
    });

    setWeeklyAttendance(updatedAttendance);
    alert("Weekly attendance updated!");
  };

  if (!username) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="username">Username:</label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
              />
            </div>
            <Button onClick={handleSignIn}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
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
            <h2 className="text-xl font-semibold">Weekly Meal Check-in</h2>
            <Separator />
            {weekDates.map((date) => (
              <div key={formatDate(date)} className="mb-4">
                <h3 className="text-lg font-semibold">{format(date, "EEEE, yyyy-MM-dd")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Breakfast */}
                  <div className="flex items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`breakfast-${formatDate(date)}`} className="mr-2">
                      <Sun className="mr-1" size={20} />
                      Breakfast:
                    </label>
                    <Checkbox
                      id={`breakfast-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.breakfast || false}
                      onCheckedChange={(checked) =>
                        updateMealAttendance(date, "breakfast", checked)
                      }
                    />
                  </div>

                  {/* Lunch */}
                   <div className="flex items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`lunch-${formatDate(date)}`}  className="mr-2">
                      <Utensils className="mr-1" size={20} />
                      Lunch:
                    </label>
                    <Checkbox
                      id={`lunch-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.lunch || false}
                      onCheckedChange={(checked) => updateMealAttendance(date, "lunch", checked)}
                    />
                  </div>

                  {/* Dinner */}
                  <div className="flex items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`dinner-${formatDate(date)}`} className="mr-2">
                      <Moon className="mr-1" size={20} />
                      Dinner:
                    </label>
                    <Checkbox
                      id={`dinner-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.dinner || false}
                      onCheckedChange={(checked) =>
                        updateMealAttendance(date, "dinner", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-center">
              <Button onClick={handleCheckIn} className="bg-primary text-primary-foreground hover:bg-primary/80 mr-2">
                Check In Weekly Attendance
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealCheckin;
