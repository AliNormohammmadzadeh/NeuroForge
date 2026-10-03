/* Point-cloud cortex. Green is EEG, amber is spikes, blue is connectomes. */

const PALETTE = [
  [0.24, 0.86, 0.59],
  [0.9, 0.63, 0.36],
  [0.49, 0.71, 1],
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function perspective(aspect) {
  const fovy = Math.PI / 4;
  const near = 0.1;
  const far = 20;
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function rotX(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = identity();
  out[5] = c;
  out[6] = s;
  out[9] = -s;
  out[10] = c;
  return out;
}

function rotY(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = identity();
  out[0] = c;
  out[2] = -s;
  out[8] = s;
  out[10] = c;
  return out;
}

function translateZ(distance) {
  const out = identity();
  out[14] = distance;
  return out;
}

function cortexGeometry() {
  const rand = mulberry32(0x5a94);
  const positions = [];
  const colors = [];
  const fields = [];
  let guard = 0;
  while (positions.length / 3 < 1400 && guard < 20000) {
    guard += 1;
    let x = rand() * 2 - 1;
    let y = rand() * 2 - 1;
    let z = rand() * 2 - 1;
    const length = Math.hypot(x, y, z);
    if (length < 0.35 || length > 1) continue;
    x /= length;
    y /= length;
    z /= length;
    if (Math.abs(x) < 0.22) continue;
    const hemi = x < 0 ? -1 : 1;
    const wrinkle = 0.045 * Math.sin(y * 11) * Math.cos(z * 9);
    x = Math.abs(x) * (0.62 + wrinkle) * hemi;
    y *= 0.98 + wrinkle;
    z *= 0.72 + wrinkle * 0.5;
    let field = 2;
    if (y > 0.15) field = 0;
    else if (y < -0.2) field = 1;
    const color = PALETTE[field];
    positions.push(x, y, z);
    colors.push(color[0], color[1], color[2]);
    fields.push(field);
  }
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    fields: new Float32Array(fields),
    count: positions.length / 3,
  };
}

function nearestEdges(geometry) {
  const { positions, colors, fields, count } = geometry;
  const lines = [];
  const lineColors = [];
  const lineFields = [];
  const step = Math.max(1, Math.floor(count / 220));
  for (let i = 0; i < count; i += step) {
    let best = -1;
    let bestDist = 0.2;
    const ax = positions[i * 3];
    const ay = positions[i * 3 + 1];
    const az = positions[i * 3 + 2];
    for (let j = 0; j < count; j += 3) {
      if (j === i) continue;
      const dx = ax - positions[j * 3];
      const dy = ay - positions[j * 3 + 1];
      const dz = az - positions[j * 3 + 2];
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    if (best < 0) continue;
    lines.push(ax, ay, az, positions[best * 3], positions[best * 3 + 1], positions[best * 3 + 2]);
    lineColors.push(
      colors[i * 3],
      colors[i * 3 + 1],
      colors[i * 3 + 2],
      colors[best * 3],
      colors[best * 3 + 1],
      colors[best * 3 + 2],
    );
    lineFields.push(fields[i], fields[best]);
  }
  return {
    positions: new Float32Array(lines),
    colors: new Float32Array(lineColors),
    fields: new Float32Array(lineFields),
    count: lines.length / 3,
  };
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader");
  }
  return shader;
}

function program(gl, vertex, fragment) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "link");
  }
  return prog;
}

const POINT_VS = `
attribute vec3 aPos;
attribute vec3 aColor;
attribute float aField;
uniform mat4 uMvp;
uniform float uActive;
uniform float uSize;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 p = uMvp * vec4(aPos, 1.0);
  gl_Position = p;
  gl_PointSize = uSize / max(p.w, 0.25);
  float keep = (uActive < -0.5 || abs(aField - uActive) < 0.5) ? 1.0 : 0.16;
  vColor = aColor;
  vAlpha = keep;
}`;

