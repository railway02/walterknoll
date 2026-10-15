// Mark the current page in the navigation.
var currentPage = document.body.getAttribute('data-page');
var navigationLinks = document.querySelectorAll('.primary-nav a');

if (currentPage === 'products-chairs') {
  currentPage = 'products';
}
if (currentPage === 'materials-leathers') {
  currentPage = 'materials';
}

for (var i = 0; i < navigationLinks.length; i++) {
  if (navigationLinks[i].getAttribute('data-nav') === currentPage) {
    navigationLinks[i].setAttribute('aria-current', 'page');
  }
}

document.getElementById('backToTop').addEventListener('click', function () {
  window.scrollTo(0, 0);
});
