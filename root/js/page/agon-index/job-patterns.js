(function (window)
{
  'use strict';

  class AgonIndexJobPatterns
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    setup()
    {
      var carousels = document.querySelectorAll('.pattern-carousel');
      for (var i = 0; i < carousels.length; i++) {
        this._bindCarousel(carousels[i]);
      }
    }

    _bindCarousel(container)
    {
      var track = container.querySelector('.pattern-carousel__track');
      if (!track) {
        return;
      }

      var buttons = container.querySelectorAll('.pattern-carousel__nav');
      if (!buttons.length) {
        return;
      }

      var step = this._calcStep(track);
      var handle = function (direction) {
        var distance = step * direction;
        track.scrollBy({ left: distance, behavior: 'smooth' });
      };

      for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        button.addEventListener('click', function (evt) {
          evt.preventDefault();
          handle(this.getAttribute('data-direction') === 'prev' ? -1 : 1);
        });
      }
    }

    _calcStep(track)
    {
      var firstItem = track.querySelector('.pattern-carousel__item');
      var itemWidth = firstItem ? firstItem.getBoundingClientRect().width : track.clientWidth;
      var style = window.getComputedStyle(track);
      var gap = style && style.gap ? parseFloat(style.gap) : 0;

      if (!isFinite(gap)) {
        gap = 0;
      }

      var distance = itemWidth + gap;
      if (!distance || !isFinite(distance)) {
        distance = track.clientWidth || 0;
      }

      return distance;
    }
  }

  var NS = window.AgonIndex || (window.AgonIndex = {});
  NS.JobPatterns = NS.JobPatterns || AgonIndexJobPatterns;

})(window);
