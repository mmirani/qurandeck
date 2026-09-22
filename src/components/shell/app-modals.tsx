"use client";

import { AccountModal } from "@/components/account/account-dashboard";
import { AuthModal } from "@/components/modals/auth-modal";
import { JuzModal } from "@/components/modals/juz-modal";
import { BookmarksModal, HighlightsModal, NotesModal } from "@/components/modals/library-modals";
import { SettingsModal } from "@/components/modals/settings-modal";
import { ThemePicker } from "@/components/modals/theme-picker";
import { FiltersModal } from "@/components/search/filters-modal";

export function AppModals() {
  return (
    <>
      <FiltersModal />
      <ThemePicker />
      <JuzModal />
      <SettingsModal />
      <AccountModal />
      <AuthModal />
      <BookmarksModal />
      <HighlightsModal />
      <NotesModal />
    </>
  );
}
