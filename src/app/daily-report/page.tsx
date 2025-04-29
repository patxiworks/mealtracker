
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { getDailyReportData, getUserAttendanceForDate } from "@/lib/firebase/db";
import type { DailyReportDataWithUsers, MealAttendanceDetail, DietCountsDetail, MealAttendanceState } from "@/lib/firebase/db"; // Added MealAttendanceState
import { CalendarCheck2, CalendarIcon, HomeIcon, Loader2, Sun, Utensils, Moon, PackageCheck, X, Check } from "lucide-react"; // Added Loader2, Sun, Utensils, Moon, PackageCheck, X, Check
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the meal status type locally for getMealStatusIcon if needed, or rely on import
type MealStatus = 'present' | 'absent' | 'packed' | null;


// Helper to initialize MealAttendanceDetail
const initMealAttendanceDetail = (): MealAttendanceDetail => ({ count: 0, users: [] });
// Helper to initialize DietCountsDetail structure
const initDietCountsDetail = (): DietCountsDetail => ({});

// Define the default empty report structure
const emptyReport: DailyReportDataWithUsers = {
  attendancePresent: {
    breakfast: initMealAttendanceDetail(),
    lunch: initMealAttendanceDetail(),
    dinner: initMealAttendanceDetail(),
  },
  attendancePacked: {
    breakfast: initMealAttendanceDetail(),
    lunch: initMealAttendanceDetail(),
    dinner: initMealAttendanceDetail(),
  },
  dietCountsPresent: initDietCountsDetail(),
  dietCountsPacked: initDietCountsDetail(),
};

// Interface for Summary View (Adjusted for detailed data)
interface SummaryMealAttendance {
    present: MealAttendanceDetail;
    packed: MealAttendanceDetail;
    date: string; // Add date for context
}
interface SummaryViewData {
    mealAttendance: {
      lunchNextDay: SummaryMealAttendance;
      dinnerNextDay: SummaryMealAttendance;
      breakfastDayAfter: SummaryMealAttendance;
    };
    dietCountsPresent: DietCountsDetail; // Re-use DietCountsDetail
    dietCountsPacked: DietCountsDetail; // Re-use DietCountsDetail
    dates: { // Store dates for display
        nextDay: string;
        dayAfter: string;
    }
}

// Interface for User Attendance View
interface UserDailyAttendance {
    [username: string]: MealAttendanceState;
}

const today = new Date();

// Format date as "MMM dd" (e.g., "Apr 28") for report display
const formatReportDate = (date: Date): string => {
  return format(date, "MMM dd");
};

// Format date as "MMM dd, yyyy" for the date picker display
const formatPickerDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};


