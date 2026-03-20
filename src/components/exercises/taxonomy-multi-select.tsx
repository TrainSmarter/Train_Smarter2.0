"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, ChevronsUpDown, Plus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createTaxonomyEntry,
  updateTaxonomyEntry,
  deleteTaxonomyEntry,
} from "@/lib/exercises/actions";
import type { TaxonomyEntry, TaxonomyType } from "@/lib/exercises/types";

interface TaxonomyMultiSelectProps {
  /** All available taxonomy entries (global + own) */
  entries: TaxonomyEntry[];
  /** Currently selected IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Taxonomy type for inline create */
  taxonomyType: TaxonomyType;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to allow inline creation of new entries */
  allowCreate?: boolean;
  /** Callback when a new entry is created (to refresh taxonomy) */
  onEntryCreated?: (entry: { name: { de: string; en: string }; type: TaxonomyType }) => void;
}

export function TaxonomyMultiSelect({
  entries,
  selectedIds,
  onSelectionChange,
  taxonomyType,
  placeholder,
  allowCreate = true,
  onEntryCreated,
}: TaxonomyMultiSelectProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newNameDe, setNewNameDe] = React.useState("");
  const [newNameEn, setNewNameEn] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editNameDe, setEditNameDe] = React.useState("");
  const [editNameEn, setEditNameEn] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);

  const selectedEntries = entries.filter((e) => selectedIds.includes(e.id));

  function toggleEntry(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  async function handleCreate() {
    if (!newNameDe.trim() || !newNameEn.trim()) return;

    setIsCreating(true);
    try {
      const result = await createTaxonomyEntry({
        name: { de: newNameDe.trim(), en: newNameEn.trim() },
        type: taxonomyType,
      });

      if (result.success) {
        toast.success(t("taxonomyCreated"));
        setNewNameDe("");
        setNewNameEn("");
        setShowCreate(false);
        onEntryCreated?.({ name: { de: newNameDe.trim(), en: newNameEn.trim() }, type: taxonomyType });
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(entry: TaxonomyEntry) {
    setEditingId(entry.id);
    setEditNameDe(entry.name.de);
    setEditNameEn(entry.name.en);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditNameDe("");
    setEditNameEn("");
  }

  async function handleSaveEdit() {
    if (!editingId || !editNameDe.trim() || !editNameEn.trim()) return;

    setIsSavingEdit(true);
    try {
      const result = await updateTaxonomyEntry({
        id: editingId,
        name: { de: editNameDe.trim(), en: editNameEn.trim() },
      });

      if (result.success) {
        toast.success(t("taxonomyUpdated"));
        cancelEditing();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(entryId: string) {
    setIsDeletingId(entryId);
    try {
      const result = await deleteTaxonomyEntry(entryId);

      if (result.success) {
        toast.success(t("taxonomyDeleted"));
        // Remove from selection if selected
        if (selectedIds.includes(entryId)) {
          onSelectionChange(selectedIds.filter((sid) => sid !== entryId));
        }
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsDeletingId(null);
    }
  }

  // Separate global and own entries
  const globalEntries = entries.filter((e) => e.scope === "global");
  const ownEntries = entries.filter((e) => e.scope === "trainer");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedIds.length > 0
              ? t("selected", { count: selectedIds.length })
              : placeholder ?? t("selectItems")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchTaxonomy")} />
          <CommandList>
            <CommandEmpty>{t("noTaxonomyResults")}</CommandEmpty>

            {/* Global entries */}
            {globalEntries.length > 0 && (
              <CommandGroup heading={t("global")}>
                {globalEntries.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={`${entry.name.de} ${entry.name.en}`}
                    onSelect={() => toggleEntry(entry.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedIds.includes(entry.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{entry.name[locale as "de" | "en"]}</span>
                    <Badge variant="primary" size="sm">{t("platform")}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Own entries */}
            {ownEntries.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("own")}>
                  {ownEntries.map((entry) => (
                    <div key={entry.id}>
                      {editingId === entry.id ? (
                        /* Inline edit form */
                        <div
                          className="px-2 py-1.5 space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            placeholder="DE"
                            value={editNameDe}
                            onChange={(e) => setEditNameDe(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Input
                            placeholder="EN"
                            value={editNameEn}
                            onChange={(e) => setEditNameEn(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-6 flex-1 text-xs"
                              onClick={handleSaveEdit}
                              disabled={!editNameDe.trim() || !editNameEn.trim() || isSavingEdit}
                            >
                              {isSavingEdit ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                tCommon("save")
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={cancelEditing}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <CommandItem
                          value={`${entry.name.de} ${entry.name.en}`}
                          onSelect={() => toggleEntry(entry.id)}
                          className="group"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIds.includes(entry.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{entry.name[locale as "de" | "en"]}</span>
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(entry);
                              }}
                              aria-label={tCommon("edit")}
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry.id);
                              }}
                              disabled={isDeletingId === entry.id}
                              aria-label={tCommon("delete")}
                            >
                              {isDeletingId === entry.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : (
                                <Trash2 className="h-3 w-3 text-destructive" />
                              )}
                            </button>
                          </div>
                          <Badge variant="secondary" size="sm">{t("own")}</Badge>
                        </CommandItem>
                      )}
                    </div>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Inline create */}
          {allowCreate && (
            <>
              <CommandSeparator />
              <div className="p-2">
                {!showCreate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="h-4 w-4" />
                    {t("createNew")}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder={`${t("createNewPlaceholder")} (DE)`}
                      value={newNameDe}
                      onChange={(e) => setNewNameDe(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Input
                      placeholder={`${t("createNewPlaceholder")} (EN)`}
                      value={newNameEn}
                      onChange={(e) => setNewNameEn(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 flex-1"
                        onClick={handleCreate}
                        disabled={!newNameDe.trim() || !newNameEn.trim() || isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          t("createNew")
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => {
                          setShowCreate(false);
                          setNewNameDe("");
                          setNewNameEn("");
                        }}
                      >
                        {tCommon("cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Command>

        {/* Selected tags below the dropdown */}
        {selectedEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t p-2">
            {selectedEntries.map((entry) => (
              <Badge
                key={entry.id}
                variant={entry.scope === "global" ? "primary" : "secondary"}
                size="sm"
                className="cursor-pointer"
                onClick={() => toggleEntry(entry.id)}
              >
                {entry.name[locale as "de" | "en"]}
                <span className="ml-1">&times;</span>
              </Badge>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
