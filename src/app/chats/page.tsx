"use client"

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatRoom } from "@/components/chatbox";
import { Header } from "@/components/header";

export default function Chats() {
    const [centre, setCentre] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const centre = localStorage.getItem('selectedCentre');
        if (centre) {
            setCentre(localStorage.getItem('selectedCentre'));
        } else {
            router.push('/select-centre'); // Redirect to centre selection page
        }
    }, []); // Run this effect only once on component mount
    
    return (
        <div className="container mx-auto pb-10">
            <Card className="w-full max-w-4xl mx-auto">
                <div className="fixed w-full max-w-[890px] z-50">
                    <Header centre={centre} title="Messages" /> {/* Pass centre to Header */}
                </div>
                <ChatRoom />
            </Card>
        </div>
    )
}
