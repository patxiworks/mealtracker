
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ArrowRight } from 'lucide-react'; // Added ArrowRight

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCheckingInstallState, setIsCheckingInstallState] = useState(true);
  const router = useRouter();

  const navigateToApp = useCallback(() => {
    router.replace('/select-centre');
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        // Already in standalone mode, navigate to app
        navigateToApp();
      } else {
        setIsCheckingInstallState(false); // Not standalone, proceed to show install UI
        const handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => {
          window.removeEventListener('beforeinstallprompt', handler);
        };
      }
    }
  }, [navigateToApp]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      // User accepted the install prompt
      // The app will likely reload in standalone mode, or they can navigate manually.
      // To be safe, we can try to navigate after a short delay,
      // though the 'display-mode: standalone' check should handle it.
      setTimeout(navigateToApp, 1000); // Navigate after 1 sec
    } else {
      // User dismissed the install prompt
    }
    setDeferredPrompt(null); // Prompt can only be used once
  };

  const handleContinueToApp = () => {
    navigateToApp();
  };

  if (isCheckingInstallState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-secondary">
        <p className="text-lg text-foreground">Checking app status...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#e0e7fc] to-secondary">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl sm:text-3xl font-bold text-primary-foreground bg-[#4864c3] -m-6 p-6 rounded-t-lg">
            Install MealTicker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-12 text-center">
          <div className="mx-auto h-24 w-27 sm:h-32 sm:w-32">
          <div className="mx-auto w-[115px] sm:w-[150px] px-2 shadow-md rounded-xl bg-[#4864c3] align-center">
          <img
            src="/mealticker.png"
            alt="App Icon"
            data-ai-hint="MealTicker logo"
            className="h-24 w-27 sm:h-32 sm:w-32"
          /></div>
          </div>
          <p className="text-[#4864c3] text-sm sm:text-base font-bold">
            Add MealTicker to your home screen!
          </p>
          {deferredPrompt ? (
            <Button onClick={handleInstallClick} size="lg" className="w-full text-base sm:text-lg py-3">
              <Download className="mr-2 h-5 w-5" /> Install App
            </Button>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted rounded-md">
              If you don't see an install button above, use your browser's "Add to Home Screen" option if available.
              Otherwise, you might have already installed the app or the prompt may not be available right now.
              <br/><br/>
              If you need help, <a href="https://wa.me/08137245046" target="blank">click here to ask for it</a>.
            </p>
          )}
          <Button variant="outline" onClick={handleContinueToApp} className="w-full text-base sm:text-lg py-3">
            Continue in Browser <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
      <p className="mt-8 text-xs text-center text-[#4864c3]">
        Ensuring you have the best meal tracking experience.
      </p>
    </div>
  );
}
