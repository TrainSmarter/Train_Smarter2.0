"use client";

import { useTranslations } from "next-intl";
import { SortAsc } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrganisationSortOption } from "@/lib/teams/types";

interface SortDropdownProps {
  value: OrganisationSortOption;
  onChange: (option: OrganisationSortOption) => void;
}

const sortOptions: { value: OrganisationSortOption; labelKey: string }[] = [
  { value: "teams-first", labelKey: "sortTeamsFirst" },
  { value: "athletes-first", labelKey: "sortAthletesFirst" },
  { value: "name-asc", labelKey: "sortNameAsc" },
  { value: "name-desc", labelKey: "sortNameDesc" },
  { value: "status", labelKey: "sortStatus" },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");

  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrganisationSortOption)}>
      <SelectTrigger className="w-full sm:w-[200px]" aria-label={tCommon("sort")}>
        <SortAsc className="mr-2 h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
