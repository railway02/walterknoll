const leatherSwatches = document.querySelectorAll('[data-swatch]');

for (let i = 0; i < leatherSwatches.length; i++) {
  leatherSwatches[i].addEventListener('click', function () {
    const colorName = this.getAttribute('data-swatch');
    const colorImage = this.querySelector('img');
    const previewImage = document.querySelector('#leatherPreview');

    previewImage.src = colorImage.src;
    previewImage.alt = 'Elen leather: ' + colorName;
    document.querySelector('#leatherTitle').textContent = 'Elen: ' + colorName;
    document.querySelector('#selectedColor').textContent = colorName;
    document.querySelector('#colorCaption').textContent = 'Elen: ' + colorName;

    for (let j = 0; j < leatherSwatches.length; j++) {
      leatherSwatches[j].setAttribute('aria-pressed', 'false');
    }

    this.setAttribute('aria-pressed', 'true');
  });
}
