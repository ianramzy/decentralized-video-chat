;(function () {
  'use strict'
  document.documentElement.classList.remove('no-js')
  document.documentElement.classList.add('js')

  window.addEventListener('load', function () {
    document.body.classList.add('is-loaded')
  })
}())
