"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';

const CentreSelectionPage = () => {
  const [centres, setCentres] = useState<{ id: string; }[]>([
    {
      id: 'vi',
    }
  ]);
  const router = useRouter();

  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const centresCollection = collection(db, 'centres');
        const centresSnapshot = await getDocs(centresCollection);
        const centresList = centresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCentres(centresList as { id: string; }[]);
      } catch (error) {
        console.error("Error fetching centres:", error);
      }
    };

    fetchCentres();
  }, []);

  const handleCentreSelect = (centreId: string) => {
    localStorage.setItem('selectedCentre', centreId);
    router.push('/sign-in'); // Redirect to the sign-in page
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Select Your Centre</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {centres.map(centre => (
            <Button key={centre.id} onClick={() => handleCentreSelect(centre.id)}>
              {centre.id}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CentreSelectionPage;
/