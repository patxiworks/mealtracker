
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react'; // Import Loader2
import { Header } from "@/components/header";

const CentreSelectionPage = () => {
  // Update state type to include name
  const [centres, setCentres] = useState<{ id: string; name: string; }[]>([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const router = useRouter();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     if (!window.matchMedia('(display-mode: standalone)').matches && window.location.pathname !== '/install') {
  //       router.replace('/install');
  //     } else {
  //       setInitialCheckComplete(true);
  //     }
  //   } else {
  //     // For SSR or environments without window, assume we proceed
  //     setInitialCheckComplete(true);
  //   }
  // }, [router]);

  useEffect(() => {
    //if (!initialCheckComplete) return; // Don't fetch centres until initial PWA check is done

    const fetchCentres = async () => {
      setLoading(true); // Start loading
      try {
        const centresCollection = collection(db, 'centres');
        const centresSnapshot = await getDocs(centresCollection);
        const centresList = centresSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id, // Use name field, fallback to id
          ...doc.data(),
        }));
        setCentres(centresList as { id: string; name: string; }[]);
      } catch (error) {
        console.error("Error fetching centres:", error);
        // Optionally set an error state here
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchCentres();
  }, [initialCheckComplete]);

  const handleCentreSelect = (centreId: string, centreName: string) => {
    localStorage.setItem('selectedCentre', centreId);
    localStorage.setItem('ctrName', centreName);
    router.push('/sign-in'); // Redirect to the sign-in page
  };

  // if (!initialCheckComplete && (typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches)) {
  //   // Still waiting for the redirect to /install or initial check is pending
  //   return (
  //       <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-secondary">
  //           <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //           <p className="mt-4 text-lg text-foreground">Loading...</p>
  //       </div>
  //   );
  // }


  return (
    <div className="container mx-auto pb-10">
      <Card className="w-full max-w-md mx-auto">
        <Header centre="" title="" menu={false} />
        <CardHeader className="pb-4"> {/* Increased bottom padding */}
          <CardTitle className="text-2xl text-center">Select Your Centre</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : centres.length > 0 ? (
             centres.sort((a, b) => a.name.localeCompare(b.name)).map(centre => ( // Sort centres alphabetically by name
              <Button key={centre.id} onClick={() => handleCentreSelect(centre.id, centre.name)} size="lg"> {/* Use centre name for button label */}
                {centre.name}
              </Button>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No centres found.</p> // Message if no centres
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CentreSelectionPage;
