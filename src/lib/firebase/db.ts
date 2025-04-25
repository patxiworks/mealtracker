// src/lib/firebase/db.ts
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Define the meal status type
type MealStatus = 'present' | 'absent' | 'packed' | null;

// Define the meal attendance state
interface MealAttendanceState {
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
}

// Function to create user meal attendance data
export const createUserMealAttendance = async (
  username: string,
  initialAttendance: Record<string, MealAttendanceState>,
  diet: string | null, // Optional diet label
  centre: string // Add centre as a required field
) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    await setDoc(userDocRef, {
      mealAttendance: initialAttendance,
      diet: diet || null, // Store the diet or null if not provided
      centre: centre, // Store the centre
    });
    console.log('User meal attendance created successfully');
  } catch (error) {
    console.error('Error creating user meal attendance:', error);
    throw error;
  }
};

// Function to get user meal attendance data
export const getUserMealAttendance = async (username: string) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    const docSnapshot = await getDoc(userDocRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        mealAttendance: data.mealAttendance as Record<string, MealAttendanceState>,
        diet: data.diet as string | null, // Also return the diet
        centre: data.centre as string, // Also return the centre
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
    await updateDoc(userDocRef, {
      mealAttendance: updatedAttendance,
    });
    console.log('User meal attendance updated successfully');
  } catch (error) {
    console.error('Error updating user meal attendance:', error);
    throw error;
  }
};

// Function to get daily report data
export const getDailyReportData = async (date: string, centre: string) => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("centre", "==", centre));
    const snapshot = await getDocs(q);

    let breakfastPresentCount = 0;
    let lunchPresentCount = 0;
    let dinnerPresentCount = 0;

    // Aggregate diet counts for present meals
    const dietCountsPresent: { [diet: string]: { breakfast: number; lunch: number; dinner: number } } = {};

    // Aggregate diet counts for packed meals
    const dietCountsPacked: { [diet: string]: { breakfast: number; lunch: number; dinner: number } } = {};


    snapshot.forEach((doc) => {
      const userData = doc.data();
      const mealAttendance = userData.mealAttendance || {};
      const dailyAttendance: MealAttendanceState = mealAttendance[date] || { breakfast: null, lunch: null, dinner: null };
      const diet = userData.diet as string | null;

      // Handle present meals
      if (dailyAttendance.breakfast === 'present') breakfastPresentCount++;
      if (dailyAttendance.lunch === 'present') lunchPresentCount++;
      if (dailyAttendance.dinner === 'present') dinnerPresentCount++;

      // Track diet counts for present meals
      if (diet) {
        if (!dietCountsPresent[diet]) {
          dietCountsPresent[diet] = { breakfast: 0, lunch: 0, dinner: 0 };
        }

        if (dailyAttendance.breakfast === 'present') dietCountsPresent[diet].breakfast++;
        if (dailyAttendance.lunch === 'present') dietCountsPresent[diet].lunch++;
        if (dailyAttendance.dinner === 'present') dietCountsPresent[diet].dinner++;
      }

      // Handle packed meals
      if (dailyAttendance.breakfast === 'packed') breakfastPresentCount--;
      if (dailyAttendance.lunch === 'packed') lunchPresentCount--;
      if (dailyAttendance.dinner === 'packed') dinnerPresentCount--;

      // Track diet counts for packed meals
      if (diet) {
        if (!dietCountsPacked[diet]) {
          dietCountsPacked[diet] = { breakfast: 0, lunch: 0, dinner: 0 };
        }

        if (dailyAttendance.breakfast === 'packed') dietCountsPacked[diet].breakfast++;
        if (dailyAttendance.lunch === 'packed') dietCountsPacked[diet].lunch++;
        if (dailyAttendance.dinner === 'packed') dietCountsPacked[diet].dinner++;
      }

    });

    return {
      attendance: {
        breakfast: breakfastPresentCount,
        lunch: lunchPresentCount,
        dinner: dinnerPresentCount,
      },
      dietCountsPresent: dietCountsPresent,
      dietCountsPacked: dietCountsPacked,
    };
  } catch (error) {
    console.error('Error getting daily report data:', error);
    throw error;
  }
};
