// Filter the six cards already written in the HTML.
var storeSearch = document.querySelector('#storeSearch');
var storeCards = document.querySelectorAll('.store-card');

storeSearch.addEventListener('input', function () {
  var searchText = storeSearch.value.trim().toLowerCase();
  var count = 0;

  for (var i = 0; i < storeCards.length; i++) {
    var found = storeCards[i].textContent.toLowerCase().includes(searchText);
    storeCards[i].hidden = !found;
    if (found) {
      count++;
    }
  }

  document.querySelector('#storeCount').textContent = count + ' showrooms';
  document.querySelector('#storeEmpty').hidden = count > 0;
});

// The browser checks the required fields and email before this event runs.
var contactForm = document.querySelector('#contactForm');
contactForm.addEventListener('submit', function (event) {
  event.preventDefault();
  contactForm.querySelector('.form-status').textContent = 'The form is valid. This is a local exercise, so your message was not sent or saved.';
});
