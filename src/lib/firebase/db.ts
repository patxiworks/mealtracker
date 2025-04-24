// src/lib/firebase/db.ts
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Function to create user meal attendance data
export const createUserMealAttendance = async (
  username: string,
  initialAttendance: Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>
) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, username);
    await setDoc(userDocRef, {
      mealAttendance: initialAttendance,
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
      return docSnapshot.data().mealAttendance;
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
  updatedAttendance: Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>
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
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    snapshot.forEach((doc) => {
      const userData = doc.data();
      const mealAttendance = userData.mealAttendance || {};
      const dailyAttendance = mealAttendance[date] || { breakfast: false, lunch: false, dinner: false };

      if (dailyAttendance.breakfast) breakfastCount++;
      if (dailyAttendance.lunch) lunchCount++;
      if (dailyAttendance.dinner) dinnerCount++;
    });

    return {
      breakfast: breakfastCount,
      lunch: lunchCount,
      dinner: dinnerCount,
    };
  } catch (error) {
    console.error('Error getting daily report data:', error);
    throw error;
  }
};

import { collection, getDocs } from 'firebase/firestore';
