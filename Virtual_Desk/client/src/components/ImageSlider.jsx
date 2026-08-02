/**
 * ============================================================
 *  IMAGE SLIDER — components/ImageSlider.jsx
 * ============================================================
 *  A simple auto-advancing image carousel shown on the landing page.
 *
 *  WHAT IT DOES:
 *  - Displays a slideshow of 3 images
 *  - Auto-advances every 5 seconds
 *  - Has prev/next arrow buttons
 *  - Has clickable dot indicators
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. useState: tracks the current slide index
 *  2. useEffect + setInterval: auto-advance timer
 *  3. useCallback: memoizes functions so they don't get recreated
 *  4. Modulo arithmetic: `(current + 1) % slides.length` wraps around
 *     to the beginning when reaching the end
 * ============================================================
 */

// React hooks
import { useState, useEffect, useCallback } from "react";

// The slides to display (SVG images from the public folder)
const slides = [
  {
    src: "/images/slide-1.svg",
    alt: "Professional Virtual Reception Desk",
  },
  {
    src: "/images/slide-2.svg",
    alt: "Smart Booking Calendar",
  },
  {
    src: "/images/slide-3.svg",
    alt: "AI-Powered Customer Support",
  },
];

/**
 * ImageSlider — the auto-advancing image carousel.
 */
export default function ImageSlider() {
  // Index of the currently visible slide
  const [current, setCurrent] = useState(0);
  // Prevents rapid clicking during the transition animation
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * goTo — navigates to a specific slide index.
   * Blocks navigation while a transition is in progress.
   */
  const goTo = useCallback((index) => {
    if (isTransitioning) return; // ignore clicks during transition
    setIsTransitioning(true);
    setCurrent(index);
    // Allow navigation again after 500ms (matches CSS transition duration)
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  /**
   * next — go to the next slide (wraps around to 0 at the end).
   */
  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  /**
   * prev — go to the previous slide (wraps around to the last at the start).
   */
  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    // Cleanup: clear the interval when the component unmounts
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="image-slider">
      <div className="slider-viewport">
        {/* Render all slides, only the current one is visible (via CSS) */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`slider-slide ${index === current ? "active" : ""}`}
            aria-hidden={index !== current}
          >
            <img src={slide.src} alt={slide.alt} />
          </div>
        ))}

        {/* Navigation arrows */}
        <button
          className="slider-arrow slider-arrow--left"
          onClick={prev}
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          className="slider-arrow slider-arrow--right"
          onClick={next}
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Dot indicators — click to jump to a slide */}
      <div className="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`slider-dot ${index === current ? "active" : ""}`}
            onClick={() => goTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}