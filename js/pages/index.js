// A small manual slideshow. Nothing changes until a button is clicked.
var slides = [
  { image: './assets/images/index/slide-0.jpg', title: 'Ayabi Chair', description: 'Design: Dai Sugasawa.' },
  { image: './assets/images/index/slide-1.jpg', title: 'Amorin Table', description: 'Design: Wolfgang C. R. Mezger.' },
  { image: './assets/images/index/slide-2.jpg', title: 'Molamisa Sofa', description: 'Design: EOOS.' }
];
var slideIndex = 0;

function showSlide() {
  document.getElementById('bannerImage').src = slides[slideIndex].image;
  document.getElementById('bannerImage').alt = slides[slideIndex].title;
  document.getElementById('bannerTitle').textContent = slides[slideIndex].title;
  document.getElementById('bannerDescription').textContent = slides[slideIndex].description;
  document.getElementById('slideNumber').textContent = (slideIndex + 1) + ' / 3';
}

document.getElementById('nextSlide').addEventListener('click', function () {
  slideIndex = slideIndex + 1;
  if (slideIndex === slides.length) {
    slideIndex = 0;
  }
  showSlide();
});

document.getElementById('previousSlide').addEventListener('click', function () {
  slideIndex = slideIndex - 1;
  if (slideIndex < 0) {
    slideIndex = slides.length - 1;
  }
  showSlide();
});

document.getElementById('newsletterForm').addEventListener('submit', function (event) {
  event.preventDefault();
  document.querySelector('#newsletterForm .form-status').textContent = 'Practice complete. No subscription was sent and your email was not saved.';
  document.getElementById('newsletterForm').reset();
});
