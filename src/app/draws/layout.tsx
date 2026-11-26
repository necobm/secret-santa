import Link from "next/link";
import { Suspense } from "react";
import { currentOrganizer } from "@/accounts/session";
import { GiftIcon } from "@/ui/icons";
import { signOut } from "../sign-in/actions";

export default function OrganizerLayout({ children }: LayoutProps<"/draws">) {
  return (
    <>
      <header className="bg-accent text-white">
        <div className="mx-auto flex min-h-17 max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4">
          <Link href="/draws" className="flex items-center gap-2.5 text-[22px] font-black">
            <GiftIcon size={26} />
            Amigo Invisible
          </Link>
          {/* The session is read in here, so it does not block the rest of the page. */}
          <Suspense fallback={null}>
            <Account />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}

async function Account() {
  const org = await currentOrganizer();
  if (!org) return null;
  return (
    <form action={signOut} className="flex items-center gap-4 text-[15px] font-bold">
      <span className="max-w-[50vw] truncate">{org.email}</span>
      <button type="submit" className="cursor-pointer font-black underline-offset-4 hover:underline">
        Salir
      </button>
    </form>
  );
}
