import { initModelBuffers } from './model';
import { initShaderProgram } from './shaders/shaders';
import vsSource from './shaders/vertex.vert';
import fsSource from './shaders/fragment.frag';
import { createMatrix, perspectiveMatrix, lookAtMatrix, fromRotation, translateMatrix } from './matrix';

const PLANE_SIZE = 5000;  // radius meters
const Z_FAR = 5000;
const PLANE_DIVISIONS = 250;
const PLAYER_HEIGHT = 10;
const LOOK_AT_DISTANCE = 100;
const SPEED = 100;  // meters per second
const ANGLE_SPEED_X = 0.5;  // radians per second
const ANGLE_SPEED_Y = 0.3;  // radians per second
const VERTEX_SPACING = PLANE_SIZE / PLANE_DIVISIONS;
const FAVICON_UPDATE_INTERVAL = 100;  // draw every X frames

class TrailRunning {
  resizeCanvas(dpi = (window.devicePixelRatio || 1)) {
    this.keys = {};

    const addListener = (listeners, fn) => {
      listeners.forEach(listener => window.addEventListener(listener, fn));
    };

    addListener(['keydown'], e => {
      this.keys[e.code] = true;
    });
    addListener(['keyup'], e => {
      this.keys[e.code] = false;
    });
    const TOUCH_KEY = 'KeyW';
    addListener(['touchstart'], e => {
      this.keys[TOUCH_KEY] = true;
      e.preventDefault();
    });
    this.mousedown = false;
    this.mousepos = [0, 0];
    this.mousedelta = [0, 0];
    const getPos = e => [e.screenX || e.touches[0].screenX, e.screenY || e.touches[0].screenY];
    addListener(['mousedown', 'touchstart'], e => {
      this.mousedown = true;
      this.mousepos = getPos(e);
    });
    addListener(['mousemove', 'touchmove'], e => {
      if (this.mousedown) {
        const pos = getPos(e);
        this.mousedelta = [pos[0] - this.mousepos[0], this.mousepos[1] - pos[1]];
        this.mousepos = pos;
      }
    });
    addListener(['mouseup', 'touchend'], () => {
      this.mousedown = false;
      this.mousedelta = [0, 0];
    });
    // if (e.dragging) {
    //   angleY -= e.deltaX * 0.25;
    //   angleX = Math.max(-90, Math.min(90, angleX - e.deltaY * 0.25));
    // }
    window.addEventListener('touchend', e => {
      this.keys[TOUCH_KEY] = false;
    });

    this.width = this.canvas.clientWidth * dpi;
    this.height = this.canvas.clientHeight * dpi;
    canvas.width = this.width;
    canvas.height = this.height;
    this.gl.viewport(0, 0, this.width, this.height);

    this.angle = [Math.PI / 2, 0];
    this.position = [0, 0];
  }

  constructor() {
    this.canvas = document.getElementById('canvas');
    this.favicon = document.querySelector('link[rel="icon"]');
    this.faviconCounter = FAVICON_UPDATE_INTERVAL;

    this.gl = this.canvas.getContext('webgl');
    if (!this.gl) {
      alert('Unable to initialize WebGL. Your browser or machine may not support it.');
      return;
    }
    this.lastTimestamp = null;

    // Set up shaders
    this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);

