
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
interface SummaryMealAttendance {
    present: number;
    packed: number;
}
interface SummaryViewData {
    mealAttendance: {
      lunchNextDay: SummaryMealAttendance & { date: string };
      dinnerNextDay: SummaryMealAttendance & { date: string };
      breakfastDayAfter: SummaryMealAttendance & { date: string };
    };
    dietCountsPresent: { // Diet -> Meal -> Count
      [diet: string]: {
        lunchNextDay: number;
        dinnerNextDay: number;
        breakfastDayAfter: number;
      };
    };
    dietCountsPacked: { // Diet -> Meal -> Count
       [diet: string]: {
         lunchNextDay: number;
         dinnerNextDay: number;
         breakfastDayAfter: number;
       };
    };
    dates: { // Store dates for display
        nextDay: string;
        dayAfter: string;
    }
}


const today = new Date();

const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};

// Helper function to calculate packed count for a specific meal from raw report data
const calculatePackedCount = (report: DailyReportData, meal: keyof AttendanceData): number => {
    return Object.values(report.dietCountsPacked).reduce((sum, counts) => sum + (counts[meal] || 0), 0);
};

// Helper function to calculate present count for a specific meal from raw report data
const calculatePresentCount = (report: DailyReportData, meal: keyof AttendanceData): number => {
    const total = report.attendance[meal] ?? 0; // This is present - packed
    const packed = calculatePackedCount(report, meal);
    return total + packed; // Present = (Present - Packed) + Packed
};


