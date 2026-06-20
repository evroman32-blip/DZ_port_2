/**
 * DecryptedText — vanilla JS port for static HTML sites.
 * Sequential character decrypt effect (React/Motion version adapted).
 */
(function () {
  const DEFAULT_CHARS =
    'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

  function parseCharMeta(element) {
    const chars = [];

    function walk(node, classes) {
      if (node.nodeType === Node.TEXT_NODE) {
        for (const char of node.textContent) {
          chars.push({ char, classes: classes.slice() });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const next = classes.slice();
      if (node.classList.contains('hl')) next.push('hl');
      if (node.classList.contains('hl--coral')) next.push('hl--coral');

      node.childNodes.forEach((child) => walk(child, next));
    }

    element.childNodes.forEach((child) => walk(child, []));
    return chars;
  }

  function computeOrder(len, direction) {
    const order = [];
    if (len <= 0) return order;

    if (direction === 'start') {
      for (let i = 0; i < len; i++) order.push(i);
      return order;
    }

    if (direction === 'end') {
      for (let i = len - 1; i >= 0; i--) order.push(i);
      return order;
    }

    const middle = Math.floor(len / 2);
    let offset = 0;
    while (order.length < len) {
      if (offset % 2 === 0) {
        const idx = middle + offset / 2;
        if (idx >= 0 && idx < len) order.push(idx);
      } else {
        const idx = middle - Math.ceil(offset / 2);
        if (idx >= 0 && idx < len) order.push(idx);
      }
      offset++;
    }
    return order.slice(0, len);
  }

  class DecryptedText {
    constructor(element) {
      this.el = element;
      this.meta = parseCharMeta(element);
      this.plainText = this.meta.map((m) => m.char).join('');
      this.speed = Number(element.dataset.decryptSpeed) || 45;
      this.sequential = element.hasAttribute('data-decrypt-sequential');
      this.direction = element.dataset.decryptDirection || 'start';
      this.trigger = element.dataset.decryptTrigger || 'load';
      this.delay = Number(element.dataset.decryptDelay) || 0;
      this.maxIterations = Number(element.dataset.decryptMaxIterations) || 10;
      this.useOriginalOnly = element.hasAttribute('data-decrypt-original-chars');
      this.chars = this.useOriginalOnly
        ? [...new Set(this.plainText.split(''))].filter((c) => c !== ' ')
        : (element.dataset.decryptChars || DEFAULT_CHARS).split('');

      this.revealed = new Set();
      this.isAnimating = false;
      this.hasAnimated = false;
      this.intervalId = null;
      this.order = [];
      this.pointer = 0;

      this.renderHost = document.createElement('span');
      this.renderHost.className = 'decrypt-text';
      this.renderHost.setAttribute('aria-hidden', 'true');

      this.srOnly = document.createElement('span');
      this.srOnly.className = 'decrypt-sr-only';
      this.srOnly.textContent = this.plainText;

      element.textContent = '';
      element.append(this.srOnly, this.renderHost);

      this.shuffle = this.shuffle.bind(this);
      this.render = this.render.bind(this);
      this.triggerDecrypt = this.triggerDecrypt.bind(this);
      this.finish = this.finish.bind(this);

      this.render(new Set(), false);
    }

    shuffle(revealedSet) {
      return this.meta
        .map((item, i) => {
          if (item.char === ' ') return ' ';
          if (revealedSet.has(i)) return item.char;
          return this.chars[Math.floor(Math.random() * this.chars.length)];
        })
        .join('');
    }

    render(revealedSet, done) {
      const scrambled = done ? this.plainText : this.shuffle(revealedSet);
      this.renderHost.innerHTML = '';
      this.meta.forEach((item, i) => {
        const span = document.createElement('span');
        const isRevealed = revealedSet.has(i) || done;
        span.className = isRevealed
          ? 'decrypt-char decrypt-char--revealed'
          : 'decrypt-char decrypt-char--encrypted';
        item.classes.forEach((c) => span.classList.add(c));
        span.textContent = isRevealed ? item.char : scrambled[i];
        this.renderHost.appendChild(span);
      });
      this.srOnly.textContent = done
        ? this.plainText
        : this.meta.map((item, i) => (revealedSet.has(i) ? item.char : '•')).join('');
    }

    finish() {
      clearInterval(this.intervalId);
      this.isAnimating = false;
      this.el.classList.add('is-decrypted');
      this.render(new Set(this.meta.map((_, i) => i)), true);
    }

    triggerDecrypt() {
      if (this.isAnimating || this.hasAnimated) return;
      this.hasAnimated = true;
      this.isAnimating = true;
      this.el.classList.add('is-decrypting');
      this.revealed = new Set();

      if (this.sequential) {
        this.order = computeOrder(this.meta.length, this.direction);
        this.pointer = 0;
        this.render(this.revealed, false);

        this.intervalId = setInterval(() => {
          if (this.pointer < this.order.length) {
            this.revealed.add(this.order[this.pointer++]);
            this.render(this.revealed, false);
          } else {
            this.finish();
          }
        }, this.speed);
        return;
      }

      let iteration = 0;
      this.render(this.revealed, false);

      this.intervalId = setInterval(() => {
        iteration++;
        this.render(this.revealed, false);
        if (iteration >= this.maxIterations) {
          this.finish();
        }
      }, this.speed);
    }

    bindTrigger() {
      if (this.trigger === 'load') {
        const run = () => setTimeout(() => this.triggerDecrypt(), this.delay);
        if (document.readyState === 'complete') run();
        else window.addEventListener('load', run, { once: true });
        return;
      }

      if (this.trigger === 'view') {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setTimeout(() => this.triggerDecrypt(), this.delay);
                io.disconnect();
              }
            });
          },
          { threshold: 0.2 }
        );
        io.observe(this.el);
        return;
      }

      if (this.trigger === 'hover') {
        this.el.addEventListener('mouseenter', () => {
          this.hasAnimated = false;
          this.triggerDecrypt();
        });
      }
    }

    static initAll(selector) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelectorAll(selector).forEach((el) => {
        if (reduced) return;
        const instance = new DecryptedText(el);
        instance.bindTrigger();
      });
    }
  }

  window.DecryptedText = DecryptedText;
  window.addEventListener('DOMContentLoaded', () => {
    DecryptedText.initAll('[data-decrypted-text]');
  });
})();