    // Set up program info
    this.programInfo = {
      program: this.shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
        rotationMatrixX: this.gl.getUniformLocation(this.shaderProgram, 'uRotationMatrixX'),
        rotationMatrixY: this.gl.getUniformLocation(this.shaderProgram, 'uRotationMatrixY'),
        position: this.gl.getUniformLocation(this.shaderProgram, 'uPosition'),
        vertexSpacing: this.gl.getUniformLocation(this.shaderProgram, 'uVertexSpacing'),
        // gridSize: this.gl.getUniformLocation(this.shaderProgram, 'uGridSize'),
      },
    };

    // Set up buffers
    this.buffers = initModelBuffers(this.gl, PLANE_SIZE, PLANE_DIVISIONS);

    // Set up resize event and call resize to draw
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();

    this.animate();
  }

  animate(ts) {
    const delta = ts == null ? 0 : this.lastTimestamp == null ? 0 : ts - this.lastTimestamp;
    requestAnimationFrame((ts) => this.animate(ts));
    this.drawScene(delta);
    this.lastTimestamp = ts;
  }

  updateFavicon(url) {
    // Do asynchronously
    if (this.favicon != null) {
      setTimeout(() => this.favicon.href = url, 0);
    }
  }

  drawScene(delta = 0) {
    this.gl.clearColor(0.0, 0.0, 0.5, 1.0);  // Clear to black, fully opaque
    this.gl.clearDepth(1.0);                 // Clear everything
    this.gl.enable(this.gl.DEPTH_TEST);           // Enable depth testing
    this.gl.depthFunc(this.gl.LEQUAL);            // Near things obscure far things

    let forwardSpeed = 0;
    if (this.keys['KeyW']) {
      forwardSpeed++;
    }
    if (this.keys['KeyS']) {
      forwardSpeed--;
    }
    let horizontalSpeed = 0;
    if (this.keys['KeyD']) {
      horizontalSpeed++;
    }
    if (this.keys['KeyA']) {
      horizontalSpeed--;
    }

    const d = delta / 1000;
    const speedMultiplier = d * SPEED;
    this.position = [
      this.position[0] + Math.cos(this.angle[0]) * speedMultiplier * forwardSpeed + Math.cos(this.angle[0] + Math.PI / 2) * speedMultiplier * horizontalSpeed,
      this.position[1] + Math.sin(this.angle[0]) * speedMultiplier * forwardSpeed + Math.sin(this.angle[0] + Math.PI / 2) * speedMultiplier * horizontalSpeed,
    ];
    let angleXSpeed = this.mousedelta[0];
    let angleYSpeed = this.mousedelta[1];
    const angleSpeedMultiplierX = d * ANGLE_SPEED_X;
    const angleSpeedMultiplierY = d * ANGLE_SPEED_Y;
    if (this.keys['ArrowLeft']) {
      angleXSpeed--;
    }
    if (this.keys['ArrowRight']) {
      angleXSpeed++;
    }
    if (this.keys['ArrowUp']) {
      angleYSpeed++;
    }
    if (this.keys['ArrowDown']) {
      angleYSpeed--;
    }
    this.angle = [
      this.angle[0] + angleXSpeed * angleSpeedMultiplierX,
      this.angle[1] + angleYSpeed * angleSpeedMultiplierY,
    ];
    const didMove = forwardSpeed || horizontalSpeed || angleXSpeed || angleYSpeed;

    const rotationMatrixX = createMatrix();
    fromRotation(rotationMatrixX, this.angle[0] - Math.PI / 2, [0.0, 1.0, 0.0]);
    const rotationMatrixY = createMatrix();
    fromRotation(rotationMatrixY, this.angle[1], [1.0, 0.0, 0.0]);

    // Clear the canvas before we start drawing on it.

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 45 / 180 * Math.PI;   // in radians
    const aspect = this.width / this.height;
    const zNear = 0.1;
    const zFar = Z_FAR;

    const projectionMatrix = createMatrix();
    perspectiveMatrix(
      projectionMatrix,
      fieldOfView,
      aspect,
      zNear,
      zFar);

    const modelViewMatrix = createMatrix();
    lookAtMatrix(modelViewMatrix, [0.0, PLAYER_HEIGHT, 0.0], [0.0, 0.0, LOOK_AT_DISTANCE], [0.0, 1.0, 0.0]);
    // translateMatrix(modelViewMatrix, modelViewMatrix, [this.position[0], 0, this.position[1]])

    {
      const numComponents = 3;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.vertices);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        numComponents,
        this.gl.FLOAT,
        false,  // normalize
        0,  // stride
        0);  // offset
      this.gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL to use our program when drawing

    this.gl.useProgram(this.programInfo.program);

    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.rotationMatrixX,
      false,
      rotationMatrixX);
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.rotationMatrixY,
      false,
      rotationMatrixY);
    this.gl.uniform2fv(this.programInfo.uniformLocations.position, new Float32Array(this.position));
    this.gl.uniform1f(this.programInfo.uniformLocations.vertexSpacing, VERTEX_SPACING);
    // this.gl.uniform1f(this.programInfo.uniformLocations.gridSize, PLANE_SIZE);

    {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
      this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.buffers.numIndices, this.gl.UNSIGNED_SHORT, 0);
    }

    this.faviconCounter--;
    if (didMove) {
      this.faviconCounter = FAVICON_UPDATE_INTERVAL;
    } else {
      if (this.faviconCounter < 0) {
        this.updateFavicon(this.canvas.toDataURL('image/png'));
        this.faviconCounter = FAVICON_UPDATE_INTERVAL;
      }
    }
  }
}

new TrailRunning();
