import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Some screens lazy-load and render the full 200+ song library, which can
// take longer than the 1s default to appear under coverage instrumentation.
configure({ asyncUtilTimeout: 5000 });
