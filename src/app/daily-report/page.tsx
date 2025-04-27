
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { getDailyReportData } from "@/lib/firebase/db";
import { CalendarIcon } from "lucide-react";

// Interfaces from db.ts (or common types file)
type MealStatus = 'present' | 'absent' | 'packed' | null;
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
interface DailyReportData {
  attendance: AttendanceData;
  dietCountsPresent: DietCounts;
  dietCountsPacked: DietCounts;
}
interface DailyReport {
  [date: string]: DailyReportData;
}

// Interfaces for Summary View
interface MealSpecificReport {
  present: number;
  packed: number;
  dietCountsPresent: { [diet: string]: number };
  dietCountsPacked: { [diet: string]: number };
  date: string;
}

interface SummaryReportData {
  lunchNextDay: MealSpecificReport;
  dinnerNextDay: MealSpecificReport;
  breakfastDayAfter: MealSpecificReport;
}


const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};

// Helper function/component to render a meal's summary report section
const RenderMealSummarySection = ({ title, data }: { title: string; data: MealSpecificReport }) => (
  <Card className="mt-4">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">{title} - {data.date}</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4">
      <Card>
        <CardHeader className="pb-1 pt-4">
           <CardTitle className="text-base font-semibold">Meal Attendance</CardTitle>
         </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            {/* <TableCaption>Meal Attendance</TableCaption> */}
            <TableHeader>
              <TableRow>
                <TableHead>Present</TableHead>
                <TableHead>Packed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{data.present}</TableCell>
                <TableCell>{data.packed}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diet Label Counts (Present) */}
      {Object.keys(data.dietCountsPresent).length > 0 && (
        <Card>
           <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-base font-semibold">Dietary Attendance (Present)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              {/* <TableCaption>Dietary Attendance (Present)</TableCaption> */}
              <TableHeader>
                <TableRow>
                  <TableHead>Diet</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.dietCountsPresent).map(([diet, count]) => (
                  <TableRow key={diet}>
                    <TableCell>{diet}</TableCell>
                    <TableCell>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Diet Label Counts (Packed) */}
      {Object.keys(data.dietCountsPacked).length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-base font-semibold">Dietary Attendance (Packed)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              {/* <TableCaption>Dietary Attendance (Packed)</TableCaption> */}
              <TableHeader>
                <TableRow>
                  <TableHead>Diet</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.dietCountsPacked).map(([diet, count]) => (
                  <TableRow key={diet}>
                    <TableCell>{diet}</TableCell>
                    <TableCell>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </CardContent>
  </Card>
);

const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport>({});
  const [summaryReport, setSummaryReport] = useState<SummaryReportData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [loading, setLoading] = useState(true);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'summary'>('daily'); // State to toggle view

  useEffect(() => {
    const centre = localStorage.getItem('selectedCentre');
    setSelectedCentre(centre);
  }, []);

  // Load daily report data from Firebase
  useEffect(() => {
    const fetchDailyReport = async () => {
      if (!selectedDate || !selectedCentre) return;
      setLoading(true);
      try {
        const formattedDate = formatDate(selectedDate);
        const reportData = await getDailyReportData(formattedDate, selectedCentre);
        setDailyReport({ [formattedDate]: reportData });
      } catch (error: any) {
        console.error("Error fetching daily report:", error);
        // Optionally set an error state
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'daily') {
      fetchDailyReport();
      setSummaryReport(null); // Clear summary report when switching to daily view
    }
  }, [selectedDate, selectedCentre, viewMode]);

  // Fetch data for summary view
  useEffect(() => {
    const fetchSummaryReport = async () => {
      if (!selectedDate || !selectedCentre) return;
      setLoading(true);
      setDailyReport({}); // Clear daily report when switching to summary view
      try {
        const nextDay = addDays(selectedDate, 1);
        const dayAfter = addDays(selectedDate, 2);

        const formattedNextDay = formatDate(nextDay);
        const formattedDayAfter = formatDate(dayAfter);

        const [reportNextDay, reportDayAfter] = await Promise.all([
          getDailyReportData(formattedNextDay, selectedCentre),
          getDailyReportData(formattedDayAfter, selectedCentre)
        ]);

        // Helper function to extract specific meal data from a full daily report
        const extractMealData = (report: DailyReportData, meal: keyof AttendanceData, date: Date): MealSpecificReport => {
            const totalCount = report.attendance[meal] ?? 0; // This raw count includes present and subtracts packed implicitly from db layer logic
            const packedCount = Object.values(report.dietCountsPacked).reduce((sum, dietCounts) => sum + (dietCounts[meal] ?? 0), 0);
            const presentCount = totalCount + packedCount; // Recalculate present count based on total and packed

            const dietCountsPresent: { [diet: string]: number } = {};
            Object.entries(report.dietCountsPresent).forEach(([diet, counts]) => {
                if (counts[meal] > 0) {
                dietCountsPresent[diet] = counts[meal];
                }
            });

            const dietCountsPacked: { [diet: string]: number } = {};
            Object.entries(report.dietCountsPacked).forEach(([diet, counts]) => {
                if (counts[meal] > 0) {
                dietCountsPacked[diet] = counts[meal];
                }
            });


          return {
            present: presentCount,
            packed: packedCount,
            dietCountsPresent,
            dietCountsPacked,
            date: formatDate(date),
          };
        };


        setSummaryReport({
          lunchNextDay: extractMealData(reportNextDay, 'lunch', nextDay),
          dinnerNextDay: extractMealData(reportNextDay, 'dinner', nextDay),
          breakfastDayAfter: extractMealData(reportDayAfter, 'breakfast', dayAfter),
        });

      } catch (error: any) {
        console.error("Error fetching summary report:", error);
        setSummaryReport(null); // Reset on error
        // Optionally set an error state
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'summary') {
      fetchSummaryReport();
    }
  }, [selectedDate, selectedCentre, viewMode]);


  const formattedDate = selectedDate ? formatDate(selectedDate) : formatDate(today);
  const reportForSelectedDate = dailyReport[formattedDate] || {
    attendance: { breakfast: 0, lunch: 0, dinner: 0 },
    dietCountsPresent: {},
    dietCountsPacked: {}
  };
  const attendanceForSelectedDate = reportForSelectedDate.attendance;
  const dietCountsPresent = reportForSelectedDate.dietCountsPresent;
  const dietCountsPacked = reportForSelectedDate.dietCountsPacked;

  // Helper function to calculate packed count for a specific meal in daily view
  const getPackedCount = (meal: keyof AttendanceData) => {
    return Object.values(dietCountsPacked).reduce((sum, counts) => sum + (counts[meal] || 0), 0);
  };

  // Helper function to calculate present count for a specific meal in daily view
  const getPresentCount = (meal: keyof AttendanceData) => {
      const total = attendanceForSelectedDate[meal] ?? 0;
      const packed = getPackedCount(meal);
      return total + packed; // Present = Total (from db which is present - packed) + Packed
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Meal Attendance Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <section className="grid gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Select Date</h2>
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
                    // Allow selecting future dates for summary view
                    // disabled={(date) => date > today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-2">
                <Button
                    variant={viewMode === 'daily' ? 'default' : 'secondary'}
                    onClick={() => setViewMode('daily')}
                    >
                    Daily View
                </Button>
                <Button
                    variant={viewMode === 'summary' ? 'default' : 'secondary'}
                    onClick={() => setViewMode('summary')}
                >
                    Summary
                </Button>
              </div>
            </div>
            <Separator />

            {loading ? (
              <div>Loading...</div>
            ) : viewMode === 'daily' ? (
              <>
                <h3 className="text-lg font-semibold mt-4">
                  Attendance for {formattedDate}
                </h3>
                <Card>
                  <CardHeader className="pb-1 pt-4">
                    <CardTitle className="text-base font-semibold">Meal Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Table>
                      {/* <TableCaption>
                        Meal attendance data for {formattedDate}
                      </TableCaption> */}
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
                           <TableCell>{getPresentCount('breakfast')}</TableCell>
                           <TableCell>{getPackedCount('breakfast')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lunch</TableCell>
                           <TableCell>{getPresentCount('lunch')}</TableCell>
                           <TableCell>{getPackedCount('lunch')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dinner</TableCell>
                           <TableCell>{getPresentCount('dinner')}</TableCell>
                           <TableCell>{getPackedCount('dinner')}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Diet Label Counts (Present) */}
                {Object.keys(dietCountsPresent).length > 0 && (
                  <Card className="mt-4">
                     <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-base font-semibold">Dietary Attendance (Present)</CardTitle>
                      </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Table>
                        {/* <TableCaption>Dietary Attendance (Present)</TableCaption> */}
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
                              <TableCell>{Math.max(0, counts.breakfast ?? 0)}</TableCell>
                              <TableCell>{Math.max(0, counts.lunch ?? 0)}</TableCell>
                              <TableCell>{Math.max(0, counts.dinner ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}


                {/* Diet Label Counts (Packed) */}
                 {Object.keys(dietCountsPacked).length > 0 && (
                  <Card className="mt-4">
                     <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-base font-semibold">Dietary Attendance (Packed)</CardTitle>
                      </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Table>
                        {/* <TableCaption>Dietary Attendance (Packed)</TableCaption> */}
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
                              <TableCell>{Math.max(0, counts.breakfast ?? 0)}</TableCell>
                              <TableCell>{Math.max(0, counts.lunch ?? 0)}</TableCell>
                              <TableCell>{Math.max(0, counts.dinner ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                 )}

              </>
            ) : viewMode === 'summary' && summaryReport ? (
                <>
                    <h3 className="text-lg font-semibold mt-4">
                    Summary Report (Based on {formattedDate})
                    </h3>
                     <RenderMealSummarySection title="Lunch (Next Day)" data={summaryReport.lunchNextDay} />
                     <RenderMealSummarySection title="Dinner (Next Day)" data={summaryReport.dinnerNextDay} />
                     <RenderMealSummarySection title="Breakfast (Day After)" data={summaryReport.breakfastDayAfter} />
                </>
            ) : (
                 <div className="mt-4">No summary data available for the selected date or an error occurred.</div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportPage;
        
    

    