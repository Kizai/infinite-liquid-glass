"use client";

import { useEffect, useRef, useState } from "react";

const PROJECTS = [
  ["ILG–01", "URBAN SYSTEMS", "Infinite City", "A city, endlessly becoming."],
  ["ILG–02", "LIVING STRUCTURES", "Glass House", "Transparency as a way of living."],
  ["ILG–03", "ACOUSTIC SPACE", "Echo Chamber", "Rooms that remember every note."],
  ["ILG–04", "ORGANIC FUTURES", "Forest Portal", "A threshold into another rhythm."],
  ["ILG–05", "SPATIAL IDENTITY", "Elsewhere", "A place just beyond the familiar."],
  ["ILG–06", "CULTURAL PLATFORM", "Common Sky", "One horizon, many points of view."],
];

const VERTEX_SHADER = [
  "#version 300 es",
  "in vec2 a_position;",
  "out vec2 v_uv;",
  "void main() {",
  "  v_uv = a_position * 0.5 + 0.5;",
  "  gl_Position = vec4(a_position, 0.0, 1.0);",
  "}",
].join("\n");

const FRAGMENT_SHADER = [
  "#version 300 es",
  "precision highp float;",
  "uniform vec2 u_resolution;",
  "uniform vec2 u_pan;",
  "uniform vec2 u_tilt;",
  "uniform vec2 u_pointer;",
  "uniform vec2 u_velocity;",
  "uniform float u_time;",
  "uniform float u_dragging;",
  "uniform sampler2D u_atlas;",
  "in vec2 v_uv;",
  "out vec4 outColor;",
  "",
  "float hash21(vec2 p) {",
  "  p = fract(p * vec2(123.34, 456.21));",
  "  p += dot(p, p + 45.32);",
  "  return fract(p.x * p.y);",
  "}",
  "",
  "float positiveMod(float x, float y) {",
  "  return mod(mod(x, y) + y, y);",
  "}",
  "",
  "float sdRoundBox(vec2 p, vec2 b, float r) {",
  "  vec2 q = abs(p) - b + r;",
  "  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;",
  "}",
  "",
  "vec3 atlasSample(float index, vec2 uv, vec2 offset) {",
  "  float safeIndex = positiveMod(index, 6.0);",
  "  float column = positiveMod(safeIndex, 3.0);",
  "  float row = floor(safeIndex / 3.0);",
  "  vec2 sampleUv = clamp(uv + offset, vec2(0.008), vec2(0.992));",
  "  vec2 atlasUv = (vec2(column, row) + vec2(sampleUv.x, 1.0 - sampleUv.y)) / vec2(3.0, 2.0);",
  "  return texture(u_atlas, atlasUv).rgb;",
  "}",
  "",
  "void main() {",
  "  vec2 resolution = max(u_resolution, vec2(1.0));",
  "  float shortSide = min(resolution.x, resolution.y);",
  "  vec2 screen = (gl_FragCoord.xy - resolution * 0.5) / shortSide;",
  "",
  "  float perspective = max(0.58, 1.0 + screen.y * u_tilt.y * 0.72 - screen.x * u_tilt.x * 0.62);",
  "  vec2 world = screen / perspective * 1.34;",
  "  world += vec2(screen.y * u_tilt.x, screen.x * u_tilt.y) * 0.22;",
  "  world += u_pan;",
  "  float spin = clamp(u_velocity.x * 0.010, -0.035, 0.035);",
  "  world = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * world;",
  "",
  "  vec2 spacing = vec2(1.13, 0.68);",
  "  float rowId = floor(world.y / spacing.y + 0.5);",
  "  float stagger = positiveMod(rowId, 2.0) * spacing.x * 0.5;",
  "  float columnId = floor((world.x - stagger) / spacing.x + 0.5);",
  "  vec2 cellId = vec2(columnId, rowId);",
  "  vec2 center = vec2(columnId * spacing.x + stagger, rowId * spacing.y);",
  "  vec2 local = world - center;",
  "",
  "  float random = hash21(cellId + 17.3);",
  "  vec2 halfSize = vec2(mix(0.505, 0.540, random), mix(0.285, 0.315, hash21(cellId + 63.1)));",
  "  float radius = mix(0.095, 0.135, hash21(cellId + 4.7));",
  "  float distanceField = sdRoundBox(local, halfSize, radius);",
  "  float antialias = max(fwidth(distanceField) * 1.5, 0.0015);",
  "  float mask = 1.0 - smoothstep(-antialias, antialias, distanceField);",
  "",
  "  vec3 color = vec3(0.011, 0.014, 0.018);",
  "  float ambient = exp(-length(screen - (u_pointer - 0.5) * vec2(0.45, 0.32)) * 1.9);",
  "  color += vec3(0.008, 0.014, 0.020) * ambient;",
  "",
  "  float dragEnergy = clamp(length(u_velocity) * 0.085 + u_dragging * 0.18, 0.0, 1.0);",
  "  vec2 depthShift = vec2(-u_tilt.x, u_tilt.y) * 0.055 + normalize(u_velocity + vec2(0.0001)) * dragEnergy * 0.018;",
  "  float backDistance = sdRoundBox(local + depthShift, halfSize + vec2(0.012), radius + 0.014);",
  "  float backMask = 1.0 - smoothstep(-antialias * 2.0, antialias * 2.0, backDistance);",
  "  vec3 sideColor = mix(vec3(0.04, 0.25, 0.32), vec3(0.34, 0.035, 0.19), smoothstep(-0.2, 0.2, depthShift.x));",
  "  color = mix(color, sideColor * (0.24 + dragEnergy * 0.2), backMask * (1.0 - mask) * 0.9);",
  "",
  "  if (mask > 0.0) {",
  "    vec2 uv = local / (halfSize * 2.0) + 0.5;",
  "    float e = 0.0024;",
  "    float dx = sdRoundBox(local + vec2(e, 0.0), halfSize, radius) - sdRoundBox(local - vec2(e, 0.0), halfSize, radius);",
  "    float dy = sdRoundBox(local + vec2(0.0, e), halfSize, radius) - sdRoundBox(local - vec2(0.0, e), halfSize, radius);",
  "    vec2 normal = normalize(vec2(dx, dy) + vec2(0.00001));",
  "    float edge = 1.0 - smoothstep(0.0, 0.19, -distanceField);",
  "    float flow = sin(uv.y * 17.0 + uv.x * 9.0 + u_time * 0.72 + random * 9.0) * 0.5 + 0.5;",
  "    vec2 wave = vec2(sin(uv.y * 21.0 + u_time + random), cos(uv.x * 18.0 - u_time * 0.8)) * 0.0028;",
  "    vec2 refractOffset = normal * (0.010 + edge * (0.050 + dragEnergy * 0.026));",
  "    refractOffset += wave * (1.0 + dragEnergy * 2.2);",
  "    refractOffset += u_velocity * 0.00120 * edge;",
  "",
  "    float index = positiveMod(columnId + rowId * 2.0, 6.0);",
  "    float dispersion = 0.004 + edge * 0.008 + dragEnergy * 0.003;",
  "    vec3 base;",
  "    base.r = atlasSample(index, uv, refractOffset + normal * dispersion).r;",
  "    base.g = atlasSample(index, uv, refractOffset).g;",
  "    base.b = atlasSample(index, uv, refractOffset - normal * dispersion).b;",
  "",
  "    vec2 lightDirection = normalize((u_pointer - 0.5) * 2.0 - screen + vec2(0.001));",
  "    float facing = pow(max(dot(normal, lightDirection), 0.0), 5.0);",
  "    float opposite = pow(max(dot(-normal, lightDirection), 0.0), 7.0);",
  "    float innerShadow = smoothstep(0.0, 0.10, -distanceField);",
  "    vec3 glass = base * mix(0.70, 0.98, innerShadow);",
  "    glass += vec3(0.48, 0.84, 1.0) * facing * edge * (0.34 + dragEnergy * 0.25);",
  "    glass += vec3(1.0, 0.30, 0.58) * opposite * edge * 0.22;",
  "    glass += vec3(1.0) * pow(edge, 3.4) * (0.10 + flow * 0.08);",
  "    glass += vec3(0.18, 0.40, 0.48) * edge * 0.10;",
  "    color = mix(color, glass, mask);",
  "  }",
  "",
  "  float shadowDistance = sdRoundBox(local - vec2(0.0, 0.035), halfSize + vec2(0.030), radius + 0.030);",
  "  float shadow = (1.0 - smoothstep(0.0, 0.075, shadowDistance)) * (1.0 - mask);",
  "  color *= 1.0 - shadow * 0.42;",
  "",
  "  float vignette = 1.0 - smoothstep(0.25, 0.98, length(screen * vec2(0.72, 0.94)));",
  "  color *= mix(0.57, 1.0, vignette);",
  "  float grain = hash21(gl_FragCoord.xy + fract(u_time) * 137.0) - 0.5;",
  "  color += grain * 0.018;",
  "  color = pow(max(color, 0.0), vec3(0.94));",
  "  outColor = vec4(color, 1.0);",
  "}",
].join("\n");