const POINT_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  float rim = smoothstep(1.0, 0.15, d);
  gl_FragColor = vec4(vColor, rim * vAlpha);
}`;

const LINE_VS = `
attribute vec3 aPos;
attribute vec3 aColor;
attribute float aField;
uniform mat4 uMvp;
uniform float uActive;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_Position = uMvp * vec4(aPos, 1.0);
  float keep = (uActive < -0.5 || abs(aField - uActive) < 0.5) ? 0.45 : 0.05;
  vColor = aColor;
  vAlpha = keep;
}`;

const LINE_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vColor, vAlpha);
}`;

function upload(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function attrib(gl, location, buffer, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function startCortex(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) return false;
  const points = cortexGeometry();
  const edges = nearestEdges(points);
  const pointProg = program(gl, POINT_VS, POINT_FS);
  const lineProg = program(gl, LINE_VS, LINE_FS);
  const pointBuf = {
    pos: upload(gl, points.positions),
    color: upload(gl, points.colors),
    field: upload(gl, points.fields),
  };
  const lineBuf = {
    pos: upload(gl, edges.positions),
    color: upload(gl, edges.colors),
    field: upload(gl, edges.fields),
  };
  const pointLoc = {
    pos: gl.getAttribLocation(pointProg, "aPos"),
    color: gl.getAttribLocation(pointProg, "aColor"),
    field: gl.getAttribLocation(pointProg, "aField"),
  };
  const lineLoc = {
    pos: gl.getAttribLocation(lineProg, "aPos"),
    color: gl.getAttribLocation(lineProg, "aColor"),
    field: gl.getAttribLocation(lineProg, "aField"),
  };
  let active = -1;
  let yaw = 0.5;
  let pitch = 0.2;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame() {
    resize();
    if (!dragging && !reduced) yaw += 0.003;
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const mvp = multiply(
      perspective(aspect),
      multiply(translateZ(-2.65), multiply(rotX(pitch), rotY(yaw))),
    );
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(lineProg, "uMvp"), false, mvp);
    gl.uniform1f(gl.getUniformLocation(lineProg, "uActive"), active);
    attrib(gl, lineLoc.pos, lineBuf.pos, 3);
    attrib(gl, lineLoc.color, lineBuf.color, 3);
    attrib(gl, lineLoc.field, lineBuf.field, 1);
    gl.drawArrays(gl.LINES, 0, edges.count);

    gl.useProgram(pointProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(pointProg, "uMvp"), false, mvp);
    gl.uniform1f(gl.getUniformLocation(pointProg, "uActive"), active);
    gl.uniform1f(gl.getUniformLocation(pointProg, "uSize"), 18);
    attrib(gl, pointLoc.pos, pointBuf.pos, 3);
    attrib(gl, pointLoc.color, pointBuf.color, 3);
    attrib(gl, pointLoc.field, pointBuf.field, 1);
    gl.drawArrays(gl.POINTS, 0, points.count);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * 0.008;
    pitch += (event.clientY - lastY) * 0.008;
    pitch = Math.max(-1.1, Math.min(1.1, pitch));
    lastX = event.clientX;
    lastY = event.clientY;
  });

  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `${points.count} sites. Drag to orbit. Pick a field to dim the others.`;

  document.querySelectorAll("[data-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const slug = button.getAttribute("data-field");
      const map = { "eeg-bci": 0, spikes: 1, connectomics: 2 };
      active = slug === "all" || !(slug in map) ? -1 : map[slug];
      document.querySelectorAll("[data-field]").forEach((other) => {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      if (slug && slug !== "all") {
        const section = document.getElementById(slug);
        if (section) section.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    });
  });

  requestAnimationFrame(frame);
  return true;
}

function startFilter() {
  const input = document.getElementById("atlas-filter");
  if (!input) return;
  input.addEventListener("input", () => {
    const needle = input.value.trim().toLowerCase();
    document.querySelectorAll("[data-text]").forEach((node) => {
      const hay = node.getAttribute("data-text") || "";
      node.classList.toggle("is-hidden", Boolean(needle) && !hay.includes(needle));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("cortex");
  if (canvas) {
    try {
      if (!startCortex(canvas)) {
        const hud = document.getElementById("hud");
        if (hud) hud.textContent = "WebGL is unavailable. The catalogs below still work.";
      }
    } catch (error) {
      const hud = document.getElementById("hud");
      if (hud) hud.textContent = "The cortex view did not start. The catalogs below still work.";
    }
  }
  startFilter();
});
