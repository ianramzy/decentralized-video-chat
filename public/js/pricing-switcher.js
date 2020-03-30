(function () {
  "use strict";
  const pricingToggle = document.getElementById("pricing-toggle");

  if (pricingToggle) {
    window.addEventListener("load", pricingSwitch);
    pricingToggle.addEventListener("change", pricingSwitch);
  }

  function pricingSwitch() {
    const switchables = document.getElementsByClassName("pricing-switchable");
    if (pricingToggle.checked) {
      for (let i = 0; i < switchables.length; i++) {
        switchables[i].innerHTML = switchables[i].getAttribute(
          "data-pricing-yearly"
        );
      }
    } else {
      for (let i = 0; i < switchables.length; i++) {
        switchables[i].innerHTML = switchables[i].getAttribute(
          "data-pricing-monthly"
        );
      }
    }
  }
})();
