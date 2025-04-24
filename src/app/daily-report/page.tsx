"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, addDays } from "date-fns";
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

const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  // Dummy data for demonstration purposes
  useEffect(() => {
    // In a real application, this data would be fetched from a database or API
    const dummyData: DailyReport = {
      "2024-07-10": { breakfast: 15, lunch: 25, dinner: 30 },
      "2024-07-11": { breakfast: 18, lunch: 22, dinner: 28 },
      "2024-07-12": { breakfast: 20, lunch: 28, dinner: 35 },
    };
    setDailyReport(dummyData);
  }, []);

  const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
  const attendanceForSelectedDate = dailyReport[formattedDate] || { breakfast: 0, lunch: 0, dinner: 0 };

  const chartData = [
    { name: "Breakfast", value: attendanceForSelectedDate.breakfast },
    { name: "Lunch", value: attendanceForSelectedDate.lunch },
    { name: "Dinner", value: attendanceForSelectedDate.dinner },
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
                      <TableHead>Attendees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Breakfast</TableCell>
                      <TableCell>{attendanceForSelectedDate.breakfast}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Lunch</TableCell>
                      <TableCell>{attendanceForSelectedDate.lunch}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dinner</TableCell>
                      <TableCell>{attendanceForSelectedDate.dinner}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportPage;
