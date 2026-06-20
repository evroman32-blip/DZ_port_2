/**
 * PixelTrail — vanilla JS (Three.js UMD + drei TrailTexture logic).
 */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[PixelTrail] Three.js не загружен.');
    return;
  }

  var CONFIG = {
    gridSize: 50,
    trailSize: 0.12,
    maxAge: 250,
    interpolate: 5,
    intensity: 0.45,
    color: '#c6ff3a',
    gooeyEnabled: true,
  };

  function smoothAverage(current, measurement, smoothing) {
    smoothing = smoothing === undefined ? 0.9 : smoothing;
    return measurement * smoothing + current * (1.0 - smoothing);
  }

  function easeCircleOut(x) {
    return Math.sqrt(1 - Math.pow(x - 1, 2));
  }

  /** Port of @react-three/drei TrailTextureImpl */
  function TrailTextureImpl(options) {
    options = options || {};
    this.size = options.size || 512;
    this.maxAge = options.maxAge || 250;
    this.radius = options.radius || 0.12;
    this.intensity = options.intensity || 0.45;
    this.interpolate = options.interpolate || 5;
    this.smoothing = options.smoothing || 0;
    this.minForce = options.minForce || 0.3;
    this.blend = options.blend || 'screen';
    this.ease = options.ease || easeCircleOut;
    this.trail = [];
    this.force = 0;
    this.initTexture();
  }

  TrailTextureImpl.prototype.initTexture = function () {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('[PixelTrail] Canvas 2D недоступен');

    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.size, this.size);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  };

  TrailTextureImpl.prototype.clear = function () {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.size, this.size);
  };

  TrailTextureImpl.prototype.addTouch = function (point) {
    if (!point) return;
    var last = this.trail[this.trail.length - 1];

    if (last) {
      var dx = last.x - point.x;
      var dy = last.y - point.y;
      var dd = dx * dx + dy * dy;
      var force = Math.max(this.minForce, Math.min(dd * 10000, 1));
      this.force = smoothAverage(this.force, force, this.smoothing);

      if (this.interpolate) {
        var lines = Math.ceil(dd / Math.pow((this.radius * 0.5) / this.interpolate, 2));
        if (lines > 1) {
          for (var i = 1; i < lines; i++) {
            this.trail.push({
              x: last.x - (dx / lines) * i,
              y: last.y - (dy / lines) * i,
              age: 0,
              force: force,
            });
          }
        }
      }
    }

    this.trail.push({ x: point.x, y: point.y, age: 0, force: this.force });
  };

  TrailTextureImpl.prototype.drawTouch = function (point) {
    var pos = {
      x: point.x * this.size,
      y: (1 - point.y) * this.size,
    };

    var intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = this.ease(point.age / (this.maxAge * 0.3));
    } else {
      intensity = this.ease(1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7));
    }
    intensity *= point.force;

    this.ctx.globalCompositeOperation = this.blend;
    var radius = this.size * this.radius * intensity;
    var grd = this.ctx.createRadialGradient(
      pos.x, pos.y, Math.max(0, radius * 0.25),
      pos.x, pos.y, Math.max(0, radius)
    );
    grd.addColorStop(0, 'rgba(255, 255, 255, ' + this.intensity + ')');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.beginPath();
    this.ctx.fillStyle = grd;
    this.ctx.arc(pos.x, pos.y, Math.max(0, radius), 0, Math.PI * 2);
    this.ctx.fill();
  };

  TrailTextureImpl.prototype.update = function (delta) {
    this.clear();
    var self = this;

    this.trail = this.trail.filter(function (point) {
      point.age += delta * 1000;
      return point.age <= self.maxAge;
    });

    if (!this.trail.length) this.force = 0;

    this.trail.forEach(function (point) {
      self.drawTouch(point);
    });

    this.texture.needsUpdate = true;
  };

  var VERT =
    'void main() {\n' +
    '  gl_Position = vec4(position.xy, 0.0, 1.0);\n' +
    '}';

  var FRAG =
    'uniform vec2 resolution;\n' +
    'uniform sampler2D mouseTrail;\n' +
    'uniform float gridSize;\n' +
    'uniform vec3 pixelColor;\n' +
    'void main() {\n' +
    '  vec2 screenUv = gl_FragCoord.xy / resolution;\n' +
    '  vec2 s = resolution.xy / max(resolution.x, resolution.y);\n' +
    '  vec2 uv = clamp((screenUv - 0.5) * s + 0.5, 0.0, 1.0);\n' +
    '  vec2 gridUvCenter = (floor(uv * gridSize) + 0.5) / gridSize;\n' +
    '  float trail = texture2D(mouseTrail, gridUvCenter).r;\n' +
    '  gl_FragColor = vec4(pixelColor, trail);\n' +
    '}';

  function shouldEnable() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (!window.matchMedia('(pointer: fine)').matches) return false;
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  function initPixelTrail(container, options) {
    options = options || CONFIG;

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'pixel-trail__canvas-wrap';
    if (options.gooeyEnabled) canvasWrap.classList.add('pixel-trail__canvas-wrap--gooey');

    var canvas = document.createElement('canvas');
    canvas.className = 'pixel-trail__canvas';
    canvasWrap.appendChild(canvas);
    container.appendChild(canvasWrap);

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);

    var trail = new TrailTextureImpl({
      size: 512,
      maxAge: options.maxAge,
      radius: options.trailSize,
      intensity: options.intensity,
      interpolate: options.interpolate,
    });

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    var material = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector2(1, 1) },
        mouseTrail: { value: trail.texture },
        gridSize: { value: options.gridSize },
        pixelColor: { value: new THREE.Color(options.color) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var clock = new THREE.Clock();

    function resize() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      var buf = renderer.getDrawingBufferSize(new THREE.Vector2());
      material.uniforms.resolution.value.copy(buf);
    }

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(mesh);
      if (hits.length && hits[0].uv) {
        trail.addTouch(hits[0].uv);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    var rafId = 0;
    var lastTime = performance.now();

    function tick(now) {
      rafId = requestAnimationFrame(tick);
      var delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      trail.update(delta);
      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(tick);

    return function destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      material.dispose();
      renderer.dispose();
      trail.texture.dispose();
    };
  }

  function boot() {
    var container = document.getElementById('pixelTrail');
    if (!container) return;
    if (!shouldEnable()) {
      container.style.display = 'none';
      return;
    }
    try {
      initPixelTrail(container, CONFIG);
    } catch (err) {
      console.error('[PixelTrail]', err);
      container.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
