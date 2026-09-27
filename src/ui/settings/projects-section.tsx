import { useSettingsStore } from "@/stores/settings";
import { LAUNCH_SCREEN_OPTIONS, LIBRARY_SORT_OPTIONS, LIBRARY_VIEW_OPTIONS } from "@/ui/projects/library-options";
import { SegmentedControl } from "@/ui/segmented-control";
import { SelectSetting, SettingRow } from "@/ui/settings/setting-controls";

// -- Component ----------------------------------------------------------------

const ProjectsSection: React.FC = () => {
  const libraryView = useSettingsStore((state) => state.libraryView);
  const set = useSettingsStore((state) => state.set);

  return (
    <div className="divide-y divide-composer-border">
      <SettingRow
        label="Library view"
        description="How the Projects page shows your songs. The toggle on that page changes this too."
      >
        <SegmentedControl
          aria-label="Library view"
          value={libraryView}
          options={LIBRARY_VIEW_OPTIONS}
          onChange={(view) => set("libraryView", view)}
        />
      </SettingRow>
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
