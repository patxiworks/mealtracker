"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatRoom } from "@/components/ui/chatbox";
import { Header } from "@/components/ui/header";

export default function Chats() {
    const [centre, setCentre] = useState<string | null>(null);

    useEffect(() => {
        // Access localStorage inside useEffect
        setCentre(localStorage.getItem('selectedCentre'));
    }, []); // Run this effect only once on component mount
    
    return (
        <div className="container mx-auto pb-10">
            <Card className="w-full max-w-4xl mx-auto">
                <div className="fixed w-full max-w-[890px] z-50">
                    <Header centre={centre || ''} /> {/* Pass centre to Header */}
                </div>
                <ChatRoom />
            </Card>
        </div>
    )
}
