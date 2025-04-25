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
import { CalendarIcon } from "lucide-react";

interface AttendanceData {
  breakfast: number;
  lunch: number;
  dinner: number;
}

interface DietCounts {
  [diet: string]: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

interface DailyReport {
  [date: string]: {
    attendance: AttendanceData;
    dietCountsPresent: DietCounts;
    dietCountsPacked: DietCounts;
  };
}

const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};

const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [loading, setLoading] = useState(true);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);


  useEffect(() => {
    const centre = localStorage.getItem('selectedCentre');
    setSelectedCentre(centre);
  }, []);

  // Load daily report data from Firebase
  useEffect(() => {
    const fetchDailyReport = async () => {
      setLoading(true);
      try {
        const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
        const reportData = selectedCentre ? await getDailyReportData(formattedDate, selectedCentre) : {
          attendance: { breakfast: 0, lunch: 0, dinner: 0 },
          dietCountsPresent: {},
          dietCountsPacked: {}
        };
        setDailyReport({ [formattedDate]: reportData });
      } catch (error: any) {
        console.error("Error fetching daily report:", error);
        // Optionally set an error state to display a message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchDailyReport();
  }, [selectedDate, selectedCentre]);

  const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
  const reportForSelectedDate = dailyReport[formattedDate] || {
    attendance: { breakfast: 0, lunch: 0, dinner: 0 },
    dietCountsPresent: {},
    dietCountsPacked: {}
  };
  const attendanceForSelectedDate = reportForSelectedDate.attendance;
  const dietCountsPresent = reportForSelectedDate.dietCountsPresent;
  const dietCountsPacked = reportForSelectedDate.dietCountsPacked;


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
                  {selectedDate ? format(selectedDate, "MMM dd, yyyy") : <span>Pick a date</span>}
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
                          <TableCell>{Math.abs(attendanceForSelectedDate.breakfast) - (attendanceForSelectedDate.breakfast < 0 ? Math.abs(attendanceForSelectedDate.breakfast) : 0)}</TableCell>
                          <TableCell>{attendanceForSelectedDate.breakfast < 0 ? Math.abs(attendanceForSelectedDate.breakfast) : 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lunch</TableCell>
                          <TableCell>{Math.abs(attendanceForSelectedDate.lunch) - (attendanceForSelectedDate.lunch < 0 ? Math.abs(attendanceForSelectedDate.lunch) : 0)}</TableCell>
                          <TableCell>{attendanceForSelectedDate.lunch < 0 ? Math.abs(attendanceForSelectedDate.lunch) : 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dinner</TableCell>
                          <TableCell>{Math.abs(attendanceForSelectedDate.dinner) - (attendanceForSelectedDate.dinner < 0 ? Math.abs(attendanceForSelectedDate.dinner) : 0)}</TableCell>
                          <TableCell>{attendanceForSelectedDate.dinner < 0 ? Math.abs(attendanceForSelectedDate.dinner) : 0}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Diet Label Counts (Present) */}
                <Card>
                  <CardContent>
                    <Table>
                      <TableCaption>Dietary Attendance (Present)</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Diet</TableHead>
                          <TableHead>Breakfast</TableHead>
                          <TableHead>Lunch</TableHead>
                          <TableHead>Dinner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(dietCountsPresent).map(([diet, counts]) => (
                          <TableRow key={diet}>
                            <TableCell>{diet}</TableCell>
                            <TableCell>{Math.abs(counts.breakfast)}</TableCell>
                            <TableCell>{Math.abs(counts.lunch)}</TableCell>
                            <TableCell>{Math.abs(counts.dinner)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Diet Label Counts (Packed) */}
                <Card>
                  <CardContent>
                    <Table>
                      <TableCaption>Dietary Attendance (Packed)</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Diet</TableHead>
                          <TableHead>Breakfast</TableHead>
                          <TableHead>Lunch</TableHead>
                          <TableHead>Dinner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(dietCountsPacked).map(([diet, counts]) => (
                          <TableRow key={diet}>
                            <TableCell>{diet}</TableCell>
                            <TableCell>{Math.abs(counts.breakfast)}</TableCell>
                            <TableCell>{Math.abs(counts.lunch)}</TableCell>
                            <TableCell>{Math.abs(counts.dinner)}</TableCell>
                          </TableRow>
                        ))}
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
