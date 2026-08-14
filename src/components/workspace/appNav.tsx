"use client";

import {
  BookOpen,
  Building2,
  ClipboardList,
  Gauge,
  History,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", icon: Gauge, label: "工作台" },
  { href: "/tickets", icon: ClipboardList, label: "工单" },
  { href: "/customers", icon: Building2, label: "客户" },
  { href: "/knowledge", icon: BookOpen, label: "知识库" },
  { href: "/team", icon: Users, label: "团队权限" },
  { href: "/audit", icon: History, label: "审计记录" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className={mobile ? "flex min-w-max gap-1 px-4" : "space-y-1"}
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
