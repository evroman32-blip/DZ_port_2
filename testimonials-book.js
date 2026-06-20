/**
 * 3D book testimonials — vanilla JS + St.PageFlip
 */
(function () {
  'use strict';

  var pageFlipInstance = null;

  function renderStars(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      var fill = i <= rating ? '#e53935' : '#cbd5e1';
      html +=
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="' + fill + '" aria-hidden="true">' +
        '<path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />' +
        '</svg>';
    }
    return html;
  }

  var TESTIMONIALS = [
    {
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
      name: 'Марина К.',
      jobtitle: 'Основатель digital-студии',
      text: 'Собрал лендинг быстрее, чем мы успели согласовать бриф внутри команды. Главное — не шаблон: сразу чувствуется характер, ритм и внимание к деталям.',
      rating: 5,
    },
    {
      image: 'https://images.unsplash.com/photo-1507003211169-0a6dd7228f2d?q=80&w=200&auto=format&fit=crop',
      name: 'Алексей Р.',
      jobtitle: 'Эксперт по личному бренду',
      text: 'Нужен был сайт, который продаёт не только услуги, но и ощущение уровня. Получилось сильно, современно и без ощущения «очередного конструктора».',
      rating: 5,
    },
    {
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
      name: 'Diana V.',
      jobtitle: 'Product, AI-стартап',
      text: 'Отлично чувствует баланс между визуалом и логикой. Структура понятная, тексты попали в tone of voice, а первый экран сразу задаёт нужный вайб.',
      rating: 5,
    },
    {
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
      name: 'Игорь П.',
      jobtitle: 'Креативный продюсер',
      text: 'Работали над промо-страницей под запуск. Быстро, аккуратно, с хорошим UX. Страницу реально хочется листать — это редкость.',
      rating: 4,
    },
  ];

  function buildReviewPage(item) {
    return (
      '<div class="book-page testimonials-book__review">' +
      '<div class="book-page__inner">' +
      '<img class="testimonials-book__avatar" src="' + item.image + '" alt="' + item.name + '" loading="lazy" />' +
      '<div class="testimonials-book__name">' + item.name + '</div>' +
      '<div class="testimonials-book__role">' + item.jobtitle + '</div>' +
      '<p class="testimonials-book__text">«' + item.text + '»</p>' +
      '<div class="testimonials-book__stars" aria-label="Оценка ' + item.rating + ' из 5">' + renderStars(item.rating) + '</div>' +
      '</div></div>'
    );
  }

  function buildIndexPage(items) {
    var rows = items
      .map(function (item, index) {
        var pageNum = index + 2;
        return (
          '<li>' +
          '<button type="button" class="cursor-target" data-flip-to="' + pageNum + '">' +
          '<img src="' + item.image + '" alt="" loading="lazy" />' +
          '<span>' + item.name + '</span>' +
          '</button>' +
          '<span class="testimonials-book__toc-num">' + pageNum + '</span>' +
          '</li>'
        );
      })
      .join('');

    return (
      '<div class="book-page testimonials-book__index">' +
      '<div class="book-page__inner">' +
      '<div class="testimonials-book__index-head">Содержание</div>' +
      '<ul class="testimonials-book__toc">' + rows + '</ul>' +
      '</div></div>'
    );
  }

  function buildBookHTML(items) {
    var cover =
      '<div class="book-page testimonials-book__cover" data-density="hard">' +
      '<div class="book-page__inner">' +
      '<span class="testimonials-book__logo">VC●</span>' +
      '<h3>Отзывы<br/>клиентов</h3>' +
      '<div class="testimonials-book__cover-line"></div>' +
      '<p>Листай книгу — почитай, что говорят о работе со мной</p>' +
      '</div></div>';

    var reviews = items.map(buildReviewPage).join('');

    var back =
      '<div class="book-page testimonials-book__back" data-density="hard">' +
      '<div class="book-page__inner">' +
      '<h3>Спасибо!</h3>' +
      '<p>Ценю каждый отзыв и&nbsp;каждый совместный проект</p>' +
      '</div></div>';

    return cover + buildIndexPage(items) + reviews + back;
  }

  function getBookSize() {
    var mobile = window.innerWidth < 640;
    return {
      mobile: mobile,
      width: mobile ? 260 : 300,
      height: mobile ? 390 : 450,
    };
  }

  function bindControls(pageFlip) {
    var prevBtn = document.getElementById('bookPrev');
    var nextBtn = document.getElementById('bookNext');
    var bookEl = document.getElementById('testimonialsBook');

    if (prevBtn) {
      prevBtn.onclick = function () {
        pageFlip.flipPrev('bottom');
      };
    }
    if (nextBtn) {
      nextBtn.onclick = function () {
        pageFlip.flipNext('bottom');
      };
    }

    if (bookEl) {
      bookEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-flip-to]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var target = parseInt(btn.getAttribute('data-flip-to'), 10);
        if (!isNaN(target)) pageFlip.flip(target, 'bottom');
      });
    }
  }

  function initBook() {
    if (pageFlipInstance) return;

    var bookEl = document.getElementById('testimonialsBook');
    if (!bookEl) return;

    if (typeof St === 'undefined' || !St.PageFlip) {
      console.warn('[TestimonialsBook] St.PageFlip не загружен — проверьте подключение page-flip.browser.js');
      return;
    }

    bookEl.innerHTML = buildBookHTML(TESTIMONIALS);
    var pages = bookEl.querySelectorAll('.book-page');
    if (!pages.length) return;

    var size = getBookSize();

    pageFlipInstance = new St.PageFlip(bookEl, {
      width: size.width,
      height: size.height,
      size: 'stretch',
      minWidth: size.width,
      maxWidth: size.width,
      minHeight: size.height,
      maxHeight: size.height,
      showCover: true,
      maxShadowOpacity: 0.45,
      mobileScrollSupport: false,
      drawShadow: true,
      flippingTime: 900,
      usePortrait: size.mobile,
      autoSize: true,
      clickEventForward: true,
      useMouseEvents: true,
      showPageCorners: true,
      disableFlipByClick: false,
      startPage: 0,
    });

    pageFlipInstance.loadFromHTML(pages);
    bindControls(pageFlipInstance);

    bookEl.classList.add('is-ready');
  }

  function boot() {
    var section = document.getElementById('testimonials');
    if (!section) return;

    var runInit = function () {
      if (pageFlipInstance) return;
      initBook();
    };

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              observer.disconnect();
              requestAnimationFrame(function () {
                requestAnimationFrame(runInit);
              });
            }
          });
        },
        { rootMargin: '120px 0px', threshold: 0.05 }
      );
      observer.observe(section);
    } else {
      window.addEventListener('load', runInit);
    }

    window.addEventListener('load', function () {
      var rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight) runInit();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
