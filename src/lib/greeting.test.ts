import { describe, expect, it } from "vitest";
import { greetingForHour } from "./greeting";

describe("greetingForHour", () => {
  it("says good morning before noon", () => {
    expect(greetingForHour(0)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
  });

  it("says good afternoon from noon to 5pm", () => {
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(16)).toBe("Good afternoon");
  });

  it("says good evening from 5pm onward", () => {
    expect(greetingForHour(17)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
  });
});
