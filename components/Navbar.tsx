import Link from "next/link";
import Image from "next/image";
import React from "react";
import NavItems from "./NavItems";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link href="/">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <Image src="/images/logo.svg" width={46} height={46} alt="logo" />
        </div>
        <div className="flex items-center gap-8">
          <NavItems />
        </div>
      </Link>
    </nav>
  );
};

export default Navbar;
