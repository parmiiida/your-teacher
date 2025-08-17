"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NavItems = () => {
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Companions", href: "/companions" },
    { label: "My Journey", href: "/my-journey" },
  ];

  const pathName = usePathname();

  return (
    <nav className="gap-4 flex items-center">
      {navItems.map(({ label, href }) => (
        <Link
          href={href}
          key={label}
          className={cn(pathName === href && "text-primary font-bold")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
};

export default NavItems;
