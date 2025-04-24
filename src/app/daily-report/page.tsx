"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Chart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CalendarIcon } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"
import { getDailyReportData } from "@/lib/firebase/db";

interface AttendanceData {
  breakfast: number;
  lunch: number;
  dinner: number;
    breakfastPacked: number;
    lunchPacked: number;
    dinnerPacked: number;
}

interface DailyReport {
  [date: string]: AttendanceData;
}

const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [loading, setLoading] = useState(true);

  // Load daily report data from Firebase
  useEffect(() => {
    const fetchDailyReport = async () => {
      setLoading(true);
      try {
        const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
        const reportData = await getDailyReportData(formattedDate);
        setDailyReport({ [formattedDate]: reportData });
      } catch (error: any) {
        console.error("Error fetching daily report:", error);
        // Optionally set an error state to display a message to the user
         console.error("Error fetching daily report:", error);
        // Optionally set an error state to display a message to the user
        console.error("Error fetching daily report:", error);
        // Optionally set an error state to display a message to the user
        // Optionally set an error state to display a message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchDailyReport();
  }, [selectedDate]);

  const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
  const attendanceForSelectedDate = dailyReport[formattedDate] || { breakfast: 0, lunch: 0, dinner: 0, breakfastPacked: 0, lunchPacked: 0, dinnerPacked: 0 };

  const chartData = [
    { name: "Breakfast", value: attendanceForSelectedDate.breakfast },
    { name: "Lunch", value: attendanceForSelectedDate.lunch },
    { name: "Dinner", value: attendanceForSelectedDate.dinner },
      { name: "Breakfast Packed", value: attendanceForSelectedDate.breakfastPacked },
      { name: "Lunch Packed", value: attendanceForSelectedDate.lunchPacked },
      { name: "Dinner Packed", value: attendanceForSelectedDate.dinnerPacked },
  ];

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Daily Meal Attendance Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold">Select Date</h2>
            <Separator />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Separator />
            <h3 className="text-lg font-semibold">
              Attendance for {formattedDate}
            </h3>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
                <Card>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Table>
                      <TableCaption>
                        Meal attendance data for {formattedDate}
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Meal</TableHead>
                          <TableHead>Present</TableHead>
                            <TableHead>Packed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Breakfast</TableCell>
                          <TableCell>{attendanceForSelectedDate.breakfast}</TableCell>
                            <TableCell>{attendanceForSelectedDate.breakfastPacked}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lunch</TableCell>
                          <TableCell>{attendanceForSelectedDate.lunch}</TableCell>
                            <TableCell>{attendanceForSelectedDate.lunchPacked}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dinner</TableCell>
                          <TableCell>{attendanceForSelectedDate.dinner}</TableCell>
                            <TableCell>{attendanceForSelectedDate.dinnerPacked}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportPage;
