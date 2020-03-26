;(function () {
  'use strict'
  const navToggle = document.getElementById('header-nav-toggle')
  const mainNav = document.getElementById('header-nav')

  if (navToggle) {
    // Open menu
    navToggle.addEventListener('click', function () {
      document.body.classList.toggle('off-nav-is-active')
      mainNav.classList.toggle('is-active')
      if (mainNav.style.maxHeight) {
        mainNav.style.maxHeight = null
      } else {
        mainNav.style.maxHeight = mainNav.scrollHeight + 'px'
      }
      this.getAttribute('aria-expanded') === 'true' ? this.setAttribute('aria-expanded', 'false') : this.setAttribute('aria-expanded', 'true')
    })
    // Close menu
    document.addEventListener('click', function (e) {
      if (e.target !== mainNav && e.target !== navToggle && !mainNav.contains(e.target)) {
        document.body.classList.remove('off-nav-is-active')
        mainNav.classList.remove('is-active')
        mainNav.style.maxHeight = null
        navToggle.setAttribute('aria-expanded', 'false')
      }
    })
  }
}())
