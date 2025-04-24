"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sun, Utensils, Moon } from 'lucide-react';
import Link from 'next/link';
import { createUserMealAttendance, getUserMealAttendance, updateUserMealAttendance } from "@/lib/firebase/db";
import { useToast } from "@/hooks/use-toast";

const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MealCheckin = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState("");
  const [mealAttendance, setMealAttendance] = useState<Record<string, { breakfast: boolean, lunch: boolean, dinner: boolean }>>({});
  const weekDates = getWeekDates(new Date());
  const { toast } = useToast();

  useEffect(() => {
    // Load username from localStorage on component mount
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const loadMealAttendance = async () => {
      if (username) {
        try {
          const attendanceData = await getUserMealAttendance(username);
          if (attendanceData) {
            setMealAttendance(attendanceData);
          } else {
            // If no data exists for the user, initialize it in the database
            const initialAttendance = weekDates.reduce((acc, date) => {
              acc[formatDate(date)] = { breakfast: false, lunch: false, dinner: false };
              return acc;
            }, {} as Record<string, { breakfast: boolean, lunch: boolean, dinner: boolean }>);

            await createUserMealAttendance(username, initialAttendance);
            setMealAttendance(initialAttendance);
          }
        } catch (error: any) {
          console.error("Error loading meal attendance:", error);
          toast({
            title: "Error",
            description: `Failed to load meal attendance. ${error.message || 'Please check your connection.'}`,
          });
        }
      }
    };

    loadMealAttendance();
  }, [username, weekDates, toast]);

  const handleSignIn = () => {
    if (inputUsername.trim() !== "") {
      setUsername(inputUsername);
      localStorage.setItem("username", inputUsername);
    }
  };

  const handleSignOut = () => {
    setUsername(null);
    localStorage.removeItem("username");
    setMealAttendance({}); // Clear local state on sign-out
  };

  function getWeekDates(date: Date): Date[] {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  }

  const updateMealAttendance = async (date: Date, meal: string, checked: boolean) => {
    if (!username) {
      toast({
        title: "Error",
        description: "Please sign in to update meal attendance.",
      });
      return;
    }

    const dateKey = formatDate(date);
    const updatedAttendance = {
      ...mealAttendance,
      [dateKey]: { ...mealAttendance[dateKey], [meal]: checked },
    };

    setMealAttendance(updatedAttendance);

    try {
      await updateUserMealAttendance(username, updatedAttendance);
      toast({
        title: "Success",
        description: `Attendance updated for ${meal} on ${dateKey}.`,
      });
    } catch (error: any) {
      console.error("Error updating meal attendance:", error);
      toast({
        title: "Error",
        description: `Failed to update attendance. ${error.message || 'Please try again later.'}`,
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
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`breakfast-${formatDate(date)}`} className="mb-1 text-center">
                      <Sun className="mr-1 inline-block" size={20} />
                      Breakfast:
                    </label>
                    <Checkbox
                      id={`breakfast-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.breakfast || false}
                      onCheckedChange={(checked) =>
                        updateMealAttendance(date, "breakfast", checked)
                      }
                      className="mx-auto"
                    />
                  </div>

                  {/* Lunch */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`lunch-${formatDate(date)}`} className="mb-1 text-center">
                      <Utensils className="mr-1 inline-block" size={20} />
                      Lunch:
                    </label>
                    <Checkbox
                      id={`lunch-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.lunch || false}
                      onCheckedChange={(checked) => updateMealAttendance(date, "lunch", checked)}
                      className="mx-auto"
                    />
                  </div>

                  {/* Dinner */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary w-32">
                    <label htmlFor={`dinner-${formatDate(date)}`} className="mb-1 text-center">
                      <Moon className="mr-1 inline-block" size={20} />
                      Dinner:
                    </label>
                    <Checkbox
                      id={`dinner-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.dinner || false}
                      onCheckedChange={(checked) =>
                        updateMealAttendance(date, "dinner", checked)
                      }
                      className="mx-auto"
                    />
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
