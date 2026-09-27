import { useSettingsStore } from "@/stores/settings";
import { LAUNCH_SCREEN_OPTIONS, LIBRARY_SORT_OPTIONS, LIBRARY_VIEW_OPTIONS } from "@/ui/projects/library-options";
import { SegmentedControl } from "@/ui/segmented-control";
import { SelectSetting } from "@/ui/settings/setting-controls";

// -- Component ----------------------------------------------------------------

const ProjectsSection: React.FC = () => {
  const libraryView = useSettingsStore((state) => state.libraryView);
  const set = useSettingsStore((state) => state.set);

  return (
    <div className="divide-y divide-composer-border">
      <div className="flex items-center justify-between gap-6 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-composer-text">Library view</span>
          <span className="text-xs text-composer-text-muted">
            How the Projects page shows your songs. The toggle on that page changes this too.
          </span>
        </div>
        <SegmentedControl
          aria-label="Library view"
          value={libraryView}
          options={LIBRARY_VIEW_OPTIONS}
          onChange={(view) => set("libraryView", view)}
        />
      </div>
      <SelectSetting
        label="Default sort"
        description="The order projects appear in when you open Projects."
        settingKey="librarySort"
        options={LIBRARY_SORT_OPTIONS}
      />
      <SelectSetting
        label="On launch"
        description="What Composer shows when you open it."
        settingKey="launchScreen"
        options={LAUNCH_SCREEN_OPTIONS}
      />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectsSection };
