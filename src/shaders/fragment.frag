precision mediump float;

varying float vNoise;

void main() {
  float noiseVal = vNoise;
  gl_FragColor = vec4(noiseVal, noiseVal / 40.0, 1.0, 1.0);
}
