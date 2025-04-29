// src/lib/firebase/db.ts
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns'; // Added for date formatting

const USERS_COLLECTION = 'users';
const DIETS_COLLECTION = 'diets'; // Added diets collection constant

// Define the meal status type
export type MealStatus = 'present' | 'absent' | 'packed' | null;

// Define the meal attendance state
export interface MealAttendanceState {
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
}

// Interface for user data stored in Firestore
interface UserData {
    mealAttendance: Record<string, MealAttendanceState>;
    diet: string | null;
    centre: string;
    name: string; // Assuming name exists for initials
    birthday?: Timestamp | string; // Assuming birthday exists, could be Timestamp or string
}

// Interface for detailed attendance count including users
export interface MealAttendanceDetail {
    count: number;
    users: string[];
}

// Interface for detailed diet counts including users
export interface DietCountsDetail {
    [diet: string]: {
        breakfast: MealAttendanceDetail;
        lunch: MealAttendanceDetail;
        dinner: MealAttendanceDetail;
    };
}

// Interface for the detailed daily report data structure
export interface DailyReportDataWithUsers {
    attendancePresent: {
        breakfast: MealAttendanceDetail;
        lunch: MealAttendanceDetail;
        dinner: MealAttendanceDetail;
    };
    attendancePacked: {
        breakfast: MealAttendanceDetail;
        lunch: MealAttendanceDetail;
        dinner: MealAttendanceDetail;
    };
    dietCountsPresent: DietCountsDetail;
    dietCountsPacked: DietCountsDetail;
}

// Interface for Diet Information
export interface DietInfo {
    id: string; // Document ID (e.g., 'D1', 'D2')
    name: string; // Diet name/label (e.g., 'Vegetarian', 'Gluten-Free') - might be same as id
    description: string; // Description of the diet
}

// Interface for Birthday Information
export interface BirthdayInfo {
    initials: string;
    birthday: string; // Formatted as "MMM dd"
    sortKey: string; // For sorting (e.g., "01-01" for Jan 1st)
}

// Helper to generate initials from a name
const getInitials = (name: string): string => {
  if (!name) return '';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

// Function to create user meal attendance data
export const createUserMealAttendance = async (
  username: string,
  initialAttendance: Record<string, MealAttendanceState>,
  diet: string | null, // Optional diet label
  centre: string // Add centre as a required field
) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    const docSnap = await getDoc(userDocRef);
    const userData = docSnap.data() as Partial<UserData>; // Get existing data

    if (!docSnap.exists()) {
        // Only create if the user doesn't exist
        await setDoc(userDocRef, {
          mealAttendance: initialAttendance,
          diet: diet || null, // Store the diet or null if not provided
          centre: centre, // Store the centre
          name: username, // Assume username is the initial name
          // birthday: null // Initialize birthday if needed
        });
        console.log('User meal attendance created successfully');
    } else {
        // Update existing user's diet and centre if needed
        await updateDoc(userDocRef, {
            diet: diet !== undefined ? diet : userData.diet || null,
            centre: centre !== undefined ? centre : userData.centre || '',
            name: username, // Keep name consistent or update as needed
            // Don't overwrite existing mealAttendance unless explicitly intended
        });
        console.log('User diet and centre updated.');
    }


  } catch (error) {
    console.error('Error creating/updating user meal attendance:', error);
    throw error;
  }
};

// Function to get user meal attendance data
export const getUserMealAttendance = async (username: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    const docSnapshot = await getDoc(userDocRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as UserData; // Cast to UserData
      return {
        mealAttendance: data.mealAttendance || {}, // Ensure mealAttendance exists
        diet: data.diet || null, // Also return the diet
        centre: data.centre || '', // Also return the centre
        name: data.name || username, // Return name, fallback to username
        birthday: data.birthday // Return birthday
      };
    } else {
      return null; // User data not found
    }
  } catch (error) {
    console.error('Error getting user meal attendance:', error);
    throw error;
  }
};

// Function to update user meal attendance data
export const updateUserMealAttendance = async (
  username: string,
  updatedAttendance: Record<string, MealAttendanceState>
) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    // Ensure the document exists before updating just the mealAttendance
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        await updateDoc(userDocRef, {
        mealAttendance: updatedAttendance,
        });
        // console.log('User meal attendance updated successfully'); // Commented out for less noise
    } else {
        console.log(`User ${username} not found, cannot update attendance.`);
        // Optionally, create the user here if needed, but current flow handles creation on sign-in
    }
  } catch (error) {
    console.error('Error updating user meal attendance:', error);
    throw error;
  }
};


// Helper to initialize MealAttendanceDetail
const initMealAttendanceDetail = (): MealAttendanceDetail => ({ count: 0, users: [] });

// Helper to initialize DietCountsDetail structure
const initDietCountsDetail = (): DietCountsDetail => ({});

