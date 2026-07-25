import { createRoot } from "react-dom/client";
import { BUILT_IN_GENERATORS } from "../types";
import { ContentPreview } from "./ContentPreview";

export function mountContentPreview(): void {
  const host = document.createElement("div");
  host.id = "notesense-content-preview";
  document.body.append(host);
  const exercises = BUILT_IN_GENERATORS.map((generator) => generator.generate({ seed: "dev-preview" }));
  createRoot(host).render(<ContentPreview exercises={exercises} />);
}
