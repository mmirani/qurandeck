"use client";

import { TOPICS } from "@/lib/quran/theme-topics";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";

export function FiltersModal() {
  const { modal, closeModal, filters, setFilters, applyFilters, juzs } = useMushaf();
  if (modal !== "filters") return null;

  const toggleTheme = (id: string) => {
    const themes = filters.themes.includes(id)
      ? filters.themes.filter((item) => item !== id)
      : [...filters.themes, id];
    setFilters({ ...filters, themes });
  };

  return (
    <Modal
      eyebrow="Advanced search"
      title="Filter by theme, juz, and revelation"
      onClose={closeModal}
      wide
    >
      <p className="mb-5 max-w-2xl text-sm leading-6 text-ink-soft">
        Search looks through Quran text. Filters narrow those results. Themes jump to curated study verses — they are not the same as typing a word into search.
      </p>
      <section>
        <h3 className="kufic-label text-gold-deep">Themes</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => {
            const active = filters.themes.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTheme(topic.id)}
                className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition ${
                  active ? "border-gold bg-highlight" : "border-line bg-canvas/40 hover:border-gold"
                }`}
              >
                <p className="font-medium text-ink">{topic.name}</p>
                <p className="text-xs text-muted">{topic.description}</p>
              </button>
            );
          })}
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="kufic-label text-gold-deep">Revelation</span>
          <StyledSelect
            className="mt-2"
            value={filters.revelation}
            onChange={(next) =>
              setFilters({ ...filters, revelation: next as typeof filters.revelation })
            }
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
          className="h-11 cursor-pointer rounded-full bg-gold px-5 text-sm text-on-gold hover:bg-gold-deep"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => setFilters({ themes: [], revelation: "all", juz: "all", queryIn: "all" })}
          className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm text-ink hover:bg-highlight"
        >
          Clear
        </button>
      </div>
    </Modal>
  );
}
