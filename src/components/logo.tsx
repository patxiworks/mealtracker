import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HomeIcon } from "lucide-react";

export const Logo = ({ centre, title }: { centre: string | null; title: string | null }) => {
    return (
        <div className="flex flex-row gap-1">
            <CardTitle className="flex gap-1 text-2xl text-[#d3dcfb]">
                {/* <CalendarCheck2 className="inline-block" size={18} /> */}
                <img
                    src="/mealticker-blue.png"
                    alt="App Icon"
                    data-ai-hint="MealTicker logo"
                    //className="mx-auto rounded-xl shadow-md h-15 w-16 sm:h-15 sm:w-16"
                    className="mx-auto h-8 w-8.5"
                /> 
                <span className="text-[18px]">
                    <Link href="/">MealTicker</Link>
                    <span className="font-normal"> {title}</span>
                </span>
            </CardTitle>
            <span className="text-sm text-[#7d8fc8] font-medium pt-2">{centre ? `/ ${centre}` : ''}</span>
        </div>
    )
}