function StudioMark() {
  return (
    <span className="studio-mark" aria-label="Shader">
      <span className="studio-mark__bars" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <span>SHADER</span>
    </span>
  );
}

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function buildAtlas(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  PROJECTS.forEach((project, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = column * 512;
    const y = row * 512;
    const gradient = context.createLinearGradient(0, y + 205, 0, y + 512);
    gradient.addColorStop(0, "rgba(2,4,8,0)");
    gradient.addColorStop(0.52, "rgba(2,4,8,0.22)");
    gradient.addColorStop(1, "rgba(2,4,8,0.84)");
    context.fillStyle = gradient;
    context.fillRect(x, y, 512, 512);

    context.textBaseline = "top";
    context.fillStyle = "rgba(255,255,255,0.75)";
    context.font = "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(project[0], x + 36, y + 32);
    context.textAlign = "right";
    context.fillText(project[1], x + 476, y + 32);
    context.textAlign = "left";

    context.fillStyle = "#ffffff";
    context.font = "600 55px Arial, Helvetica, sans-serif";
    context.fillText(project[2], x + 34, y + 378);
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "400 15px Arial, Helvetica, sans-serif";
    context.fillText(project[3], x + 37, y + 451);
  });
  return canvas;
}

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const main = mainRef.current;
    const canvas = canvasRef.current;
    if (!main || !canvas) return;

    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    const boot = async () => {
      try {
        if (progressRef.current) progressRef.current.style.transform = "scaleX(.18)";
        const gl = canvas.getContext("webgl2", {
          alpha: false,
          antialias: false,
          desynchronized: true,
          depth: false,
          powerPreference: "high-performance",
        });
        if (!gl) throw new Error("This experience needs WebGL 2.");

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        const program = gl.createProgram();
        if (!program) throw new Error("Unable to create the WebGL program.");
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(program) || "Unable to link the WebGL program.");
        }
        if (progressRef.current) progressRef.current.style.transform = "scaleX(.48)";

        const positions = gl.createBuffer();
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, positions);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        );
        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const image = new Image();
        image.decoding = "async";
        image.src = "/liquid-glass-mural.webp";
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Unable to load the visual atlas."));
        });
        if (disposed) return;
        if (progressRef.current) progressRef.current.style.transform = "scaleX(.78)";

        const atlas = buildAtlas(image);
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          atlas,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.useProgram(program);
        gl.uniform1i(gl.getUniformLocation(program, "u_atlas"), 0);

        const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        const panLocation = gl.getUniformLocation(program, "u_pan");
        const tiltLocation = gl.getUniformLocation(program, "u_tilt");
        const pointerLocation = gl.getUniformLocation(program, "u_pointer");
        const velocityLocation = gl.getUniformLocation(program, "u_velocity");
        const timeLocation = gl.getUniformLocation(program, "u_time");
        const draggingLocation = gl.getUniformLocation(program, "u_dragging");

        const pan = { x: 0.08, y: 0.02 };
        const targetPan = { x: 0.08, y: 0.02 };
        const springVelocity = { x: 0, y: 0 };
        const throwVelocity = { x: 0, y: 0 };
        const visualVelocity = { x: 0, y: 0 };
        const tilt = { x: 0, y: 0 };
        const pointer = { x: 0.5, y: 0.5 };
        const pointerTarget = { x: 0.5, y: 0.5 };
        const cursor = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
        const cursorTarget = { x: cursor.x, y: cursor.y };
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          window.matchMedia("(pointer: coarse)").matches ? 1 : 1.25,
        );
        let dragging = false;
        let pointerId = -1;
        let lastX = 0;
        let lastY = 0;
        let lastMoveTime = performance.now();
        let lastFrameTime = performance.now();

        const setPointerTarget = (x: number, y: number) => {
          cursorTarget.x = x;
          cursorTarget.y = y;
          pointerTarget.x = x / Math.max(window.innerWidth, 1);
          pointerTarget.y = 1 - y / Math.max(window.innerHeight, 1);
        };

        const resize = () => {
          const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
          const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
          }
        };

        const onPointerDown = (event: PointerEvent) => {
          if (event.button !== 0) return;
          if ((event.target as Element | null)?.closest("a")) return;
          dragging = true;
          pointerId = event.pointerId;
          lastX = event.clientX;
          lastY = event.clientY;
          lastMoveTime = event.timeStamp || performance.now();
          targetPan.x = pan.x;
          targetPan.y = pan.y;
          throwVelocity.x = 0;
          throwVelocity.y = 0;
          springVelocity.x *= 0.28;
          springVelocity.y *= 0.28;
          main.classList.add("is-dragging");
          main.setPointerCapture(event.pointerId);
          setPointerTarget(event.clientX, event.clientY);
        };

        const onPointerMove = (event: PointerEvent) => {
          setPointerTarget(event.clientX, event.clientY);
          if (!dragging || event.pointerId !== pointerId) return;
          event.preventDefault();
          const coalesced = event.getCoalescedEvents();
          const samples = coalesced.length > 0 ? coalesced : [event];
          const scale = 1.34 / Math.max(Math.min(window.innerWidth, window.innerHeight), 1);

          for (const sample of samples) {
            const sampleTime = sample.timeStamp || performance.now();
            const elapsed = Math.max(4, Math.min(40, sampleTime - lastMoveTime));
            const dx = sample.clientX - lastX;
            const dy = sample.clientY - lastY;
            if (dx === 0 && dy === 0) continue;
            const worldDx = -dx * scale;
            const worldDy = dy * scale;
            targetPan.x += worldDx;
            targetPan.y += worldDy;
            const sampleVelocityX = (worldDx / elapsed) * 1000;
            const sampleVelocityY = (worldDy / elapsed) * 1000;
            const velocityBlend = 1 - Math.exp(-elapsed / 34);
            throwVelocity.x += (sampleVelocityX - throwVelocity.x) * velocityBlend;
            throwVelocity.y += (sampleVelocityY - throwVelocity.y) * velocityBlend;
            const speed = Math.hypot(throwVelocity.x, throwVelocity.y);
            if (speed > 4.5) {
              throwVelocity.x = (throwVelocity.x / speed) * 4.5;
              throwVelocity.y = (throwVelocity.y / speed) * 4.5;
            }
            lastX = sample.clientX;
            lastY = sample.clientY;
            lastMoveTime = sampleTime;
          }
        };

        const releasePointer = (event: PointerEvent) => {
          if (event.pointerId !== pointerId) return;
          const idleTime = Math.max(0, performance.now() - lastMoveTime);
          const releaseWeight = Math.exp(-idleTime / 55);
          throwVelocity.x *= releaseWeight;
          throwVelocity.y *= releaseWeight;
          dragging = false;
          pointerId = -1;
          main.classList.remove("is-dragging");
          if (main.hasPointerCapture(event.pointerId)) {
            main.releasePointerCapture(event.pointerId);
          }
        };

        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          const unit = event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? window.innerHeight
              : 1;
          const dx = event.deltaX * unit * 0.00112;
          const dy = -event.deltaY * unit * 0.00112;
          targetPan.x += dx;
          targetPan.y += dy;
          throwVelocity.x += dx * 9;
          throwVelocity.y += dy * 9;
        };

        const onKeyDown = (event: KeyboardEvent) => {
          const speed = event.shiftKey ? 0.58 : 0.32;
          if (event.key === "ArrowLeft") throwVelocity.x -= speed;
          else if (event.key === "ArrowRight") throwVelocity.x += speed;
          else if (event.key === "ArrowUp") throwVelocity.y += speed;
          else if (event.key === "ArrowDown") throwVelocity.y -= speed;
          else return;
          event.preventDefault();
        };

        window.addEventListener("resize", resize);
        main.addEventListener("pointerdown", onPointerDown);
        main.addEventListener("pointermove", onPointerMove);
        main.addEventListener("pointerup", releasePointer);
        main.addEventListener("pointercancel", releasePointer);
        main.addEventListener("wheel", onWheel, { passive: false });
        main.addEventListener("keydown", onKeyDown);
        resize();
        setPointerTarget(window.innerWidth * 0.5, window.innerHeight * 0.5);

        const render = (now: number) => {
          const delta = Math.min(0.04, Math.max(0.001, (now - lastFrameTime) / 1000));
          lastFrameTime = now;

          let remaining = delta;
          while (remaining > 0) {
            const step = Math.min(remaining, 1 / 120);
            remaining -= step;
            if (!dragging) {
              targetPan.x += throwVelocity.x * step;
              targetPan.y += throwVelocity.y * step;
              const throwFriction = Math.exp(-2.75 * step);
              throwVelocity.x *= throwFriction;
              throwVelocity.y *= throwFriction;
            }

            const springStrength = dragging ? 520 : 390;
            const springDrag = dragging ? 39 : 33;
            springVelocity.x += (targetPan.x - pan.x) * springStrength * step;
            springVelocity.y += (targetPan.y - pan.y) * springStrength * step;
            const springDamping = Math.exp(-springDrag * step);
            springVelocity.x *= springDamping;
            springVelocity.y *= springDamping;
            pan.x += springVelocity.x * step;
            pan.y += springVelocity.y * step;

            const velocityEase = 1 - Math.exp(-18 * step);
            visualVelocity.x += (springVelocity.x - visualVelocity.x) * velocityEase;
            visualVelocity.y += (springVelocity.y - visualVelocity.y) * velocityEase;
            const targetTiltX = Math.max(-0.19, Math.min(0.19, -visualVelocity.x * 0.050));
            const targetTiltY = Math.max(-0.16, Math.min(0.16, visualVelocity.y * 0.046));
            const tiltEase = 1 - Math.exp(-(dragging ? 14 : 8) * step);
            tilt.x += (targetTiltX - tilt.x) * tiltEase;
            tilt.y += (targetTiltY - tilt.y) * tiltEase;
          }

          const pointerEase = 1 - Math.exp(-13 * delta);
          pointer.x += (pointerTarget.x - pointer.x) * pointerEase;
          pointer.y += (pointerTarget.y - pointer.y) * pointerEase;
          const cursorEase = 1 - Math.exp(-30 * delta);
          cursor.x += (cursorTarget.x - cursor.x) * cursorEase;
          cursor.y += (cursorTarget.y - cursor.y) * cursorEase;
          main.style.setProperty("--cursor-x", cursor.x.toFixed(2) + "px");
          main.style.setProperty("--cursor-y", cursor.y.toFixed(2) + "px");

          if (Math.abs(pan.x) > 1000) {
            const offset = Math.trunc(pan.x / 6.78) * 6.78;
            pan.x -= offset;
            targetPan.x -= offset;
          }
          if (Math.abs(pan.y) > 1000) {
            const offset = Math.trunc(pan.y / 4.08) * 4.08;
            pan.y -= offset;
            targetPan.y -= offset;
          }

          gl.useProgram(program);
          gl.bindVertexArray(vao);
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
          gl.uniform2f(panLocation, pan.x, pan.y);
          gl.uniform2f(tiltLocation, tilt.x, tilt.y);
          gl.uniform2f(pointerLocation, pointer.x, pointer.y);
          gl.uniform2f(velocityLocation, visualVelocity.x, visualVelocity.y);
          gl.uniform1f(timeLocation, now * 0.001);
          gl.uniform1f(draggingLocation, dragging ? 1 : 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          frame = requestAnimationFrame(render);
        };
        frame = requestAnimationFrame(render);
        if (progressRef.current) progressRef.current.style.transform = "scaleX(1)";
        window.setTimeout(() => {
          if (!disposed) setReady(true);
        }, 230);

        cleanup = () => {
          cancelAnimationFrame(frame);
          window.removeEventListener("resize", resize);
          main.removeEventListener("pointerdown", onPointerDown);
          main.removeEventListener("pointermove", onPointerMove);
          main.removeEventListener("pointerup", releasePointer);
          main.removeEventListener("pointercancel", releasePointer);
          main.removeEventListener("wheel", onWheel);
          main.removeEventListener("keydown", onKeyDown);
          gl.deleteTexture(texture);
          gl.deleteBuffer(positions);
          gl.deleteVertexArray(vao);
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to initialize WebGL.";
        setError(message);
        setReady(true);
      }
    };

    void boot();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <main
      ref={mainRef}
      className={"experience" + (ready ? " is-ready" : "")}
      tabIndex={0}
      aria-label="Infinite liquid glass gallery. Hold and drag in any direction to explore."
    >
      <canvas
        ref={canvasRef}
        className="webgl-canvas"
        aria-hidden="true"
        onContextMenu={(event) => event.preventDefault()}
      />

      <div className="cursor-lens" aria-hidden="true">
        <span>DRAG</span>
      </div>

      {error ? (
        <div className="webgl-error">
          <p>WEBGL UNAVAILABLE</p>
          <small>{error}</small>
        </div>
      ) : null}

      <footer className="site-footer">
        <div className="credit">
          <span>AN EXPERIMENT BY</span>
          <StudioMark />
        </div>
        <p className="drag-hint">
          <span />
          HOLD + DRAG · MOVE IN ANY DIRECTION
        </p>
        <a href="https://shader.se/contact/" target="_blank" rel="noreferrer">
          BOOK A CALL <span aria-hidden="true">↗</span>
        </a>
      </footer>

      <div className="loader" aria-hidden="true">
        <div className="loader__mark"><StudioMark /></div>
        <p>LIQUID SPACE</p>
        <div className="loader__track"><span ref={progressRef} /></div>
      </div>
    </main>
  );
}
