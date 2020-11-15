attribute vec4 aVertexPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uRotationMatrixX;
uniform mat4 uRotationMatrixY;
uniform vec2 uPosition;
uniform float uVertexSpacing;
// uniform float uGridSize;

varying vec4 vertexPos;
varying float vNoise;

const int octaves = 5;
const float persistence = 0.5;
const float AMP = 40.0;
const float initialFrequency = 0.002;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec2 noiseOffset = vec2(1.0, 50.0);

float onoise(vec2 v) {
  float total = 0.0;
  float frequency = initialFrequency;
  float amplitude = 1.0;
  float maxValue = 0.0;
  for (int i = 0; i < octaves; i++) {
    total += snoise((v + noiseOffset) * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2.0;
  }
  return ((total / maxValue) + 0.5) * AMP;
}

void main() {
  vertexPos = aVertexPosition;
  vec2 offsetMod = mod(uPosition + 0.5 * uVertexSpacing, uVertexSpacing) - 0.5 * uVertexSpacing;
  vec2 newVPos = vertexPos.xz - offsetMod;
  vNoise = onoise(vertexPos.xz + uPosition - offsetMod);
  float pNoise = onoise(uPosition);
  vec4 vPos = vec4(newVPos.x, vNoise, newVPos.y, aVertexPosition.w);
  vec4 finalPos = vec4(vPos.x, vPos.y - pNoise, vPos.z, vPos.w);
  gl_Position = uProjectionMatrix * uModelViewMatrix * uRotationMatrixY * uRotationMatrixX * finalPos;
}
