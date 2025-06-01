
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2, HomeIcon } from "lucide-react";
import { Logo } from "./logo";

export const Header = ({ centre, title }: { centre: string | null; title: string | null }) => {
    return (
        <CardHeader className="px-4 py-4 sm:px-4 bg-[#4864c3]">
          <div className="flex justify-between items-center">
            <Logo centre={centre} title={title} />
            <div className="flex gap-4 items-center">
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