const reveals = [...document.querySelectorAll(".reveal")];

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 },
  );

  reveals.forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${Math.min(index * 80, 320)}ms`);
    observer.observe(element);
  });
} else {
  reveals.forEach((element) => element.classList.add("revealed"));
}
