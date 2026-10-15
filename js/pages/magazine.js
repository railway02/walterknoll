// Show or hide the article cards when a topic button is clicked.
var topicButtons = document.querySelectorAll('[data-topic]');
var articleCards = document.querySelectorAll('.article-card');
var articleCount = document.querySelector('#articleCount');

function filterArticles(topic) {
  var count = 0;

  for (var i = 0; i < articleCards.length; i++) {
    var showCard = topic === 'All Topics' || articleCards[i].dataset.category === topic;
    articleCards[i].hidden = !showCard;
    if (showCard) {
      count++;
    }
  }

  for (var i = 0; i < topicButtons.length; i++) {
    topicButtons[i].setAttribute('aria-pressed', topicButtons[i].dataset.topic === topic);
  }

  articleCount.textContent = count + ' articles';
}

for (var i = 0; i < topicButtons.length; i++) {
  topicButtons[i].addEventListener('click', function () {
    filterArticles(this.dataset.topic);
  });
}

// Keep the topic links from other pages useful.
var category = new URLSearchParams(window.location.search).get('category');
if (category === 'News' || category === 'Stories' || category === 'References') {
  filterArticles(category);
}
