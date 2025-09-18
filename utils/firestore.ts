import { collection, addDoc, updateDoc, doc, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Job, GuestBooking } from '../types';

// Job operations
export const createJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'jobs'), {
    ...jobData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const updateJob = async (jobId: string, updates: Partial<Job>) => {
  await updateDoc(doc(db, 'jobs', jobId), {
    ...updates,
    updatedAt: new Date(),
  });
};

export const getJobsByStatus = async (status: Job['status']) => {
  const q = query(
    collection(db, 'jobs'),
    where('status', '==', status),
    orderBy('scheduledDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
};

// Guest booking operations
export const createGuestBooking = async (bookingData: Omit<GuestBooking, 'id' | 'createdAt' | 'isGuest'>) => {
  const docRef = await addDoc(collection(db, 'guest-bookings'), {
    ...bookingData,
    isGuest: true,
    createdAt: new Date(),
  });
  return docRef.id;
};