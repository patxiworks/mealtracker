// src/lib/firebase/db.ts
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';

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
  diet?: string // Optional diet label
) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    await setDoc(userDocRef, {
      mealAttendance: initialAttendance,
      diet: diet || null, // Store the diet or null if not provided
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
export const getDailyReportData = async (date: string) => {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    let breakfastPresentCount = 0;
    let lunchPresentCount = 0;
    let dinnerPresentCount = 0;
      let breakfastPackedCount = 0;
      let lunchPackedCount = 0;
      let dinnerPackedCount = 0;

    // Aggregate diet counts
    const dietCounts: { [diet: string]: { breakfast: number; lunch: number; dinner: number } } = {};
    const dietCountsPacked: { [diet: string]: { breakfastPacked: number; lunchPacked: number; dinnerPacked: number } } = {};

    snapshot.forEach((doc) => {
      const userData = doc.data();
      const mealAttendance = userData.mealAttendance || {};
      const dailyAttendance: MealAttendanceState = mealAttendance[date] || { breakfast: null, lunch: null, dinner: null };
      const diet = userData.diet as string | null;

      if (dailyAttendance.breakfast === 'present') breakfastPresentCount++;
      if (dailyAttendance.lunch === 'present') lunchPresentCount++;
      if (dailyAttendance.dinner === 'present') dinnerPresentCount++;

        if (dailyAttendance.breakfast === 'packed') breakfastPackedCount++;
        if (dailyAttendance.lunch === 'packed') lunchPackedCount++;
        if (dailyAttendance.dinner === 'packed') dinnerPackedCount++;

      // Track diet counts
      if (diet) {
        if (!dietCounts[diet]) {
          dietCounts[diet] = { breakfast: 0, lunch: 0, dinner: 0 };
            dietCountsPacked[diet] = { breakfastPacked: 0, lunchPacked: 0, dinnerPacked: 0 };
        }
        if (!dietCounts[diet]) {
            dietCounts[diet] = { breakfast: 0, lunch: 0, dinner: 0 };
        }
        if (!dietCountsPacked[diet]) {
            dietCountsPacked[diet] = { breakfastPacked: 0, lunchPacked: 0, dinnerPacked: 0 };
        }
        if (dailyAttendance.breakfast === 'present') dietCounts[diet].breakfast++;
        if (dailyAttendance.lunch === 'present') dietCounts[diet].lunch++;
        if (dailyAttendance.dinner === 'present') dietCounts[diet].dinner++;

          if (dailyAttendance.breakfast === 'packed') dietCountsPacked[diet].breakfastPacked++;
          if (dailyAttendance.lunch === 'packed') dietCountsPacked[diet].lunchPacked++;
          if (dailyAttendance.dinner === 'packed') dietCountsPacked[diet].dinnerPacked++;
      }
    });

    return {
      attendance: {
        breakfast: breakfastPresentCount,
        lunch: lunchPresentCount,
        dinner: dinnerPresentCount,
          breakfastPacked: breakfastPackedCount,
          lunchPacked: lunchPackedCount,
          dinnerPacked: dinnerPackedCount,
      },
      dietCounts: dietCounts,
        dietCountsPacked: dietCountsPacked,
    };
  } catch (error) {
    console.error('Error getting daily report data:', error);
    throw error;
  }
};
