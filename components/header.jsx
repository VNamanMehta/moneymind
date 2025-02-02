import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { LayoutDashboard, PenBox } from "lucide-react";
import { checkUser } from "@/lib/checkUser";

const Header = async () => {
  await checkUser();
  return (
    <div className="fixed top-0 bg-white/80 w-full z-50 backdrop-blur-md border-b">
      <nav className="container mx-auto py-4 px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <Image
            src={"/moneymindimg.png"}
            width={200}
            height={40}
            alt="logo"
            className="h-10 w-auto sm:h-12 sm:w-12 object-contain rounded-lg mr-2"
            style={{ minWidth: "48px" }}
          />
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-3">
          {/* When Signed In */}
          <SignedIn>
            <Link
              href={"/dashboard"}
              className="text-gray-600 hover:text-blue-600 flex items-center gap-2"
            >
              <Button variant="outline" className="text-sm md:text-base">
                <LayoutDashboard size={16} className="hidden md:inline" />
                <span>Dashboard</span>
              </Button>
            </Link>

            <Link
              href={"/transaction/create"}
              className="flex items-center gap-2"
            >
              <Button className="text-sm md:text-base">
                <PenBox size={16} className="hidden md:inline" />
                <span>Add Transaction</span>
              </Button>
            </Link>
          </SignedIn>

          {/* When Signed Out */}
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline" className="text-sm md:text-base">
                Login
              </Button>
            </SignInButton>
          </SignedOut>

          {/* User Profile Avatar */}
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 sm:w-10 sm:h-10",
                },
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </div>
  );
};

export default Header;
