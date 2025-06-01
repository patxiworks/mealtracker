import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HomeIcon } from "lucide-react";

export const Logo = ({ centre, title }: { centre: string | null; title: string | null }) => {
    return (
        <div className="flex flex-row gap-1">
            <CardTitle className="flex gap-1 text-2xl text-[#d3dcfb]">
                <CalendarCheck2 className="inline-block" size={18} />
                <span className="text-[18px] leading-none">MealTrack <span className="font-normal">{title}</span></span>
            </CardTitle>
            <span className="text-sm text-[#7d8fc8] font-medium">/ {centre}</span>
        </div>
    )
}