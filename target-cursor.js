/**
 * TargetCursor — vanilla JS port (GSAP).
 * Adapted for static HTML portfolio.
 */
(function () {
  'use strict';

  var CONFIG = {
    targetSelector: '.cursor-target',
    spinDuration: 2,
    hideDefaultCursor: true,
    hoverDuration: 0.2,
    parallaxOn: true,
    borderWidth: 3,
    cornerSize: 12,
  };

  function getContainingBlock(element) {
    var node = element && element.parentElement;
    while (node && node !== document.documentElement) {
      var style = getComputedStyle(node);
      if (
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        style.filter !== 'none' ||
        style.willChange.includes('transform') ||
        style.willChange.includes('perspective') ||
        style.willChange.includes('filter') ||
        /paint|layout|strict|content/.test(style.contain)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function getContainingBlockOffset(block) {
    if (!block) return { x: 0, y: 0 };
    var rect = block.getBoundingClientRect();
    return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
  }

  function isMobile() {
    var hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var small = window.innerWidth <= 768;
    var ua = navigator.userAgent || navigator.vendor || window.opera || '';
    var mobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    return (hasTouch && small) || mobileUa;
  }

  function shouldEnable() {
    return (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      window.matchMedia('(pointer: fine)').matches &&
      !isMobile() &&
      typeof gsap !== 'undefined'
    );
  }

  function markTargets(selector) {
    document
      .querySelectorAll(
        'a, button, .btn, .nav__links a, .nav__cta, .nav__mark, ' +
          '.footer__link, .footer__socials a, .card, .project, .badge, .forwhom__list li'
      )
      .forEach(function (el) {
        el.classList.add('cursor-target');
      });
  }

  function createCursorDOM() {
    var wrapper = document.createElement('div');
    wrapper.className = 'target-cursor-wrapper';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML =
      '<div class="target-cursor-dot"></div>' +
      '<div class="target-cursor-corner corner-tl"></div>' +
      '<div class="target-cursor-corner corner-tr"></div>' +
      '<div class="target-cursor-corner corner-br"></div>' +
      '<div class="target-cursor-corner corner-bl"></div>';
    document.body.appendChild(wrapper);
    return {
      cursor: wrapper,
      dot: wrapper.querySelector('.target-cursor-dot'),
      corners: wrapper.querySelectorAll('.target-cursor-corner'),
    };
  }

  function initTargetCursor(options) {
    options = Object.assign({}, CONFIG, options || {});
    var dom = createCursorDOM();
    var cursor = dom.cursor;
    var dot = dom.dot;
    var corners = dom.corners;
    var containingBlock = getContainingBlock(cursor);

    var spinTl = null;
    var activeTarget = null;
    var currentLeaveHandler = null;
    var resumeTimeout = null;
    var targetCornerPositions = null;
    var isActive = false;
    var activeStrength = { current: 0 };

    var getOffset = function () {
      return getContainingBlockOffset(containingBlock);
    };

    function moveCursor(x, y) {
      var offset = getOffset();
      gsap.to(cursor, {
        x: x - offset.x,
        y: y - offset.y,
        duration: 0.1,
        ease: 'power3.out',
      });
    }

    function cleanupTarget(target) {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler);
      }
      currentLeaveHandler = null;
    }

    function createSpinTimeline() {
      if (spinTl) spinTl.kill();
      spinTl = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: options.spinDuration, ease: 'none' });
    }

    function tickerFn() {
      if (!targetCornerPositions || !cursor || !corners.length) return;
      var strength = activeStrength.current;
      if (strength === 0) return;

      var cursorX = gsap.getProperty(cursor, 'x');
      var cursorY = gsap.getProperty(cursor, 'y');

      corners.forEach(function (corner, i) {
        var currentX = gsap.getProperty(corner, 'x');
        var currentY = gsap.getProperty(corner, 'y');
        var targetX = targetCornerPositions[i].x - cursorX;
        var targetY = targetCornerPositions[i].y - cursorY;
        var finalX = currentX + (targetX - currentX) * strength;
        var finalY = currentY + (targetY - currentY) * strength;
        var duration = strength >= 0.99 ? (options.parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto',
        });
      });
    }

    var initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y,
    });
    createSpinTimeline();

    if (options.hideDefaultCursor) {
      document.body.classList.add('has-target-cursor');
    }

    function onMouseMove(e) {
      moveCursor(e.clientX, e.clientY);
    }

    function onScroll() {
      if (!activeTarget || !cursor) return;
      var offset = getOffset();
      var mouseX = gsap.getProperty(cursor, 'x') + offset.x;
      var mouseY = gsap.getProperty(cursor, 'y') + offset.y;
      var under = document.elementFromPoint(mouseX, mouseY);
      var stillOver =
        under &&
        (under === activeTarget || under.closest(options.targetSelector) === activeTarget);
      if (!stillOver && currentLeaveHandler) {
        currentLeaveHandler();
      }
    }

    function onMouseDown() {
      gsap.to(dot, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    }

    function onMouseUp() {
      gsap.to(dot, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    }

    function onMouseOver(e) {
      var directTarget = e.target;
      var allTargets = [];
      var current = directTarget;
      while (current && current !== document.body) {
        if (current.matches && current.matches(options.targetSelector)) {
          allTargets.push(current);
        }
        current = current.parentElement;
      }
      var target = allTargets[0] || null;
      if (!target || activeTarget === target) return;

      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      gsap.killTweensOf(corners);
      gsap.killTweensOf(cursor, 'rotation');
      if (spinTl) spinTl.pause();
      gsap.set(cursor, { rotation: 0 });

      var rect = target.getBoundingClientRect();
      var bw = options.borderWidth;
      var cs = options.cornerSize;
      var offset = getOffset();
      var cursorX = gsap.getProperty(cursor, 'x');
      var cursorY = gsap.getProperty(cursor, 'y');

      targetCornerPositions = [
        { x: rect.left - bw - offset.x, y: rect.top - bw - offset.y },
        { x: rect.right + bw - cs - offset.x, y: rect.top - bw - offset.y },
        { x: rect.right + bw - cs - offset.x, y: rect.bottom + bw - cs - offset.y },
        { x: rect.left - bw - offset.x, y: rect.bottom + bw - cs - offset.y },
      ];

      isActive = true;
      gsap.ticker.add(tickerFn);

      gsap.to(activeStrength, {
        current: 1,
        duration: options.hoverDuration,
        ease: 'power2.out',
      });

      corners.forEach(function (corner, i) {
        gsap.to(corner, {
          x: targetCornerPositions[i].x - cursorX,
          y: targetCornerPositions[i].y - cursorY,
          duration: 0.2,
          ease: 'power2.out',
        });
      });

      function leaveHandler() {
        gsap.ticker.remove(tickerFn);
        isActive = false;
        targetCornerPositions = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });
        activeTarget = null;

        gsap.killTweensOf(corners);
        var positions = [
          { x: -cs * 1.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: cs * 0.5 },
          { x: -cs * 1.5, y: cs * 0.5 },
        ];
        var tl = gsap.timeline();
        corners.forEach(function (corner, index) {
          tl.to(
            corner,
            { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' },
            0
          );
        });

        resumeTimeout = setTimeout(function () {
          if (!activeTarget && cursor && spinTl) {
            var currentRotation = gsap.getProperty(cursor, 'rotation');
            var normalizedRotation = currentRotation % 360;
            spinTl.kill();
            spinTl = gsap
              .timeline({ repeat: -1 })
              .to(cursor, { rotation: '+=360', duration: options.spinDuration, ease: 'none' });
            gsap.to(cursor, {
              rotation: normalizedRotation + 360,
              duration: options.spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: function () {
                if (spinTl) spinTl.restart();
              },
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      }

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    }

    function onResize() {
      containingBlock = getContainingBlock(cursor);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);

    return function destroy() {
      gsap.ticker.remove(tickerFn);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (activeTarget) cleanupTarget(activeTarget);
      if (spinTl) spinTl.kill();
      if (resumeTimeout) clearTimeout(resumeTimeout);
      document.body.classList.remove('has-target-cursor');
      cursor.remove();
    };
  }

  function boot() {
    if (!shouldEnable()) return;
    markTargets(CONFIG.targetSelector);
    try {
      initTargetCursor(CONFIG);
    } catch (err) {
      console.error('[TargetCursor]', err);
      document.body.classList.remove('has-target-cursor');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
