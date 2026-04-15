import { fireEvent, render, screen } from "@testing-library/react";
import { ProgressiveImage } from "./ProgressiveImage";

describe("ProgressiveImage", () => {
  it("fades in the full image after it loads", () => {
    render(<ProgressiveImage src="/image-full.jpg" alt="Artwork" />);

    const image = screen.getByAltText("Artwork");
    expect(image).toHaveClass("opacity-0");

    fireEvent.load(image);
    expect(image).toHaveClass("opacity-100");
  });

  it("falls back to placeholder when the full image fails", () => {
    render(<ProgressiveImage src="/missing.jpg" alt="Missing artwork" />);

    const image = screen.getByAltText("Missing artwork") as HTMLImageElement;
    fireEvent.error(image);

    expect(image.src).toContain("/placeholder.svg");
  });
});
