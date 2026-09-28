import { useStorageProtection } from "@/hooks/useStorageProtection";
import { render } from "@/test/render";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

let latest: ReturnType<typeof useStorageProtection>;

const ProtectionProbe: React.FC = () => {
  latest = useStorageProtection();
  return <Toaster />;
};

async function browserStatus(): Promise<string> {
  return (await navigator.storage.persisted()) ? "protected" : "unprotected";
}

// -- Tests --------------------------------------------------------------------

describe("useStorageProtection", () => {
  it("reports the browser's protection status", async () => {
    await render(<ProtectionProbe />);
    await expect.poll(() => latest?.status).toBe(await browserStatus());
  });

  it("asking again leaves the status matching the browser's answer", async () => {
    await render(<ProtectionProbe />);
    await expect.poll(() => latest?.status).toBeDefined();
    await latest.protect();
    await expect.poll(() => latest?.status).toBe(await browserStatus());
  });

  describe("edge cases", () => {
    it("tells the user when the browser declines", async () => {
      const screen = await render(<ProtectionProbe />);
      await expect.poll(() => latest?.status).toBeDefined();
      await latest.protect();
      if ((await browserStatus()) === "unprotected") {
        await expect.element(screen.getByText("Your browser didn't allow it this time.")).toBeInTheDocument();
      }
    });
  });
});
