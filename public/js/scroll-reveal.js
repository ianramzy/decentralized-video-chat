(function () {
  "use strict";
  const revealEl = document.querySelectorAll("[class*=reveal-]");
  let viewportHeight = window.innerHeight;

  function throttle(delay, fn) {
    var lastCall = 0;
    return function () {
      var now = new Date().getTime();
      if (now - lastCall < delay) {
        return;
      }
      lastCall = now;
      return fn.apply(void 0, arguments);
    };
  }

  function elementIsVisible(el, offset) {
    return el.getBoundingClientRect().top <= viewportHeight - offset;
  }

  function revealElements() {
    for (let i = 0; i < revealEl.length; i++) {
      let el = revealEl[i];
      let revealDelay = el.getAttribute("data-reveal-delay");
      let revealOffset = el.getAttribute("data-reveal-offset")
        ? el.getAttribute("data-reveal-offset")
        : "200";
      let listenedEl = el.getAttribute("data-reveal-container")
        ? el.closest(el.getAttribute("data-reveal-container"))
        : el;
      if (
        elementIsVisible(listenedEl, revealOffset) &&
        !el.classList.contains("is-revealed")
      ) {
        if (revealDelay && revealDelay !== 0) {
          setTimeout(function () {
            el.classList.add("is-revealed");
          }, revealDelay);
        } else {
          el.classList.add("is-revealed");
        }
      }
    }
    revealDone();
  }

  function revealScroll() {
    throttle(30, revealElements());
  }

  function revealResize() {
    viewportHeight = window.innerHeight;
    throttle(30, revealElements());
  }

  function revealDone() {
    if (
      revealEl.length >
      document.querySelectorAll("[class*=reveal-].is-revealed").length
    )
      return;
    window.removeEventListener("load", revealElements);
    window.removeEventListener("scroll", revealScroll);
    window.removeEventListener("resize", revealResize);
  }

  if (
    revealEl.length > 0 &&
    document.body.classList.contains("has-animations")
  ) {
    window.addEventListener("load", revealElements);
    window.addEventListener("scroll", revealScroll);
    window.addEventListener("resize", revealResize);
  }
})();
