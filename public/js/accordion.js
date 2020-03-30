(function () {
  "use strict";
  const accordionEl = document.getElementsByClassName("accordion-header");

  function openAccordion(parent, panel) {
    parent.classList.add("is-active");
    panel.style.maxHeight = panel.scrollHeight + "px";
  }

  function closeAccordion(parent, panel) {
    parent.classList.remove("is-active");
    panel.style.maxHeight = null;
  }

  if (accordionEl.length > 0) {
    for (let i = 0; i < accordionEl.length; i++) {
      const el = accordionEl[i];
      const parent = el.parentNode;
      const panel = el.nextElementSibling;
      parent.classList.contains("is-active") && openAccordion(parent, panel);
      el.addEventListener("click", function () {
        parent.classList.contains("is-active")
          ? closeAccordion(parent, panel)
          : openAccordion(parent, panel);
      });
    }
  }
})();
