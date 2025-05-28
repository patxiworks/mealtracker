
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HomeIcon } from "lucide-react";

export const Header = ({ centre }: { centre: string | null }) => {
    return (
        <CardHeader className="px-4 py-4 sm:px-4 bg-[#4864c3]">
          <div className="flex justify-between items-center">
            <CardTitle className="flex gap-1 text-2xl text-[#c6cfec]">
                <CalendarCheck2 className="inline-block" size={30} />
                <span className="">MealTrack Report</span>
            </CardTitle>
            <div className="flex gap-4 items-center">
                <span className="text-sm text-[#c6cfec] font-medium">Centre: {centre || 'N/A'}</span>
                <Link href="/">
                    <Button variant="secondary" className="px-2 h-8">
                        <HomeIcon size={10} />
                    </Button>
                </Link>
            </div>
          </div>
        </CardHeader>
    )
}