// Function to get daily report data with user lists
export const getDailyReportData = async (date: string, centre: string): Promise<DailyReportDataWithUsers> => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("centre", "==", centre));
    const snapshot = await getDocs(q);

    const reportData: DailyReportDataWithUsers = {
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


    snapshot.forEach((doc) => {
      const username = doc.id; // Get username from doc id
      const userData = doc.data() as UserData;
      const mealAttendance = userData.mealAttendance || {};
      const dailyAttendance: MealAttendanceState = mealAttendance[date] || { breakfast: null, lunch: null, dinner: null };
      const diet = userData.diet as string | null;

      // --- Process Breakfast ---
      if (dailyAttendance.breakfast === 'present') {
          reportData.attendancePresent.breakfast.users.push(username);
          if (diet) {
              if (!reportData.dietCountsPresent[diet]) reportData.dietCountsPresent[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPresent[diet].breakfast.users.push(username);
          }
      } else if (dailyAttendance.breakfast === 'packed') {
          reportData.attendancePacked.breakfast.users.push(username);
           if (diet) {
              if (!reportData.dietCountsPacked[diet]) reportData.dietCountsPacked[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPacked[diet].breakfast.users.push(username);
          }
      }

      // --- Process Lunch ---
      if (dailyAttendance.lunch === 'present') {
          reportData.attendancePresent.lunch.users.push(username);
           if (diet) {
              if (!reportData.dietCountsPresent[diet]) reportData.dietCountsPresent[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPresent[diet].lunch.users.push(username);
          }
      } else if (dailyAttendance.lunch === 'packed') {
          reportData.attendancePacked.lunch.users.push(username);
           if (diet) {
              if (!reportData.dietCountsPacked[diet]) reportData.dietCountsPacked[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPacked[diet].lunch.users.push(username);
          }
      }

      // --- Process Dinner ---
      if (dailyAttendance.dinner === 'present') {
          reportData.attendancePresent.dinner.users.push(username);
           if (diet) {
              if (!reportData.dietCountsPresent[diet]) reportData.dietCountsPresent[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPresent[diet].dinner.users.push(username);
          }
      } else if (dailyAttendance.dinner === 'packed') {
          reportData.attendancePacked.dinner.users.push(username);
           if (diet) {
              if (!reportData.dietCountsPacked[diet]) reportData.dietCountsPacked[diet] = { breakfast: initMealAttendanceDetail(), lunch: initMealAttendanceDetail(), dinner: initMealAttendanceDetail() };
              reportData.dietCountsPacked[diet].dinner.users.push(username);
          }
      }
    });

    // --- Calculate counts from user list lengths ---
    const calculateCounts = (detail: MealAttendanceDetail) => {
        detail.count = detail.users.length;
    };

    calculateCounts(reportData.attendancePresent.breakfast);
    calculateCounts(reportData.attendancePresent.lunch);
    calculateCounts(reportData.attendancePresent.dinner);

    calculateCounts(reportData.attendancePacked.breakfast);
    calculateCounts(reportData.attendancePacked.lunch);
    calculateCounts(reportData.attendancePacked.dinner);

    Object.values(reportData.dietCountsPresent).forEach(dietMeals => {
        calculateCounts(dietMeals.breakfast);
        calculateCounts(dietMeals.lunch);
        calculateCounts(dietMeals.dinner);
    });
     Object.values(reportData.dietCountsPacked).forEach(dietMeals => {
        calculateCounts(dietMeals.breakfast);
        calculateCounts(dietMeals.lunch);
        calculateCounts(dietMeals.dinner);
    });


    return reportData;
  } catch (error) {
    console.error('Error getting detailed daily report data:', error);
    // Return an empty structure on error
    return {
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
    // throw error; // Or rethrow if you want the caller to handle it
  }
};


// Function to get individual user attendance for a specific date
export const getUserAttendanceForDate = async (date: string, centre: string): Promise<Record<string, MealAttendanceState>> => {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("centre", "==", centre));
        const snapshot = await getDocs(q);

        const userAttendance: Record<string, MealAttendanceState> = {};

        snapshot.forEach((doc) => {
            const username = doc.id;
            const userData = doc.data() as UserData;
            const mealAttendance = userData.mealAttendance || {};
            const dailyAttendance: MealAttendanceState = mealAttendance[date] || { breakfast: null, lunch: null, dinner: null };
            userAttendance[username] = dailyAttendance;
        });

        return userAttendance;
    } catch (error) {
        console.error('Error getting user attendance for date:', error);
        return {}; // Return empty object on error
    }
};

// Function to get diet descriptions
export const getDietsData = async (): Promise<DietInfo[]> => {
    try {
        const dietsSnapshot = await getDocs(collection(db, DIETS_COLLECTION));
        const dietsList: DietInfo[] = dietsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<DietInfo, 'id'>), // Cast to the DietInfo structure (excluding id)
        }));
        return dietsList;
    } catch (error) {
        console.error('Error getting diets data:', error);
        return []; // Return empty array on error
    }
};

// Function to get user birthdays for a specific centre
export const getUsersBirthdays = async (centre: string): Promise<BirthdayInfo[]> => {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("centre", "==", centre));
        const snapshot = await getDocs(q);

        const birthdays: BirthdayInfo[] = [];

        snapshot.forEach((doc) => {
            const userData = doc.data() as UserData;
            if (userData.name && userData.birthday) {
                const initials = getInitials(userData.name);
                let birthdayDate: Date | null = null;

                // Handle both Timestamp and string date formats
                if (userData.birthday instanceof Timestamp) {
                    birthdayDate = userData.birthday.toDate();
                } else if (typeof userData.birthday === 'string') {
                    try {
                        birthdayDate = new Date(userData.birthday);
                        // Basic validation if it's a string date
                        if (isNaN(birthdayDate.getTime())) {
                            console.warn(`Invalid birthday string format for user ${userData.name}: ${userData.birthday}`);
                            birthdayDate = null;
                        }
                    } catch (e) {
                         console.warn(`Error parsing birthday string for user ${userData.name}: ${userData.birthday}`, e);
                         birthdayDate = null;
                    }
                }

                if (birthdayDate) {
                    const formattedBirthday = format(birthdayDate, 'MMM dd');
                    const sortKey = format(birthdayDate, 'MM-dd'); // Use MM-dd for reliable sorting
                     birthdays.push({
                        initials,
                        birthday: formattedBirthday,
                        sortKey,
                    });
                }
            }
        });

        // Sort birthdays by month and day
        birthdays.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return birthdays;
    } catch (error) {
        console.error('Error getting user birthdays:', error);
        return []; // Return empty array on error
    }
};
