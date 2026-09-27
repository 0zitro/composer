import { useProjectIndex } from "@/hooks/useProjectIndex";
import { removeProjectData } from "@/lib/project-repository";
import { render } from "@/test/render";
import { seedStoredProject, songTitled } from "@/test/projects";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const IndexProbe: React.FC = () => {
  const { entries, error } = useProjectIndex();
  if (error) return <p>failed</p>;
  if (!entries) return <p>loading</p>;
  return (
    <ul aria-label="Index">
      {entries.map((entry) => (
        <li key={entry.id}>{entry.title}</li>
      ))}
    </ul>
  );
};

// -- Tests --------------------------------------------------------------------

describe("useProjectIndex", () => {
  it("lists the stored projects", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    const screen = await render(<IndexProbe />);
    await expect.element(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("refreshes when a project is saved while it is mounted", async () => {
    const screen = await render(<IndexProbe />);
    await expect.element(screen.getByRole("list", { name: "Index" })).toBeInTheDocument();
    await seedStoredProject("b", { project: songTitled("Bravo") });
    await expect.element(screen.getByText("Bravo")).toBeInTheDocument();
  });

  it("refreshes when a project is removed", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    const screen = await render(<IndexProbe />);
    await expect.element(screen.getByText("Alpha")).toBeInTheDocument();
    await removeProjectData("a");
    await expect.element(screen.getByText("Alpha")).not.toBeInTheDocument();
  });
});
