"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  const [attendance, setAttendance] = useState<DailyReport>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [weeklyAttendance, setWeeklyAttendance] = useState<Record<string, AttendanceData>>({});

  const getWeekDates = (date: Date): Date[] => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(weekStart, i));
    }
    return dates;
  };

  const weekDates = selectedDate ? getWeekDates(selectedDate) : getWeekDates(today);

  const [mealCounts, setMealCounts] = useState<Record<string, AttendanceData>>(
    weekDates.reduce((acc, date) => {
      acc[formatDate(date)] = { breakfast: 0, lunch: 0, dinner: 0 };
      return acc;
    }, {} as Record<string, AttendanceData>)
  );

  const updateMealCount = (date: Date, meal: string, count: number) => {
    const dateKey = formatDate(date);
    setMealCounts((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [meal]: count },
    }));
  };

  const handleCheckIn = () => {
    const updatedAttendance: Record<string, AttendanceData> = {};
    weekDates.forEach((date) => {
      const dateKey = formatDate(date);
      updatedAttendance[dateKey] = mealCounts[dateKey];
    });
    setWeeklyAttendance(updatedAttendance);
    alert("Weekly attendance updated!");
  };

  const getDailyReport = (date: Date): AttendanceData => {
    const dateKey = formatDate(date);
    return weeklyAttendance[dateKey] || { breakfast: 0, lunch: 0, dinner: 0 };
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
                    <Input
                      type="number"
                      id={`breakfast-${formatDate(date)}`}
                      className="w-24 text-center"
                      value={mealCounts[formatDate(date)]?.breakfast || 0}
                      onChange={(e) =>
                        updateMealCount(date, "breakfast", Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Lunch */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                    <label htmlFor={`lunch-${formatDate(date)}`}>Lunch:</label>
                    <Input
                      type="number"
                      id={`lunch-${formatDate(date)}`}
                      className="w-24 text-center"
                      value={mealCounts[formatDate(date)]?.lunch || 0}
                      onChange={(e) => updateMealCount(date, "lunch", Number(e.target.value))}
                    />
                  </div>

                  {/* Dinner */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                    <label htmlFor={`dinner-${formatDate(date)}`}>Dinner:</label>
                    <Input
                      type="number"
                      id={`dinner-${formatDate(date)}`}
                      className="w-24 text-center"
                      value={mealCounts[formatDate(date)]?.dinner || 0}
                      onChange={(e) =>
                        updateMealCount(date, "dinner", Number(e.target.value))
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
            <h2 className="text-xl font-semibold">Daily Report</h2>
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
                    {selectedDate ? format(selectedDate, "yyyy-MM-dd") : <span>Pick a date</span>}
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
              <div>Breakfast Attendees: {getDailyReport(selectedDate || today).breakfast}</div>
              <div>Lunch Attendees: {getDailyReport(selectedDate || today).lunch}</div>
              <div>Dinner Attendees: {getDailyReport(selectedDate || today).dinner}</div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealCheckin;
