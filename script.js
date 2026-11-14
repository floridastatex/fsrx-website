document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Toggle navigation");
    toggle.textContent = isOpen ? "×" : "☰";
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Toggle navigation");
      toggle.textContent = "☰";
    });
  });
  // Atmospheric homepage effects and scroll-triggered reveals.
  const home = document.querySelector(".home-page");
  if (home) {
    const shimmer = document.createElement("div");
    shimmer.className = "water-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    const particles = document.createElement("div");
    particles.className = "water-particles";
    particles.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 26; i += 1) {
      const particle = document.createElement("span");
      particle.style.setProperty("--left", `${(i * 37 + 11) % 100}%`);
      particle.style.setProperty("--duration", `${11 + (i % 8) * 1.7}s`);
      particle.style.setProperty("--delay", `-${(i * 1.9) % 19}s`);
      particle.style.setProperty("--drift", `${(i % 2 ? 1 : -1) * (12 + (i % 5) * 9)}px`);
      particles.appendChild(particle);
    }

    home.prepend(shimmer, particles);

    const revealTargets = home.querySelectorAll(
      ".oak-welcome .oak-section-heading, .oak-welcome .oak-welcome-copy, .oak-pillar, .oak-feature-art, .oak-feature-copy, .oak-join"
    );
    revealTargets.forEach((element, index) => {
      element.classList.add("scroll-reveal");
      if (element.classList.contains("oak-pillar")) {
        element.style.setProperty("--reveal-delay", `${(index % 3) * 110}ms`);
      }
    });

    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -45px 0px" });

      revealTargets.forEach((element) => observer.observe(element));
    } else {
      revealTargets.forEach((element) => element.classList.add("is-visible"));
    }
  }

});