// --- Popover Component for Click Interaction ---
const CountWithPopover = ({ detail }: { detail: MealAttendanceDetail }) => {
  if (detail.count === 0) {
    return <span>0</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="cursor-pointer font-medium text-primary underline decoration-dotted">
          {detail.count}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        {detail.users.length > 0 ? (
          <ul className="list-none text-sm space-y-1 max-h-48 overflow-y-auto">
            {detail.users.map(user => (
              <li key={user}>{user}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No users</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

// --- Icon Renderer for User View ---
const getMealStatusIcon = (status: MealStatus) => {
    if (status === 'present') {
      return <Check className="h-5 w-5 text-green-500 font-bold" />;
    } else if (status === 'absent') {
      return <X className="h-5 w-5 text-red-500 font-bold" />;
    } else if (status === 'packed') {
      return <PackageCheck className="h-5 w-5 text-blue-500 font-bold" />;
    }
    // Render nothing or a placeholder for null/undefined
    return <span className="h-5 w-5 inline-block"></span>; // Placeholder for alignment
};


const DailyReportPage = () => {
  const [dailyReport, setDailyReport] = useState<DailyReportDataWithUsers>(emptyReport);
  const [summaryReport, setSummaryReport] = useState<SummaryViewData | null>(null);
  const [userAttendanceReport, setUserAttendanceReport] = useState<UserDailyAttendance | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [loading, setLoading] = useState(true);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'summary' | 'user'>('daily'); // State to control view: added 'user'


  useEffect(() => {
    const centre = localStorage.getItem('selectedCentre');
    setSelectedCentre(centre);
  }, []);

  // Load daily/user report data from Firebase
  useEffect(() => {
    const fetchDailyAndUserData = async () => {
      if (!selectedDate || !selectedCentre) return;
      setLoading(true);
      setUserAttendanceReport(null); // Clear user report when fetching daily
      setSummaryReport(null); // Clear summary report when fetching daily
      try {
        const formattedDateForDb = format(selectedDate, "MMM dd, yyyy"); // Use full date for DB query

        // Fetch both aggregated daily report and individual user attendance
        const [reportData, userAttendanceData] = await Promise.all([
            getDailyReportData(formattedDateForDb, selectedCentre),
            getUserAttendanceForDate(formattedDateForDb, selectedCentre)
        ]);

        setDailyReport(reportData);
        setUserAttendanceReport(userAttendanceData);

      } catch (error: any) {
        console.error("Error fetching daily and user report:", error);
        setDailyReport(emptyReport); // Reset on error
        setUserAttendanceReport(null); // Reset on error
        // Optionally set an error state
      } finally {
        setLoading(false);
      }
    };

    // Fetch only when daily or user view is active
    if (viewMode === 'daily' || viewMode === 'user') {
      fetchDailyAndUserData();
    }
  }, [selectedDate, selectedCentre, viewMode]); // Rerun if viewMode changes to daily or user


  // Fetch data for summary view
  useEffect(() => {
    const fetchSummaryReport = async () => {
      if (!selectedDate || !selectedCentre) return;
      setLoading(true);
      setDailyReport(emptyReport); // Clear daily report when switching to summary view
      setUserAttendanceReport(null); // Clear user report when switching to summary view
      try {
        const nextDay = addDays(selectedDate, 1);
        const dayAfter = addDays(selectedDate, 2);

        const formattedNextDayForDb = format(nextDay, "MMM dd, yyyy"); // Use full date for DB query
        const formattedDayAfterForDb = format(dayAfter, "MMM dd, yyyy"); // Use full date for DB query

        const [reportNextDay, reportDayAfter] = await Promise.all([
          getDailyReportData(formattedNextDayForDb, selectedCentre),
          getDailyReportData(formattedDayAfterForDb, selectedCentre)
        ]);

        // Format dates for display (MMM dd)
        const formattedNextDayForDisplay = formatReportDate(nextDay);
        const formattedDayAfterForDisplay = formatReportDate(dayAfter);

        const processedSummaryData: SummaryViewData = {
            mealAttendance: {
                lunchNextDay: {
                    present: reportNextDay.attendancePresent.lunch,
                    packed: reportNextDay.attendancePacked.lunch,
                    date: formattedNextDayForDisplay, // Use display format
                },
                dinnerNextDay: {
                    present: reportNextDay.attendancePresent.dinner,
                    packed: reportNextDay.attendancePacked.dinner,
                    date: formattedNextDayForDisplay, // Use display format
                },
                breakfastDayAfter: {
                    present: reportDayAfter.attendancePresent.breakfast,
                    packed: reportDayAfter.attendancePacked.breakfast,
                    date: formattedDayAfterForDisplay, // Use display format
                }
            },
            dietCountsPresent: {}, // Initialize
            dietCountsPacked: {}, // Initialize
            dates: { // Store display dates
                nextDay: formattedNextDayForDisplay,
                dayAfter: formattedDayAfterForDisplay,
            }
        };

        // Aggregate Diet Counts (Present & Packed)
        const allDiets = new Set<string>([
            ...Object.keys(reportNextDay.dietCountsPresent),
            ...Object.keys(reportDayAfter.dietCountsPresent),
            ...Object.keys(reportNextDay.dietCountsPacked),
            ...Object.keys(reportDayAfter.dietCountsPacked)
        ]);

        allDiets.forEach(diet => {
            // Present
            processedSummaryData.dietCountsPresent[diet] = {
                // We need MealAttendanceDetail structure here
                 breakfast: reportDayAfter.dietCountsPresent[diet]?.breakfast ?? initMealAttendanceDetail(), // Day After for Breakfast
                 lunch: reportNextDay.dietCountsPresent[diet]?.lunch ?? initMealAttendanceDetail(), // Next Day for Lunch
                 dinner: reportNextDay.dietCountsPresent[diet]?.dinner ?? initMealAttendanceDetail(), // Next Day for Dinner
            };
             // Packed
            processedSummaryData.dietCountsPacked[diet] = {
                 breakfast: reportDayAfter.dietCountsPacked[diet]?.breakfast ?? initMealAttendanceDetail(), // Day After for Breakfast
                 lunch: reportNextDay.dietCountsPacked[diet]?.lunch ?? initMealAttendanceDetail(), // Next Day for Lunch
                 dinner: reportNextDay.dietCountsPacked[diet]?.dinner ?? initMealAttendanceDetail(), // Next Day for Dinner
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


  const formattedReportDisplayDate = selectedDate ? formatReportDate(selectedDate) : formatReportDate(today);

  return (
    <div className="container mx-auto pb-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="px-4 py-4 sm:px-4 bg-[#4864c3]">
          <div className="flex justify-between items-center">
            <CardTitle className="flex gap-1 text-2xl text-[#c6cfec]">
              <CalendarCheck2 className="inline-block" size={30} />
              <span className="">MealTrack Report</span>
            </CardTitle>
            <div className="flex gap-4 items-center">
                <span className="text-sm text-[#c6cfec] font-medium">Centre: {selectedCentre || 'N/A'}</span>
              <Link href="/">
                <Button variant="secondary" className="px-2 h-8">
                  <HomeIcon size={10} />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 px-4">
        <section className="grid gap-2 pt-4">
          <div className="flex justify-between items-center gap-4 flex-wrap ">
            {/* Date Picker */}
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatPickerDate(selectedDate) : <span>Pick a date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
            {/* Remove old Buttons */}
            </div>
            <Separator />

            <Tabs defaultValue="daily" value={viewMode} onValueChange={(value) => setViewMode(value as 'daily' | 'summary' | 'user')} className="w-full pt-2">
                <TabsList className="grid w-full grid-cols-3"> {/* Changed grid-cols-2 to grid-cols-3 */}
                    <TabsTrigger value="daily">Daily View</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="user">User View</TabsTrigger> {/* Added User View Tab */}
                </TabsList>

                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Daily View Content */}
                        <TabsContent value="daily">
                            <h3 className="text-lg font-semibold mt-4">
                                Daily Report for {formattedReportDisplayDate}
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
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePresent.breakfast} /></TableCell>
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePacked.breakfast} /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                    <TableCell>Lunch</TableCell>
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePresent.lunch} /></TableCell>
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePacked.lunch} /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                    <TableCell>Dinner</TableCell>
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePresent.dinner} /></TableCell>
                                    <TableCell><CountWithPopover detail={dailyReport.attendancePacked.dinner} /></TableCell>
                                    </TableRow>
                                </TableBody>
                                </Table>
                            </CardContent>
                            </Card>

                            {/* Daily Diet Label Counts (Present) */}
                            {Object.keys(dailyReport.dietCountsPresent).length > 0 && (
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
                                    {Object.entries(dailyReport.dietCountsPresent).map(([diet, counts]) => (
                                        <TableRow key={diet}>
                                        <TableCell>{diet}</TableCell>
                                        <TableCell><CountWithPopover detail={counts.breakfast} /></TableCell>
                                        <TableCell><CountWithPopover detail={counts.lunch} /></TableCell>
                                        <TableCell><CountWithPopover detail={counts.dinner} /></TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </CardContent>
                            </Card>
                            )}


                            {/* Daily Diet Label Counts (Packed) */}
                            {Object.keys(dailyReport.dietCountsPacked).length > 0 && (
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
                                    {Object.entries(dailyReport.dietCountsPacked).map(([diet, counts]) => (
                                        <TableRow key={diet}>
                                        <TableCell>{diet}</TableCell>
                                        <TableCell><CountWithPopover detail={counts.breakfast} /></TableCell>
                                        <TableCell><CountWithPopover detail={counts.lunch} /></TableCell>
                                        <TableCell><CountWithPopover detail={counts.dinner} /></TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </CardContent>
                            </Card>
                            )}
                            {!Object.keys(dailyReport.dietCountsPresent).length && !Object.keys(dailyReport.dietCountsPacked).length && (
                                <div className="mt-4 text-muted-foreground">No dietary information recorded for this date.</div>
                            )}
                        </TabsContent>

                        {/* Summary View Content */}
                        <TabsContent value="summary">
                            {summaryReport ? (
                                <>
                                    <h3 className="text-lg font-semibold mt-4">
                                    Summary Report (Based on {formattedReportDisplayDate})
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
                                                <TableCell>Lunch</TableCell>
                                                <TableCell>{summaryReport.dates.nextDay}</TableCell>
                                                <TableCell><CountWithPopover detail={summaryReport.mealAttendance.lunchNextDay.present} /></TableCell>
                                                <TableCell><CountWithPopover detail={summaryReport.mealAttendance.lunchNextDay.packed} /></TableCell>
                                                </TableRow>
                                                <TableRow>
                                                <TableCell>Dinner</TableCell>
                                                <TableCell>{summaryReport.dates.nextDay}</TableCell>
                                                    <TableCell><CountWithPopover detail={summaryReport.mealAttendance.dinnerNextDay.present} /></TableCell>
                                                <TableCell><CountWithPopover detail={summaryReport.mealAttendance.dinnerNextDay.packed} /></TableCell>
                                                </TableRow>
                                                <TableRow>
                                                <TableCell>Breakfast</TableCell>
                                                <TableCell>{summaryReport.dates.dayAfter}</TableCell>
                                                <TableCell><CountWithPopover detail={summaryReport.mealAttendance.breakfastDayAfter.present} /></TableCell>
                                                <TableCell><CountWithPopover detail={summaryReport.mealAttendance.breakfastDayAfter.packed} /></TableCell>
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
                                                    <TableCell><CountWithPopover detail={counts.lunch} /></TableCell>
                                                    <TableCell><CountWithPopover detail={counts.dinner} /></TableCell>
                                                    <TableCell><CountWithPopover detail={counts.breakfast} /></TableCell>
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
                                                    <TableCell><CountWithPopover detail={counts.lunch} /></TableCell>
                                                    <TableCell><CountWithPopover detail={counts.dinner} /></TableCell>
                                                    <TableCell><CountWithPopover detail={counts.breakfast} /></TableCell>
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
                                <div className="mt-4">No summary data available for the selected date range or an error occurred.</div>
                            )}
                        </TabsContent>

                         {/* User View Content */}
                        <TabsContent value="user">
                             <h3 className="text-lg font-semibold mt-4">
                                User Attendance for {formattedReportDisplayDate}
                             </h3>
                             {userAttendanceReport && Object.keys(userAttendanceReport).length > 0 ? (
                                <Card className="mt-4">
                                <CardContent className="p-4 pt-4">
                                    <Table>
                                        <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[150px]">User</TableHead>
                                            <TableHead className="text-center"><Sun size={18}/></TableHead>
                                            <TableHead className="text-center"><Utensils size={18}/></TableHead>
                                            <TableHead className="text-center"><Moon size={18}/></TableHead>
                                        </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {Object.entries(userAttendanceReport).map(([username, attendance]) => (
                                            <TableRow key={username}>
                                                <TableCell className="font-medium">{username}</TableCell>
                                                <TableCell className="text-center">{getMealStatusIcon(attendance.breakfast)}</TableCell>
                                                <TableCell className="text-center">{getMealStatusIcon(attendance.lunch)}</TableCell>
                                                <TableCell className="text-center">{getMealStatusIcon(attendance.dinner)}</TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                </Card>
                            ) : (
                                <div className="mt-4 text-muted-foreground">No user attendance data available for this date.</div>
                            )}
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </section>
        </CardContent>
    </Card>
    </div>
  );
};

export default DailyReportPage;
