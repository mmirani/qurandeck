"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";

export function FiltersModal() {
  const { modal, closeModal, filters, setFilters, applyFilters, juzs } = useMushaf();
  if (modal !== "filters") return null;

  return (
    <Modal eyebrow="Advanced search" title="Filter by juz and revelation" onClose={closeModal} wide>
      <p className="mb-5 max-w-2xl text-sm leading-6 text-ink-soft">
        Search looks through Quran text. Filters narrow those results.
      </p>
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="kufic-label text-gold-deep">Revelation</span>
          <StyledSelect
            className="mt-2"
            value={filters.revelation}
            onChange={(next) => setFilters({ ...filters, revelation: next as typeof filters.revelation })}
            options={[
              { value: "all", label: "All places" },
              { value: "makkah", label: "Makkiyyah" },
              { value: "madinah", label: "Madaniyyah" },
            ]}
          />
        </label>
        <label className="block text-sm">
          <span className="kufic-label text-gold-deep">Juz</span>
          <StyledSelect
            className="mt-2"
            value={String(filters.juz)}
            onChange={(next) =>
              setFilters({
                ...filters,
                juz: next === "all" ? "all" : Number(next),
              })
            }
            options={[
              { value: "all", label: "All 30 juz" },
              ...juzs.map((juz) => ({
                value: String(juz.juzNumber),
                label: `Juz ${juz.juzNumber}`,
              })),
            ]}
          />
        </label>
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={applyFilters}
          className="h-11 min-h-11 cursor-pointer rounded-full bg-gold px-5 text-sm text-on-gold hover:bg-gold-deep"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => setFilters({ revelation: "all", juz: "all", queryIn: "all" })}
          className="h-11 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm text-ink hover:bg-highlight"
        >
          Clear
        </button>
      </div>
    </Modal>
  );
}
