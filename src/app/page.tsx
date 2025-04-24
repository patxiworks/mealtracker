"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
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
  const [breakfastCount, setBreakfastCount] = useState<number>(0);
  const [lunchCount, setLunchCount] = useState<number>(0);
  const [dinnerCount, setDinnerCount] = useState<number>(0);

  const handleCheckIn = (meal: string) => {
    const dateKey = formatDate(selectedDate || today);

    setAttendance((prevAttendance) => {
      const currentData = prevAttendance[dateKey] || {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
      };

      let updatedData: AttendanceData;
      switch (meal) {
        case "breakfast":
          updatedData = { ...currentData, breakfast: breakfastCount };
          break;
        case "lunch":
          updatedData = { ...currentData, lunch: lunchCount };
          break;
        case "dinner":
          updatedData = { ...currentData, dinner: dinnerCount };
          break;
        default:
          updatedData = currentData;
      }

      return {
        ...prevAttendance,
        [dateKey]: updatedData,
      };
    });
    alert(`Checked in ${breakfastCount} for breakfast, ${lunchCount} for lunch, and ${dinnerCount} for dinner on ${dateKey}!`);
  };

  const getDailyReport = (): AttendanceData => {
    const dateKey = formatDate(selectedDate || today);
    return attendance[dateKey] || { breakfast: 0, lunch: 0, dinner: 0 };
  };

  const dailyReport = getDailyReport();

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Mealtime Tracker</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Meal Check-in Section */}
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold">Meal Check-in</h2>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Breakfast */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                <label htmlFor="breakfast">Breakfast:</label>
                <Input
                  type="number"
                  id="breakfast"
                  className="w-24 text-center"
                  value={breakfastCount}
                  onChange={(e) => setBreakfastCount(Number(e.target.value))}
                />
              </div>

              {/* Lunch */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                <label htmlFor="lunch">Lunch:</label>
                <Input
                  type="number"
                  id="lunch"
                  className="w-24 text-center"
                  value={lunchCount}
                  onChange={(e) => setLunchCount(Number(e.target.value))}
                />
              </div>

              {/* Dinner */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary">
                <label htmlFor="dinner">Dinner:</label>
                <Input
                  type="number"
                  id="dinner"
                  className="w-24 text-center"
                  value={dinnerCount}
                  onChange={(e) => setDinnerCount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => handleCheckIn("breakfast")} className="bg-primary text-primary-foreground hover:bg-primary/80 mr-2">
                Check In
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
              <div>Breakfast Attendees: {dailyReport.breakfast}</div>
              <div>Lunch Attendees: {dailyReport.lunch}</div>
              <div>Dinner Attendees: {dailyReport.dinner}</div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default MealCheckin;
