import { useState, useEffect, useCallback } from "react";

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

export default function ImageSlider() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="image-slider">
      <div className="slider-viewport">
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

      {/* Dots */}
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