(function () {
  "use strict";

  // Swipe detector
  // https://gist.github.com/chrishaensel/e17c9f3838f246d75fe3bd19d6bb92e8#file-swipe-js
  let swipe = {
    touchStartX: 0,
    touchEndX: 0,
    minSwipePixels: 30,
    detectionZone: undefined,
    swipeCallback: function () {},

    init: function (detectionZone, callback) {
      swipe.swipeCallback = callback;
      detectionZone.addEventListener(
        "touchstart",
        function (event) {
          swipe.touchStartX = event.changedTouches[0].screenX;
        },
        false
      );
      detectionZone.addEventListener(
        "touchend",
        function (event) {
          swipe.touchEndX = event.changedTouches[0].screenX;
          swipe.handleSwipeGesture();
        },
        false
      );
    },

    handleSwipeGesture: function () {
      let direction, moved;
      if (swipe.touchEndX <= swipe.touchStartX) {
        moved = swipe.touchStartX - swipe.touchEndX;
        direction = "left";
      }
      if (swipe.touchEndX >= swipe.touchStartX) {
        moved = swipe.touchEndX - swipe.touchStartX;
        direction = "right";
      }
      if (moved > swipe.minSwipePixels && direction !== "undefined") {
        swipe.swipe(direction, moved);
      }
    },

    swipe: function (direction, movedPixels) {
      let ret = {};
      ret.direction = direction;
      ret.movedPixels = movedPixels;
      swipe.swipeCallback(ret);
    },
  };

  const carousels = document.getElementsByClassName("carousel-items");

  // Rotate the carousel forward or backward
  function rotateCarousel(el, dir) {
    if (dir === undefined) {
      dir = "next";
    }
    let currentItem = el.getElementsByClassName("carousel-item is-active")[0];
    let nextItem =
      dir === "next"
        ? currentItem.nextElementSibling
        : currentItem.previousElementSibling;
    let index = currentItem.getAttribute("data-carousel");
    let currentBullet = el.parentNode.getElementsByClassName("carousel-bullet")[
      index
    ];
    let nextBullet =
      dir === "next"
        ? currentBullet.nextElementSibling
        : currentBullet.previousElementSibling;
    currentItem.classList.remove("is-active");
    currentBullet.classList.remove("is-active");
    if (nextItem) {
      nextItem.classList.add("is-active");
      nextBullet.classList.add("is-active");
    } else {
      if (dir === "next") {
        el.firstElementChild.classList.add("is-active");
        el.parentNode
          .getElementsByClassName("carousel-bullets")[0]
          .firstElementChild.classList.add("is-active");
      } else {
        el.lastElementChild.classList.add("is-active");
        el.parentNode
          .getElementsByClassName("carousel-bullets")[0]
          .lastElementChild.classList.add("is-active");
      }
    }
  }

  // Equal heights fix
  function equalHeightCarousel(carousel, items) {
    let taller = 0;
    let height;
    for (let i = 0; i < items.length; i++) {
      items[0].parentNode.style.minHeight = taller + "px";
      items[i].classList.add("is-loading");
      height = items[i].offsetHeight;
      items[i].classList.remove("is-loading");
      if (height > taller) {
        taller = height;
      }
    }
    items[0].parentNode.style.minHeight = taller + "px";
  }

  // Clear autorotate
  function clearAutorotate(autorotate) {
    if (autorotate) {
      clearInterval(autorotate);
    }
  }

  if (carousels.length > 0) {
    for (let i = 0; i < carousels.length; i++) {
      let carousel = carousels[i];
      let items = carousel.getElementsByClassName("carousel-item");
      let activeItem = 0;
      let autorotateTiming = carousel.getAttribute("data-autorotate");
      // Generate bullets container
      const bulletsContainer = document.createElement("div");
      bulletsContainer.className = "carousel-bullets";
      carousel.parentNode.insertBefore(bulletsContainer, carousel.nextSibling);
      for (let i = 0; i < items.length; i++) {
        // Add data attributes
        items[i].setAttribute("data-carousel", i);
        // Determine a new active item, if any
        if (items[i].classList.contains("is-active")) activeItem = i;
        // Generate bullets
        let bullet = document.createElement("button");
        bullet.className = "carousel-bullet";
        bullet.setAttribute("data-bullet", i);
        carousel.parentNode
          .getElementsByClassName("carousel-bullets")[0]
          .appendChild(bullet);
      }
      // Add is-active class to first carousel item and bullet
      items[activeItem].classList.add("is-active");
      let bullets = carousel.parentNode.getElementsByClassName(
        "carousel-bullet"
      );
      bullets[activeItem].classList.add("is-active");
      // Equal height items
      equalHeightCarousel(carousel, items);
      window.addEventListener("resize", function () {
        equalHeightCarousel(carousel, items);
      });
      // Autorotate
      let autorotate = false;
      if (autorotateTiming) {
        autorotate = setInterval(function () {
          rotateCarousel(carousel, "next");
        }, autorotateTiming);
      }
      // Rotate by bullet click
      for (let i = 0; i < bullets.length; i++) {
        let bullet = bullets[i];
        bullet.addEventListener("click", function (e) {
          e.preventDefault();
          // Do nothing if item is active
          if (bullet.classList.contains("is-active")) {
            return;
          }
          // Remove active classes
          for (let i = 0; i < bullets.length; i++) {
            bullets[i].classList.remove("is-active");
          }
          for (let i = 0; i < items.length; i++) {
            items[i].classList.remove("is-active");
          }
          // Add active classes to corresponding items and bullets
          let index = this.getAttribute("data-bullet");
          items[index].classList.add("is-active");
          this.classList.add("is-active");
          // Clear autorotate timing
          clearAutorotate(autorotate);
        });
      }
      // Rotate on swipe
      swipe.init(carousel, function (e) {
        if (e.direction === "left") {
          rotateCarousel(carousel, "next");
        } else if (e.direction === "right") {
          rotateCarousel(carousel, "prev");
        }
        // Clear autorotate timing
        clearAutorotate(autorotate);
      });
    }
  }
})();