const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport>({});
  const [summaryReport, setSummaryReport] = useState<SummaryViewData | null>(null);
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

        const processedSummaryData: SummaryViewData = {
            mealAttendance: {
                lunchNextDay: {
                    present: calculatePresentCount(reportNextDay, 'lunch'),
                    packed: calculatePackedCount(reportNextDay, 'lunch'),
                    date: formattedNextDay,
                },
                dinnerNextDay: {
                    present: calculatePresentCount(reportNextDay, 'dinner'),
                    packed: calculatePackedCount(reportNextDay, 'dinner'),
                    date: formattedNextDay,
                },
                breakfastDayAfter: {
                    present: calculatePresentCount(reportDayAfter, 'breakfast'),
                    packed: calculatePackedCount(reportDayAfter, 'breakfast'),
                    date: formattedDayAfter,
                }
            },
            dietCountsPresent: {},
            dietCountsPacked: {},
            dates: {
                nextDay: formattedNextDay,
                dayAfter: formattedDayAfter,
            }
        };

        // Aggregate Diet Counts (Present)
        const allPresentDiets = new Set([
            ...Object.keys(reportNextDay.dietCountsPresent),
            ...Object.keys(reportDayAfter.dietCountsPresent)
        ]);

        allPresentDiets.forEach(diet => {
            processedSummaryData.dietCountsPresent[diet] = {
                lunchNextDay: reportNextDay.dietCountsPresent[diet]?.lunch ?? 0,
                dinnerNextDay: reportNextDay.dietCountsPresent[diet]?.dinner ?? 0,
                breakfastDayAfter: reportDayAfter.dietCountsPresent[diet]?.breakfast ?? 0,
            };
        });

         // Aggregate Diet Counts (Packed)
         const allPackedDiets = new Set([
            ...Object.keys(reportNextDay.dietCountsPacked),
            ...Object.keys(reportDayAfter.dietCountsPacked)
        ]);

        allPackedDiets.forEach(diet => {
            processedSummaryData.dietCountsPacked[diet] = {
                lunchNextDay: reportNextDay.dietCountsPacked[diet]?.lunch ?? 0,
                dinnerNextDay: reportNextDay.dietCountsPacked[diet]?.dinner ?? 0,
                breakfastDayAfter: reportDayAfter.dietCountsPacked[diet]?.breakfast ?? 0,
            };
        });


        setSummaryReport(processedSummaryData);

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
  // const attendanceForSelectedDate = reportForSelectedDate.attendance; // Less direct way now
  const dietCountsPresentDaily = reportForSelectedDate.dietCountsPresent;
  const dietCountsPackedDaily = reportForSelectedDate.dietCountsPacked;

  // Helper function to calculate packed count for a specific meal in daily view (using the fetched daily report)
  const getPackedCountDaily = (meal: keyof AttendanceData) => {
    return calculatePackedCount(reportForSelectedDate, meal);
  };

  // Helper function to calculate present count for a specific meal in daily view (using the fetched daily report)
  const getPresentCountDaily = (meal: keyof AttendanceData) => {
     return calculatePresentCount(reportForSelectedDate, meal);
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
              <h2 className="text-xl font-semibold">Select Base Date</h2>
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
                  Daily Report for {formattedDate}
                </h3>
                {/* Daily Meal Attendance Table */}
                <Card>
                  <CardHeader className="pb-1 pt-4">
                    <CardTitle className="text-base font-semibold">Meal Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Table>
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
                           <TableCell>{getPresentCountDaily('breakfast')}</TableCell>
                           <TableCell>{getPackedCountDaily('breakfast')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lunch</TableCell>
                           <TableCell>{getPresentCountDaily('lunch')}</TableCell>
                           <TableCell>{getPackedCountDaily('lunch')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dinner</TableCell>
                           <TableCell>{getPresentCountDaily('dinner')}</TableCell>
                           <TableCell>{getPackedCountDaily('dinner')}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Daily Diet Label Counts (Present) */}
                {Object.keys(dietCountsPresentDaily).length > 0 && (
                  <Card className="mt-4">
                     <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-base font-semibold">Dietary Attendance (Present)</CardTitle>
                      </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Diet</TableHead>
                            <TableHead>Breakfast</TableHead>
                            <TableHead>Lunch</TableHead>
                            <TableHead>Dinner</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(dietCountsPresentDaily).map(([diet, counts]) => (
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


                {/* Daily Diet Label Counts (Packed) */}
                 {Object.keys(dietCountsPackedDaily).length > 0 && (
                  <Card className="mt-4">
                     <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-base font-semibold">Dietary Attendance (Packed)</CardTitle>
                      </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Diet</TableHead>
                            <TableHead>Breakfast</TableHead>
                            <TableHead>Lunch</TableHead>
                            <TableHead>Dinner</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(dietCountsPackedDaily).map(([diet, counts]) => (
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
                 {!Object.keys(dietCountsPresentDaily).length && !Object.keys(dietCountsPackedDaily).length && (
                    <div className="mt-4 text-muted-foreground">No dietary information recorded for this date.</div>
                 )}

              </>
            ) : viewMode === 'summary' && summaryReport ? (
                <>
                    <h3 className="text-lg font-semibold mt-4">
                    Summary Report (Based on {formattedDate})
                    </h3>

                     {/* Summary Meal Attendance Table */}
                     <Card>
                        <CardHeader className="pb-1 pt-4">
                            <CardTitle className="text-base font-semibold">Meal Attendance Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Meal</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Present</TableHead>
                                <TableHead>Packed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                <TableCell>Lunch (Next Day)</TableCell>
                                <TableCell>{summaryReport.dates.nextDay}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.lunchNextDay.present}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.lunchNextDay.packed}</TableCell>
                                </TableRow>
                                <TableRow>
                                <TableCell>Dinner (Next Day)</TableCell>
                                <TableCell>{summaryReport.dates.nextDay}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.dinnerNextDay.present}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.dinnerNextDay.packed}</TableCell>
                                </TableRow>
                                <TableRow>
                                <TableCell>Breakfast (Day After)</TableCell>
                                <TableCell>{summaryReport.dates.dayAfter}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.breakfastDayAfter.present}</TableCell>
                                <TableCell>{summaryReport.mealAttendance.breakfastDayAfter.packed}</TableCell>
                                </TableRow>
                            </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                     {/* Summary Dietary Attendance (Present) */}
                     {Object.keys(summaryReport.dietCountsPresent).length > 0 && (
                     <Card className="mt-4">
                         <CardHeader className="pb-1 pt-4">
                            <CardTitle className="text-base font-semibold">Dietary Attendance Summary (Present)</CardTitle>
                         </CardHeader>
                         <CardContent className="p-4 pt-0">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Diet</TableHead>
                                    <TableHead>Lunch ({summaryReport.dates.nextDay})</TableHead>
                                    <TableHead>Dinner ({summaryReport.dates.nextDay})</TableHead>
                                    <TableHead>Breakfast ({summaryReport.dates.dayAfter})</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {Object.entries(summaryReport.dietCountsPresent).map(([diet, counts]) => (
                                    <TableRow key={diet}>
                                    <TableCell>{diet}</TableCell>
                                    <TableCell>{Math.max(0, counts.lunchNextDay ?? 0)}</TableCell>
                                    <TableCell>{Math.max(0, counts.dinnerNextDay ?? 0)}</TableCell>
                                    <TableCell>{Math.max(0, counts.breakfastDayAfter ?? 0)}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                         </CardContent>
                     </Card>
                     )}

                     {/* Summary Dietary Attendance (Packed) */}
                     {Object.keys(summaryReport.dietCountsPacked).length > 0 && (
                     <Card className="mt-4">
                         <CardHeader className="pb-1 pt-4">
                            <CardTitle className="text-base font-semibold">Dietary Attendance Summary (Packed)</CardTitle>
                         </CardHeader>
                         <CardContent className="p-4 pt-0">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Diet</TableHead>
                                    <TableHead>Lunch ({summaryReport.dates.nextDay})</TableHead>
                                    <TableHead>Dinner ({summaryReport.dates.nextDay})</TableHead>
                                    <TableHead>Breakfast ({summaryReport.dates.dayAfter})</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {Object.entries(summaryReport.dietCountsPacked).map(([diet, counts]) => (
                                    <TableRow key={diet}>
                                    <TableCell>{diet}</TableCell>
                                    <TableCell>{Math.max(0, counts.lunchNextDay ?? 0)}</TableCell>
                                    <TableCell>{Math.max(0, counts.dinnerNextDay ?? 0)}</TableCell>
                                    <TableCell>{Math.max(0, counts.breakfastDayAfter ?? 0)}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                         </CardContent>
                     </Card>
                      )}
                     {!Object.keys(summaryReport.dietCountsPresent).length && !Object.keys(summaryReport.dietCountsPacked).length && (
                         <div className="mt-4 text-muted-foreground">No summary dietary information available for these dates.</div>
                     )}
                </>
            ) : (
                 <div className="mt-4">No summary data available for the selected base date or an error occurred.</div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReportPage;
        
    

    
