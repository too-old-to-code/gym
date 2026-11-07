// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DisplayView } from "../../src/components/Display";

afterEach(cleanup);
const sel = (workoutId: string) => ({ userId: "u", categoryId: "c", workoutId });

describe("DisplayView", () => {
  test("null selection shows idle", () => {
    render(<DisplayView selection={null} />);
    expect(screen.getByText("Gym")).toBeTruthy();
  });
  test("registered workout renders", () => {
    render(<DisplayView selection={sel("crossfit-1")} />);
    expect(screen.getByText("CrossFit 1")).toBeTruthy();
  });
  test("unknown workout id falls back to idle without throwing", () => {
    render(<DisplayView selection={sel("does-not-exist")} />);
    expect(screen.getByText("Gym")).toBeTruthy();
  });
});
