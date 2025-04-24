"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface AttendanceData {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface DailyReport {
  [date: string]: AttendanceData;
}

const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MealCheckin = () => {
  const [weeklyAttendance, setWeeklyAttendance] = useState<Record<string, AttendanceData>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  const getWeekDates = (date: Date): Date[] => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  };

  const weekDates = selectedDate ? getWeekDates(selectedDate) : getWeekDates(today);

  const [mealAttendance, setMealAttendance] = useState<Record<string, AttendanceData>>(
    weekDates.reduce((acc, date) => {
      acc[formatDate(date)] = { breakfast: false, lunch: false, dinner: false };
      return acc;
    }, {} as Record<string, AttendanceData>)
  );

  const updateMealAttendance = (date: Date, meal: string, checked: boolean) => {
    const dateKey = formatDate(date);
    setMealAttendance((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [meal]: checked },
    }));
  };

  const handleCheckIn = () => {
    const updatedAttendance: Record<string, AttendanceData> = {};
    weekDates.forEach((date) => {
      const dateKey = formatDate(date);
      updatedAttendance[dateKey] = mealAttendance[dateKey];
    });
    setWeeklyAttendance(updatedAttendance);
    alert("Weekly attendance updated!");
  };

  const getDailyReport = (date: Date): AttendanceData => {
    const dateKey = formatDate(date);
    return weeklyAttendance[dateKey] || { breakfast: false, lunch: false, dinner: false };
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Weekly Mealtime Tracker</CardTitle>
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
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                    <label htmlFor={`breakfast-${formatDate(date)}`}>Breakfast:</label>
                    <Checkbox
                      id={`breakfast-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.breakfast || false}
                      onCheckedChange={(checked) =>
                        updateMealAttendance(date, "breakfast", checked)
                      }
                    />
                  </div>

                  {/* Lunch */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                    <label htmlFor={`lunch-${formatDate(date)}`}>Lunch:</label>
                    <Checkbox
                      id={`lunch-${formatDate(date)}`}
                      checked={mealAttendance[formatDate(date)]?.lunch || false}
                      onCheckedChange={(checked) => updateMealAttendance(date, "lunch", checked)}
                    />
                  </div>

                  {/* Dinner */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                    <label htmlFor={`dinner-${formatDate(date)}`}>Dinner:</label>
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
          <Separator />
          {/* Daily Report Section */}
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold">Daily Report</h2 >
            <Separator />
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    {selectedDate ? format(selectedDate, "yyyy-MM-dd") : <span>Pick a date</span >}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabledDate={(date) => date > today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>Breakfast Attendees: {getDailyReport(selectedDate || today).breakfast ? "Yes" : "No"}</div>
              <div>Lunch Attendees: {getDailyReport(selectedDate || today).lunch ? "Yes" : "No"}</div>
              <div>Dinner Attendees: {getDailyReport(selectedDate || today).dinner ? "Yes" : "No"}</div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div >
  );
};

export default MealCheckin;
