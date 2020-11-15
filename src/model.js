export function initModelBuffers(gl, planeSize, planeDivisions) {
  let width = planeDivisions + 1;
  let height = planeDivisions + 1;

  // Draw a plane (adapted from https://stackoverflow.com/a/17006081)

  // Set up vertices for plane
  const vertices = [];
  for (let y = 0; y < height; y++) {
    const base = y * width;
    for (let x = 0; x < width; x++) {
      const index = (base + x) * 3;
      vertices[index] = x / (width - 1) * planeSize - planeSize / 2;
      vertices[index + 1] = 0;
      vertices[index + 2] = y / (height - 1) * planeSize - planeSize / 2;
    }
  }

  // Set up indices for plane
  const indices = [];
  let i = 0;
  height--;
  for (let y = 0; y < height; y++) {
    const base = y * width;

    for (let x = 0; x < width; x++) {
      indices[i++] = base + x;
      indices[i++] = base + width + x;
    }
    // add a degenerate triangle (except in a last row)
    if (y < height - 1) {
      indices[i++] = ((y + 1) * width + (width - 1));
      indices[i++] = ((y + 1) * width);
    }
  }

  // Setup buffers
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array(vertices),
    gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW);

  return {
    vertices: vertexBuffer,
    numVertices: vertices.length,
    indices: indexBuffer,
    numIndices: indices.length
  };
}
