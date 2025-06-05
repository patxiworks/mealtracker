
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { Logo } from "./logo";
import { Menu, Table, NotepadText, MessageCircleMore, Settings, LogOut, } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Header = ({ centre, title }: { centre: string | null; title: string | null }) => {
    const router = useRouter();

    const handleSignOut = () => {
        localStorage.clear();
        router.push('/select-centre'); // Redirect to centre selection page
      };
    
    return (
        <CardHeader className="px-4 py-4 sm:px-4 bg-[#4864c3]">
          <div className="flex justify-between items-center">
            <Logo centre={centre} title={title} />
            <div className="flex gap-4 items-center">
                <Link href="/">
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="px-2 h-8">
                            <Menu size={10} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Link href="/">
                            <DropdownMenuItem><Table size={10} /> Mealsheet</DropdownMenuItem>
                        </Link>
                        <Link href="/reports">
                            <DropdownMenuItem><NotepadText size={10} /> Reports</DropdownMenuItem>
                        </Link>
                        <Link href="/chats">
                            <DropdownMenuItem><MessageCircleMore size={10} /> Messages</DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem><Settings size={10} /> Settings</DropdownMenuItem>
                        </Link>
                        <Link href="#" onClick={handleSignOut}>
                            <DropdownMenuItem><LogOut size={10} /> Sign out</DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </CardHeader>
    )
}